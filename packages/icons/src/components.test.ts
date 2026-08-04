import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PlatformGlyph, PlatformSticker } from './components';
import {
  getPlatformIcon,
  platformIconIds,
  platformRegistry,
  platformRegistryById,
} from './generated/registry';
import type { PlatformIconDefinition } from './types';

const registryEntries: readonly PlatformIconDefinition[] = platformRegistry;

describe('@yilink/icons registry', () => {
  it('contains all 42 verified platforms', () => {
    expect(platformRegistry).toHaveLength(42);
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

  it('has 26 verified simple-icons glyphs', () => {
    expect(registryEntries.filter((platform) => platform.source === 'simple-icons')).toHaveLength(26);
  });

  it('gives every simple-icons entry a non-empty glyph path', () => {
    for (const platform of registryEntries.filter((item) => item.source === 'simple-icons')) {
      expect(platform.glyphPath).toEqual(expect.any(String));
      expect(platform.glyphPath?.length).toBeGreaterThan(0);
    }
  });

  it('has no custom glyphs before the follow-up artwork task', () => {
    expect(registryEntries.filter((platform) => platform.source === 'custom')).toHaveLength(0);
  });

  it('leaves 16 unverified glyphs pending', () => {
    expect(registryEntries.filter((platform) => platform.source === 'pending')).toHaveLength(16);
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

  it('renders a complete neutral fallback sticker for a pending platform', () => {
    const markup = renderToStaticMarkup(
      createElement(PlatformSticker, { id: 'wechat-official-account' }),
    );

    expect(markup).toContain('fill="#6B7280"');
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
