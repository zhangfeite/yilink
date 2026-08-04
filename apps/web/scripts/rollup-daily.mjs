// Self-hosted cron (run in UTC after midnight): 5 0 * * * cd /path/to/yilink/apps/web && pnpm stats:rollup
import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value, days) {
  const result = startOfUtcDay(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function countValues(events, key) {
  const counts = {};
  for (const event of events) {
    const value = event[key];
    if (!value) continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function aggregateEvents(events) {
  return {
    views: events.filter((event) => event.kind === 'VIEW').length,
    uniques: new Set(events.map((event) => event.ipHash).filter(Boolean)).size,
    clicks: events.filter((event) => event.kind === 'CLICK').length,
    byBlock: countValues(events.filter((event) => event.kind === 'CLICK'), 'blockId'),
    byRef: countValues(events, 'refClass'),
  };
}

export async function rollupDaily(client, now = new Date()) {
  const today = startOfUtcDay(now);
  const yesterday = addUtcDays(today, -1);
  const retentionStart = addUtcDays(today, -90);
  const events = await client.clickEvent.findMany({
    where: { tsBucket: { gte: yesterday, lt: today } },
    select: { pageId: true, blockId: true, kind: true, refClass: true, ipHash: true },
  });
  const eventsByPage = new Map();

  for (const event of events) {
    const pageEvents = eventsByPage.get(event.pageId) ?? [];
    pageEvents.push(event);
    eventsByPage.set(event.pageId, pageEvents);
  }

  for (const [pageId, pageEvents] of eventsByPage) {
    const aggregate = aggregateEvents(pageEvents);
    await client.dailyStat.upsert({
      where: { pageId_date: { pageId, date: yesterday } },
      create: { pageId, date: yesterday, ...aggregate },
      update: aggregate,
    });
  }

  const deleted = await client.clickEvent.deleteMany({
    where: { tsBucket: { lt: retentionStart } },
  });

  return { rolledUpPages: eventsByPage.size, deletedEvents: deleted.count };
}

async function main() {
  const client = new PrismaClient();
  try {
    const result = await rollupDaily(client);
    console.log(`Rolled up ${result.rolledUpPages} page(s); pruned ${result.deletedEvents} raw event(s).`);
  } finally {
    await client.$disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
