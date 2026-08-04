import { describe, expect, it } from 'vitest';

import { blockConfigSchemas, blockSchema } from './blocks';

describe('block config schemas', () => {
  it('accepts a valid LINK block', () => {
    expect(
      blockConfigSchemas.LINK.safeParse({ title: '官网', url: 'https://yilink.example' }).success,
    ).toBe(true);
  });

  it('accepts a valid SOCIAL block', () => {
    expect(
      blockConfigSchemas.SOCIAL.safeParse({
        items: [{ platform: 'wechat', url: 'https://weixin.qq.com' }],
      }).success,
    ).toBe(true);
  });

  it('accepts a valid TEXT block', () => {
    expect(blockConfigSchemas.TEXT.safeParse({ markdown: '**你好**' }).success).toBe(true);
  });

  it('accepts a valid IMAGE block', () => {
    expect(
      blockConfigSchemas.IMAGE.safeParse({ url: 'https://yilink.example/avatar.png' }).success,
    ).toBe(true);
  });

  it('accepts a valid WECHAT block', () => {
    expect(blockConfigSchemas.WECHAT.safeParse({ wechatId: 'yilink' }).success).toBe(true);
  });

  it('accepts a valid QR block', () => {
    expect(
      blockConfigSchemas.QR.safeParse({ imageUrl: 'https://yilink.example/qr.png' }).success,
    ).toBe(true);
  });

  it('accepts a valid DIVIDER block', () => {
    expect(blockConfigSchemas.DIVIDER.safeParse({}).success).toBe(true);
  });

  it('rejects a LINK block with an invalid URL', () => {
    expect(blockConfigSchemas.LINK.safeParse({ title: '坏链接', url: 'not-a-url' }).success).toBe(
      false,
    );
  });

  it('rejects a SOCIAL block with an unknown platform', () => {
    expect(
      blockConfigSchemas.SOCIAL.safeParse({
        items: [{ platform: 'unknown', url: 'https://example.com' }],
      }).success,
    ).toBe(false);
  });

  it('rejects mismatched block type and config', () => {
    expect(blockSchema.safeParse({ type: 'QR', config: { markdown: 'wrong' } }).success).toBe(
      false,
    );
  });
});
