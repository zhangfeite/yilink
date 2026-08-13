import { describe, expect, it } from 'vitest';

import { layoutSaveSchema, pageUpdateSchema } from './pages-api-schemas';

describe('pageUpdateSchema avatarUrl', () => {
  it('accepts https URLs and null', () => {
    expect(pageUpdateSchema.safeParse({ avatarUrl: 'https://cdn.example.com/a.png' }).success).toBe(
      true,
    );
    expect(pageUpdateSchema.safeParse({ avatarUrl: null }).success).toBe(true);
  });

  it('rejects non-http(s) schemes that z.string().url() alone would let through', () => {
    // 头像最终进 <img src> 与 og:image；javascript:/data: 必须在入库前掐死
    for (const avatarUrl of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'ftp://x/a.png']) {
      expect(pageUpdateSchema.safeParse({ avatarUrl }).success, avatarUrl).toBe(false);
    }
  });
});

describe('layoutSaveSchema avatarUrl', () => {
  it('applies the same scheme restriction as the page update path', () => {
    const base = {
      title: '标题',
      bio: null,
      layout: 'LIST',
      bentoVersion: null,
      themeId: 'ink',
      seoTitle: null,
      seoDesc: null,
      ctaConfig: null,
      themeConfig: null,
      blocks: [],
    };
    expect(layoutSaveSchema.safeParse({ ...base, avatarUrl: 'https://ok.example/a.png' }).success).toBe(true);
    expect(layoutSaveSchema.safeParse({ ...base, avatarUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
});
