import { describe, expect, it } from 'vitest';

import { ctaConfigSchema } from './cta';

describe('ctaConfigSchema', () => {
  it('accepts a WeChat CTA and null', () => {
    expect(
      ctaConfigSchema.safeParse({ type: 'wechat', label: '添加微信', value: 'yilink' }).success,
    ).toBe(true);
    expect(ctaConfigSchema.safeParse(null).success).toBe(true);
  });

  it('rejects an empty or overlong CTA label', () => {
    expect(
      ctaConfigSchema.safeParse({ type: 'link', label: '', value: 'https://example.com' }).success,
    ).toBe(false);
    expect(
      ctaConfigSchema.safeParse({
        type: 'link',
        label: '超过十二个字符的按钮文案会被拒绝',
        value: 'https://example.com',
      }).success,
    ).toBe(false);
  });
});
