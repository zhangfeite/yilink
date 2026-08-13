import { clientIp } from './stats';

/**
 * 认证入口的进程内滑窗限流。
 *
 * 与 stats 的事件限频同一形态：Workers 上按 isolate 计数，不是全局精确值——
 * 但对认证场景这正够用：单源爆破会命中同一 colo 的少数 isolate，速率被压到
 * 每 isolate 上限；而分布式撞库本就该由 Cloudflare WAF/托管规则兜底。
 * 换 Redis/DO 全局计数前，这里先把「无限次免费打 bcrypt」这扇门关上。
 */
interface Bucket {
  count: number;
  startedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitRule {
  /** 每窗口允许的次数 */
  limit: number;
  /** 窗口毫秒数 */
  windowMs: number;
}

/** 登录：同一 IP 每分钟 10 次尝试（成功登录一般 1 次就停，误伤面极小）。 */
export const LOGIN_RULE: RateLimitRule = { limit: 10, windowMs: 60_000 };
/** 登录：同一邮箱每分钟 5 次——跨 IP 撞同一账号时的第二道闸。 */
export const LOGIN_EMAIL_RULE: RateLimitRule = { limit: 5, windowMs: 60_000 };
/** 注册：同一 IP 每 10 分钟 10 次，够真人重试、封死邀请码枚举。 */
export const REGISTER_RULE: RateLimitRule = { limit: 10, windowMs: 600_000 };

export function allowAttempt(scope: string, key: string, rule: RateLimitRule, now = Date.now()): boolean {
  // 顺手清一遍过期桶，Map 不会无界增长
  for (const [existingKey, bucket] of buckets) {
    if (now - bucket.startedAt >= rule.windowMs * 4) buckets.delete(existingKey);
  }

  const bucketKey = `${scope}:${key}`;
  const bucket = buckets.get(bucketKey);
  if (!bucket || now - bucket.startedAt >= rule.windowMs) {
    buckets.set(bucketKey, { count: 1, startedAt: now });
    return true;
  }

  if (bucket.count >= rule.limit) return false;
  bucket.count += 1;
  return true;
}

/** 从请求头拿限流主体（Cloudflare 注入的真实 IP）。headers 缺失时归并到固定键，仍受限。 */
export function rateLimitSubject(headers: Headers | undefined): string {
  return headers ? clientIp(headers) : 'unknown';
}

export function resetRateLimit(): void {
  buckets.clear();
}
