import { describe, expect, it } from 'vitest';

import { classifyReferrer, clientIp, hashIp, startOfUtcDay, startOfUtcHour } from './stats';
import { classifyUserAgent } from './ua';

describe('stats helpers', () => {
  it('coarsens referrers without retaining a full URL', () => {
    expect(classifyReferrer(null)).toBe('direct');
    expect(classifyReferrer('https://mp.weixin.qq.com/s/example')).toBe('wechat');
    expect(classifyReferrer('https://weibo.com/example')).toBe('weibo');
    expect(classifyReferrer('https://www.zhihu.com/question/1')).toBe('zhihu');
    expect(classifyReferrer('https://www.bilibili.com/video/BV1')).toBe('bilibili');
    expect(classifyReferrer('https://www.google.com/search?q=yilink')).toBe('search');
    expect(classifyReferrer('https://example.com/path')).toBe('other');
  });

  it('uses UTC day and hour buckets for privacy hashing and aggregation', () => {
    const instant = new Date('2026-08-04T23:45:12.345Z');

    expect(startOfUtcDay(instant).toISOString()).toBe('2026-08-04T00:00:00.000Z');
    expect(startOfUtcHour(instant).toISOString()).toBe('2026-08-04T23:00:00.000Z');
    expect(hashIp('203.0.113.10', instant, 'test-secret')).toBe(
      hashIp('203.0.113.10', new Date('2026-08-04T00:00:00.000Z'), 'test-secret'),
    );
    expect(hashIp('203.0.113.10', instant, 'test-secret')).not.toBe(
      hashIp('203.0.113.10', new Date('2026-08-05T00:00:00.000Z'), 'test-secret'),
    );
  });

  it('prefers the Cloudflare-injected IP and only falls back to forwarded-for locally', () => {
    expect(
      clientIp(
        new Headers({
          'cf-connecting-ip': '198.51.100.8',
          'x-forwarded-for': '203.0.113.99, 203.0.113.1',
        }),
      ),
    ).toBe('198.51.100.8');
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.99, 203.0.113.1' }))).toBe(
      '203.0.113.99',
    );
  });

  it('classifies supported user agents before event storage', () => {
    expect(classifyUserAgent('Mozilla/5.0 MicroMessenger/8.0')).toBe('wechat');
    expect(classifyUserAgent('Mozilla/5.0 Weibo')).toBe('weibo');
    expect(classifyUserAgent('Mozilla/5.0 QQ/8.9')).toBe('qq');
    expect(classifyUserAgent('Mozilla/5.0 Aweme/1.0')).toBe('douyin');
    expect(classifyUserAgent('Mozilla/5.0 Safari/605.1')).toBe('browser');
    expect(classifyUserAgent('Googlebot/2.1')).toBe('bot');
  });
});
