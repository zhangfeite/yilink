import { describe, expect, it } from 'vitest';

import { CompositeModerationProvider } from './composite';
import { LocalWordsModerationProvider } from './local-words';
import type { ModerationProvider } from './provider';
import { UrlBlocklistProvider } from './url-blocklist';
import { BLOCK_WORD_CATEGORIES } from './word-lists';

const localWords = new LocalWordsModerationProvider();

describe('LocalWordsModerationProvider', () => {
  it('ships 20-40 maintained block phrases in every required category', () => {
    expect(Object.keys(BLOCK_WORD_CATEGORIES)).toEqual([
      'gambling',
      'adult',
      'investmentScam',
      'contraband',
      'politicalSensitive',
    ]);
    for (const terms of Object.values(BLOCK_WORD_CATEGORIES)) {
      expect(terms.length).toBeGreaterThanOrEqual(20);
      expect(terms.length).toBeLessThanOrEqual(40);
    }
  });

  it.each([
    ['gambling', '高-额 返_水，真人娱乐赌场'],
    ['adult', '这里提供同 城 約 炮服务'],
    ['investment scam', '所谓老师带单，承诺穩 賺 不 賠'],
    ['contraband', '有人声称可以假 證 辦 理'],
    ['political sensitive', '发布煽动 顛 覆 國 家 政 權内容'],
  ])('blocks %s phrases including common evasions', async (_category, content) => {
    await expect(localWords.check(content)).resolves.toMatchObject({ verdict: 'block' });
  });

  it.each(['加 微❤信详聊', '年化收益说明', '在线问诊服务'])(
    'sends observation phrase %s to review',
    async (content) => {
      await expect(localWords.check(content)).resolves.toMatchObject({ verdict: 'review' });
    },
  );

  it('gives block precedence over review and de-duplicates labels', async () => {
    const result = await localWords.check({ title: '加微信', blocks: ['老师带单', '老师带单'] });
    expect(result.verdict).toBe('block');
    expect(result.labels).toEqual(['investmentScam:老师带单']);
  });

  it('passes ordinary creator copy and safely handles cyclic payloads', async () => {
    const payload: { bio: string; self?: unknown } = { bio: '独立设计师，分享作品与随笔' };
    payload.self = payload;
    await expect(localWords.check(payload)).resolves.toEqual({ verdict: 'pass', labels: [] });
  });
});

describe('UrlBlocklistProvider', () => {
  it('blocks an embedded URL on a built-in high-abuse TLD', async () => {
    const provider = new UrlBlocklistProvider([]);
    await expect(provider.check({ url: 'https://promo.example.top/welcome' })).resolves.toEqual({
      verdict: 'block',
      labels: ['url:*.top'],
    });
  });

  it('blocks exact and subdomain matches appended through configuration', async () => {
    const provider = new UrlBlocklistProvider('bad.example, *.spam.test');
    const result = await provider.check({
      links: ['https://a.bad.example/path', 'https://x.spam.test/offer'],
    });
    expect(result).toEqual({
      verdict: 'block',
      labels: ['url:bad.example', 'url:*.spam.test'],
    });
  });

  it('reads URL_BLOCKLIST additions when the provider is constructed', async () => {
    const original = process.env.URL_BLOCKLIST;
    process.env.URL_BLOCKLIST = 'env-blocked.example';
    try {
      const provider = new UrlBlocklistProvider();
      await expect(provider.check('https://sub.env-blocked.example/path')).resolves.toEqual({
        verdict: 'block',
        labels: ['url:env-blocked.example'],
      });
    } finally {
      if (original === undefined) delete process.env.URL_BLOCKLIST;
      else process.env.URL_BLOCKLIST = original;
    }
  });

  it('does not confuse a suffix lookalike with a blocked domain', async () => {
    const provider = new UrlBlocklistProvider('bad.example');
    await expect(provider.check('https://notbad.example.org')).resolves.toEqual({
      verdict: 'pass',
      labels: [],
    });
  });
});

describe('CompositeModerationProvider', () => {
  it('returns the highest-severity verdict and merges labels', async () => {
    const result = (verdict: 'pass' | 'review' | 'block', label: string): ModerationProvider => ({
      async check() {
        return { verdict, labels: label ? [label] : [] };
      },
    });
    const provider = new CompositeModerationProvider([
      result('review', 'review-label'),
      result('block', 'block-label'),
      result('pass', ''),
    ]);

    await expect(provider.check('payload')).resolves.toEqual({
      verdict: 'block',
      labels: ['review-label', 'block-label'],
    });
  });
});
