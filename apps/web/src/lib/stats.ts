import { createHash, randomInt } from 'node:crypto';

import { z } from 'zod';

import { db } from './db';

export type RefClass =
  | 'wechat'
  | 'weibo'
  | 'zhihu'
  | 'bilibili'
  | 'search'
  | 'direct'
  | 'other';

export interface DailyStatsPoint {
  date: Date;
  views: number;
  uniques: number;
  clicks: number;
}

export interface PageStatsReport {
  views: number;
  uniques: number;
  clicks: number;
  daily: DailyStatsPoint[];
}

export const eventPayloadSchema = z
  .object({
    pageId: z.string().trim().min(1).max(191),
    blockId: z.string().trim().min(1).max(191).optional(),
    kind: z.enum(['VIEW', 'CLICK']),
  })
  .strict();

const RATE_LIMIT_PER_MINUTE = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

interface RateLimitBucket {
  count: number;
  startedAt: number;
}

const eventRateLimitBuckets = new Map<string, RateLimitBucket>();
const clickEventInstanceOffset = BigInt(randomInt(1_000_000));
let lastClickEventId = 0n;

function isHostOrSubdomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function isSearchHost(host: string): boolean {
  return (
    /^([a-z0-9-]+\.)*google\.[a-z.]+$/i.test(host) ||
    isHostOrSubdomain(host, 'bing.com') ||
    isHostOrSubdomain(host, 'baidu.com') ||
    isHostOrSubdomain(host, 'sogou.com') ||
    isHostOrSubdomain(host, 'so.com') ||
    isHostOrSubdomain(host, 'sm.cn') ||
    isHostOrSubdomain(host, 'duckduckgo.com') ||
    isHostOrSubdomain(host, 'yahoo.com') ||
    isHostOrSubdomain(host, 'yandex.com')
  );
}

export function classifyReferrer(referrer: string | null | undefined): RefClass {
  if (!referrer?.trim()) return 'direct';

  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (isHostOrSubdomain(host, 'weixin.qq.com') || isHostOrSubdomain(host, 'wechat.com')) {
      return 'wechat';
    }
    if (isHostOrSubdomain(host, 'weibo.com') || isHostOrSubdomain(host, 'weibo.cn')) {
      return 'weibo';
    }
    if (isHostOrSubdomain(host, 'zhihu.com')) return 'zhihu';
    if (isHostOrSubdomain(host, 'bilibili.com') || isHostOrSubdomain(host, 'b23.tv')) {
      return 'bilibili';
    }
    if (isSearchHost(host)) return 'search';
  } catch {
    return 'other';
  }

  return 'other';
}

export function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function startOfUtcHour(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), value.getUTCHours()),
  );
}

export function addUtcDays(value: Date, days: number): Date {
  const result = startOfUtcDay(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function clientIp(headers: Headers): string {
  const forwarded = headers
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  const ip = forwarded || headers.get('x-real-ip')?.trim() || headers.get('cf-connecting-ip')?.trim();

  // 本地开发或未配置反向代理时没有可用 IP；仍只持久化它的日盐哈希。
  return ip?.slice(0, 128) || '0.0.0.0';
}

export function hashIp(ip: string, at: Date, secret = process.env.AUTH_SECRET ?? ''): string {
  const utcDate = startOfUtcDay(at).toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}${secret}${utcDate}`).digest('hex');
}

export function nextClickEventId(now = Date.now()): bigint {
  // SQLite BIGINT primary keys need an explicit value; this is monotonic per process and collision-resistant
  // across instances without persisting any visitor data in the identifier.
  const candidate = BigInt(now) * 1_000_000n + clickEventInstanceOffset;
  lastClickEventId = candidate > lastClickEventId ? candidate : lastClickEventId + 1n;
  return lastClickEventId;
}

export function allowEventForIp(ipHash: string, now = Date.now()): boolean {
  for (const [key, bucket] of eventRateLimitBuckets) {
    if (now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) eventRateLimitBuckets.delete(key);
  }

  const bucket = eventRateLimitBuckets.get(ipHash);
  if (!bucket || now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
    eventRateLimitBuckets.set(ipHash, { count: 1, startedAt: now });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_PER_MINUTE) return false;
  bucket.count += 1;
  return true;
}

export function resetEventRateLimit(): void {
  eventRateLimitBuckets.clear();
}

export async function getRecentPageStats(pageId: string, now = new Date()): Promise<PageStatsReport> {
  const today = startOfUtcDay(now);
  const tomorrow = addUtcDays(today, 1);
  const rangeStart = addUtcDays(today, -29);
  const liveWhere = {
    pageId,
    tsBucket: { gte: today, lt: tomorrow },
  };

  const [storedDaily, liveCounts, liveVisitors] = await Promise.all([
    db.dailyStat.findMany({
      where: { pageId, date: { gte: rangeStart, lt: today } },
      orderBy: { date: 'asc' },
      select: { date: true, views: true, uniques: true, clicks: true },
    }),
    db.clickEvent.groupBy({
      by: ['kind'],
      where: liveWhere,
      _count: { _all: true },
    }),
    db.clickEvent.groupBy({
      by: ['ipHash'],
      where: { ...liveWhere, ipHash: { not: null } },
    }),
  ]);

  let liveViews = 0;
  let liveClicks = 0;
  for (const row of liveCounts) {
    if (row.kind === 'VIEW') liveViews = row._count._all;
    if (row.kind === 'CLICK') liveClicks = row._count._all;
  }

  const daily: DailyStatsPoint[] = storedDaily.map((row) => ({
    date: row.date,
    views: row.views,
    uniques: row.uniques,
    clicks: row.clicks,
  }));
  if (liveViews || liveClicks || liveVisitors.length) {
    daily.push({
      date: today,
      views: liveViews,
      uniques: liveVisitors.length,
      clicks: liveClicks,
    });
  }

  // UV 按每个 UTC 日内的 ipHash 去重；跨天直接相加，不做跨天去重。
  return daily.reduce<PageStatsReport>(
    (report, point) => ({
      views: report.views + point.views,
      uniques: report.uniques + point.uniques,
      clicks: report.clicks + point.clicks,
      daily: report.daily.concat(point),
    }),
    { views: 0, uniques: 0, clicks: 0, daily: [] },
  );
}
