import { Prisma } from '@prisma/client';

import { db } from './db';

export const channelPattern = /^[a-z0-9-]{1,24}$/;

export function normalizeChannel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const channel = value.trim().toLowerCase();
  return channelPattern.test(channel) ? channel : null;
}

async function firstChannel(userId: string): Promise<string | null> {
  const registered = await db.activationEvent.findUnique({
    where: { userId_kind: { userId, kind: 'REGISTERED' } },
    select: { channel: true },
  });
  return registered?.channel ?? null;
}

export async function recordActivation(
  userId: string,
  kind: 'REGISTERED' | 'PAGE_CREATED' | 'PAGE_PUBLISHED' | 'PAGE_SHARED',
  pageId?: string,
  channel?: string | null,
): Promise<void> {
  const existing = await db.activationEvent.findUnique({
    where: { userId_kind: { userId, kind } },
    select: { id: true },
  });
  if (existing) return;

  try {
    await db.activationEvent.create({
      data: { userId, kind, pageId, channel: kind === 'REGISTERED' ? channel ?? null : await firstChannel(userId) },
    });
  } catch (error) {
    // 并发请求可能同时越过首次查询，唯一约束是 D1 下的最终兜底。
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
  }
}

export function recordRegistered(userId: string, channel: string | null): Promise<void> {
  return recordActivation(userId, 'REGISTERED', undefined, channel);
}

export function recordPageCreated(userId: string, pageId: string): Promise<void> {
  return recordActivation(userId, 'PAGE_CREATED', pageId);
}

export function recordPagePublished(userId: string, pageId: string): Promise<void> {
  return recordActivation(userId, 'PAGE_PUBLISHED', pageId);
}

// 分享动作在客户端完成，后续 UI 工作区接入复制链接、二维码和海报操作。
export function recordShared(userId: string, pageId: string): Promise<void> {
  return recordActivation(userId, 'PAGE_SHARED', pageId);
}

export interface ActivationChannelSummary {
  channel: string | null;
  registered: number;
  pageCreated: number;
  pagePublished: number;
  medianRegistrationToPublishMinutes: number | null;
}

export async function activationSummary(now = new Date()) {
  const [events, recentRegistrations] = await db.$transaction([
    db.activationEvent.findMany({ orderBy: { createdAt: 'asc' } }),
    db.activationEvent.findMany({
      where: { kind: 'REGISTERED', createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true },
    }),
  ]);
  const registrations = new Map(events.filter((event) => event.kind === 'REGISTERED').map((event) => [event.userId, event]));
  const groups = new Map<string, { channel: string | null; registered: number; pageCreated: number; pagePublished: number; durations: number[] }>();
  for (const event of events) {
    const channel = registrations.get(event.userId)?.channel ?? null;
    const key = channel ?? '__none__';
    const group = groups.get(key) ?? { channel, registered: 0, pageCreated: 0, pagePublished: 0, durations: [] };
    if (event.kind === 'REGISTERED') group.registered += 1;
    if (event.kind === 'PAGE_CREATED') group.pageCreated += 1;
    if (event.kind === 'PAGE_PUBLISHED') {
      group.pagePublished += 1;
      const registered = registrations.get(event.userId);
      if (registered) group.durations.push((event.createdAt.getTime() - registered.createdAt.getTime()) / 60000);
    }
    groups.set(key, group);
  }
  const channels: ActivationChannelSummary[] = [...groups.values()].map((group) => {
    const durations = group.durations.sort((a, b) => a - b);
    const middle = Math.floor(durations.length / 2);
    const median = durations.length ? (durations.length % 2 ? durations[middle] : (durations[middle - 1] + durations[middle]) / 2) : null;
    return {
      channel: group.channel,
      registered: group.registered,
      pageCreated: group.pageCreated,
      pagePublished: group.pagePublished,
      medianRegistrationToPublishMinutes: median,
    };
  }).sort((a, b) => (a.channel ?? '').localeCompare(b.channel ?? ''));
  const dailyRegistrations = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (6 - offset));
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + 1);
    return { date: date.toISOString().slice(0, 10), count: recentRegistrations.filter((event) => event.createdAt >= date && event.createdAt < next).length };
  });
  return { channels, dailyRegistrations };
}
