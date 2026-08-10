import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PlatformGlyph, PlatformSticker, stickerInk } from './components';
import {
  getPlatformIcon,
  platformIconIds,
  platformRegistry,
  platformRegistryById,
} from './generated/registry';
import type { PlatformIconDefinition } from './types';

const registryEntries: readonly PlatformIconDefinition[] = platformRegistry;

describe('@yilink/icons registry', () => {
  // 不断言总数：平台会持续增补，写死数字只会让每次扩容都「失败一次再改回来」。
  // 真正要守住的是不变式——每条记录都自洽，且 pending 不伪造图形。
  it('covers the platforms a link-in-bio page actually needs', () => {
    const ids = new Set(platformIconIds as readonly string[]);
    for (const id of [
      'wechat', 'weibo', 'xiaohongshu', 'douyin', 'bilibili', 'zhihu', 'taobao', // 国内主场
      'instagram', 'x', 'youtube', 'tiktok', 'linkedin', 'facebook', 'threads', // 全球社交
      'github', 'gitlab', 'stack-overflow', // 开发
      'behance', 'dribbble', 'figma', // 设计
      'spotify', 'apple-music', 'apple-podcasts', 'soundcloud', // 音频
      'substack', 'medium', 'notion', // 写作
      'patreon', 'ko-fi', 'buy-me-a-coffee', 'paypal', // 收款
      'calendly', 'email', 'phone', 'website', // 联系与预约
    ]) {
      expect(ids, `缺少平台 ${id}`).toContain(id);
    }
  });

  it('exports an id for every registry entry', () => {
    expect(platformIconIds).toHaveLength(platformRegistry.length);
  });

  it('does not contain duplicate ids', () => {
    expect(new Set(platformIconIds).size).toBe(platformIconIds.length);
  });

  it('indexes every registry entry by id', () => {
    expect(Object.keys(platformRegistryById)).toHaveLength(platformRegistry.length);
  });

  it('looks up a platform by id', () => {
    expect(getPlatformIcon('wechat')).toMatchObject({
      id: 'wechat',
      nameZh: '微信',
      source: 'simple-icons',
    });
  });

  it('gives every sourced entry a non-empty glyph path', () => {
    for (const platform of registryEntries.filter((item) => item.source !== 'pending')) {
      expect(platform.glyphPath, platform.id).toEqual(expect.any(String));
      expect(platform.glyphPath?.length, platform.id).toBeGreaterThan(0);
    }
  });

  // 混用图库的前提：所有字形同规格，否则贴纸里会一大一小
  it('keeps every glyph on the same 24×24 canvas', () => {
    for (const platform of registryEntries) {
      expect(platform.viewBox, platform.id).toBe('0 0 24 24');
    }
  });

  it('gives every simple-icons entry an upstream-verified sticker colour', () => {
    for (const platform of registryEntries.filter((item) => item.source === 'simple-icons')) {
      expect(platform.stickerHex, platform.id).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('only leaves platforms pending when no licensed mark exists', () => {
    // 这十个在 simple-icons / Remix Icon / TDesign 中均无收录；Arcticons 有几个但是
    // 细线风格 + CC BY-SA 传染性许可，混进来会同时破坏视觉一致性与许可干净度。
    expect(
      registryEntries.filter((platform) => platform.source === 'pending').map((p) => p.id).sort(),
    ).toEqual(
      [
        'dewu', 'goofish', 'jd', 'jike', 'pinduoduo',
        'qq-music', 'sspai', 'wechat-official-account', 'xiaoyuzhou', 'ximalaya',
      ].sort(),
    );
  });

  it('does not fabricate paths for pending entries', () => {
    expect(
      registryEntries
        .filter((platform) => platform.source === 'pending')
        .every((platform) => platform.glyphPath === null),
    ).toBe(true);
  });
});

describe('platform icon components', () => {
  it('renders a bare glyph in currentColor by default', () => {
    const markup = renderToStaticMarkup(createElement(PlatformGlyph, { id: 'wechat' }));

    expect(markup).toContain('fill="currentColor"');
    expect(markup).toContain('<path');
  });

  it('accepts an explicit bare-glyph fill', () => {
    const markup = renderToStaticMarkup(
      createElement(PlatformGlyph, { fill: '#123456', id: 'wechat', size: 30 }),
    );

    expect(markup).toContain('fill="#123456"');
    expect(markup).toContain('width="30"');
  });

  it('returns no unverified bare glyph', () => {
    const markup = renderToStaticMarkup(
      createElement(PlatformGlyph, { id: 'wechat-official-account' }),
    );

    expect(markup).toBe('');
  });

  it('uses the source-verified sticker colour', () => {
    const markup = renderToStaticMarkup(createElement(PlatformSticker, { id: 'bilibili' }));

    expect(markup).toContain('fill="#FB7299"');
    expect(markup).toContain('fill="#FFFFFF"');
  });

  it('renders a complete neutral fallback sticker when even the colour is unverified', () => {
    // 得物官网反爬，取不到自有素材，品牌色留空 → 走中性底
    const markup = renderToStaticMarkup(createElement(PlatformSticker, { id: 'dewu' }));

    expect(markup).toContain('fill="#6B7280"');
    expect(markup).toContain('得');
    expect(markup).not.toContain('<path');
  });

  it('uses the verified brand colour for a pending platform’s lettermark', () => {
    const markup = renderToStaticMarkup(
      createElement(PlatformSticker, { id: 'wechat-official-account' }),
    );

    expect(markup).toContain('fill="#1AAD19"');
    expect(markup).toContain('微');
    expect(markup).not.toContain('<path');
  });

  it('preserves Douyin’s three offset colour layers', () => {
    const markup = renderToStaticMarkup(createElement(PlatformSticker, { id: 'douyin' }));

    expect(markup).toContain('fill="#161823"');
    expect(markup).toContain('fill="#25F4EE"');
    expect(markup).toContain('fill="#FE2C55"');
    expect(markup).toContain('fill="#FFFFFF"');
  });
});

describe('sticker ink contrast', () => {
  it('keeps white ink on the brand colours that canonically use it', () => {
    for (const hex of ['#07C160', '#25D366', '#1ED760', '#FF0000', '#000000']) {
      expect(stickerInk(hex), hex).toBe('#FFFFFF');
    }
  });

  it('switches to dark ink where white would vanish', () => {
    // 黄/柠檬底：白字对比度 1.1–1.6，实测在真机上几乎看不见
    for (const hex of ['#FFFC00', '#FFCD00', '#FFDD00', '#FFE411', '#FFE60F']) {
      expect(stickerInk(hex), hex).toBe('#1A1A1A');
    }
  });

  it('falls back to white for a missing or malformed colour', () => {
    expect(stickerInk(null)).toBe('#FFFFFF');
    expect(stickerInk('rgb(1,2,3)')).toBe('#FFFFFF');
  });

  it('renders the pending lettermark in readable ink on a light brand colour', () => {
    const markup = renderToStaticMarkup(createElement(PlatformSticker, { id: 'jike' }));

    expect(markup).toContain('fill="#FFE411"');
    expect(markup).toContain('fill="#1A1A1A"');
    expect(markup).toContain('即');
  });
});
