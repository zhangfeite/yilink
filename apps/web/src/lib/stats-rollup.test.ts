import { beforeEach, describe, expect, it } from 'vitest';

import { db } from './db';
import { addUtcDays, startOfUtcDay } from './stats';

interface RollupModule {
  rollupDaily: (client: typeof db, now?: Date) => Promise<unknown>;
}

async function loadRollupModule(): Promise<RollupModule> {
  const moduleUrl = new URL('../../scripts/rollup-daily.mjs', import.meta.url).href;
  return (await import(moduleUrl)) as RollupModule;
}

async function clearDatabase() {
  await db.clickEvent.deleteMany();
  await db.dailyStat.deleteMany();
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

describe('daily stats rollup', () => {
  beforeEach(clearDatabase);

  it('upserts yesterday exactly once and prunes only raw events older than 30 days', async () => {
    const now = new Date('2026-08-05T12:00:00.000Z');
    const today = startOfUtcDay(now);
    const yesterday = addUtcDays(today, -1);
    const retentionBoundary = addUtcDays(today, -30);
    const expiredDay = addUtcDays(today, -31);
    const user = await db.user.create({ data: { id: 'rollup-user', email: 'rollup@example.com' } });
    const page = await db.page.create({
      data: { userId: user.id, slug: 'rollup-page', title: '汇总主页', status: 'PUBLISHED' },
    });

    await db.clickEvent.createMany({
      data: [
        {
          pageId: page.id,
          kind: 'VIEW',
          tsBucket: yesterday,
          uaClass: 'browser',
          refClass: 'direct',
          ipHash: 'visitor-a',
        },
        {
          pageId: page.id,
          kind: 'VIEW',
          tsBucket: yesterday,
          uaClass: 'wechat',
          refClass: 'wechat',
          ipHash: 'visitor-a',
        },
        {
          pageId: page.id,
          blockId: 'link-a',
          kind: 'CLICK',
          tsBucket: yesterday,
          uaClass: 'wechat',
          refClass: 'wechat',
          ipHash: 'visitor-a',
        },
        {
          pageId: page.id,
          blockId: 'social-a',
          kind: 'CLICK',
          tsBucket: yesterday,
          uaClass: 'browser',
          refClass: 'search',
          ipHash: 'visitor-b',
        },
        {
          pageId: page.id,
          kind: 'VIEW',
          tsBucket: retentionBoundary,
          uaClass: 'browser',
          refClass: 'other',
          ipHash: 'retained-visitor',
        },
        {
          pageId: page.id,
          kind: 'VIEW',
          tsBucket: expiredDay,
          uaClass: 'browser',
          refClass: 'other',
          ipHash: 'old-visitor',
        },
      ],
    });

    const { rollupDaily } = await loadRollupModule();
    await rollupDaily(db, now);

    await expect(
      db.dailyStat.findUnique({ where: { pageId_date: { pageId: page.id, date: yesterday } } }),
    ).resolves.toMatchObject({
      pageId: page.id,
      date: yesterday,
      views: 2,
      uniques: 2,
      clicks: 2,
      byBlock: { 'link-a': 1, 'social-a': 1 },
      byRef: { direct: 1, wechat: 2, search: 1 },
    });
    await expect(
      db.clickEvent.count({ where: { tsBucket: { lt: retentionBoundary } } }),
    ).resolves.toBe(0);
    await expect(db.clickEvent.count({ where: { tsBucket: retentionBoundary } })).resolves.toBe(1);

    await rollupDaily(db, now);

    await expect(db.dailyStat.count({ where: { pageId: page.id, date: yesterday } })).resolves.toBe(
      1,
    );
    await expect(
      db.dailyStat.findUnique({ where: { pageId_date: { pageId: page.id, date: yesterday } } }),
    ).resolves.toMatchObject({ views: 2, uniques: 2, clicks: 2 });
  });
});
