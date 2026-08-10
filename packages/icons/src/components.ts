import { createElement, type SVGProps } from 'react';

import { getPlatformIcon } from './generated/registry';
import type { PlatformIconId } from './generated/registry';
import type { PlatformIconDefinition } from './types';

const STICKER_VIEW_BOX = '0 0 24 24';
const PENDING_STICKER_HEX = '#6B7280';
const WHITE = '#FFFFFF';
const DARK_INK = '#1A1A1A';
/**
 * 白色前景低于此对比度就换深色墨。
 * 不取「谁对比度高用谁」——那会把微信绿、WhatsApp 绿上的白色标记翻成黑色，
 * 而白标恰恰是这些品牌的惯用形态。阈值只兜住黄/柠檬这类白字真正看不见的底色。
 */
const MIN_WHITE_CONTRAST = 1.9;

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** 贴纸底色上可读的前景色（字形与占位首字共用，保证同一套观感）。 */
export function stickerInk(stickerHex: string | null): string {
  if (!stickerHex || !/^#[0-9a-f]{6}$/i.test(stickerHex)) return WHITE;
  const contrast = 1.05 / (relativeLuminance(stickerHex) + 0.05);
  return contrast < MIN_WHITE_CONTRAST ? DARK_INK : WHITE;
}

type IconSvgProps = Omit<SVGProps<SVGSVGElement>, 'children' | 'height' | 'width' | 'viewBox'>;

export interface PlatformGlyphProps extends IconSvgProps {
  id: PlatformIconId;
  size?: number | string;
  /** Defaults to `currentColor`, so the glyph inherits surrounding text colour. */
  fill?: string;
}

export interface PlatformStickerProps extends IconSvgProps {
  id: PlatformIconId;
  size?: number | string;
}

/**
 * Renders the unframed brand glyph. Pending platforms deliberately render
 * nothing here because no brand mark has been verified yet; use
 * PlatformSticker when a non-fragmenting fallback is required.
 */
export function PlatformGlyph({
  id,
  size = 24,
  fill = 'currentColor',
  ...svgProps
}: PlatformGlyphProps) {
  const platform = getPlatformIcon(id);

  if (!platform.glyphPath) {
    return null;
  }

  return createElement(
    'svg',
    {
      ...svgProps,
      'aria-hidden': true,
      fill,
      focusable: 'false',
      height: size,
      viewBox: platform.viewBox,
      width: size,
      xmlns: 'http://www.w3.org/2000/svg',
    },
    createElement('path', { d: platform.glyphPath }),
  );
}

function glyphLayer(
  platform: PlatformIconDefinition,
  fill: string,
  transform?: string,
  key?: string,
) {
  if (!platform.glyphPath) {
    return null;
  }

  return createElement(
    'svg',
    {
      key,
      'aria-hidden': true,
      height: 18,
      transform,
      viewBox: platform.viewBox,
      width: 18,
      x: 3,
      y: 3,
    },
    createElement('path', { d: platform.glyphPath, fill }),
  );
}

function pendingFallback(nameZh: string, ink: string) {
  return createElement(
    'text',
    {
      dominantBaseline: 'central',
      fill: ink,
      fontFamily: 'system-ui, sans-serif',
      fontSize: 11,
      fontWeight: 700,
      textAnchor: 'middle',
      x: 12,
      y: 12,
    },
    Array.from(nameZh)[0] ?? '?',
  );
}

/**
 * Renders the circular platform sticker used in social-link grids. A pending
 * entry always remains legible through a neutral circle and first Chinese
 * character rather than an empty or broken SVG.
 */
export function PlatformSticker({ id, size = 52, ...svgProps }: PlatformStickerProps) {
  const platform = getPlatformIcon(id);
  const ink = stickerInk(platform.stickerHex);
  const glyph = !platform.glyphPath
    ? pendingFallback(platform.nameZh, ink)
    : platform.id === 'douyin'
      ? [
          glyphLayer(platform, '#25F4EE', 'translate(-0.55 0.35)', 'douyin-cyan'),
          glyphLayer(platform, '#FE2C55', 'translate(0.55 -0.35)', 'douyin-red'),
          glyphLayer(platform, WHITE, undefined, 'douyin-main'),
        ]
      : glyphLayer(platform, ink);

  return createElement(
    'svg',
    {
      ...svgProps,
      'aria-hidden': true,
      fill: 'none',
      focusable: 'false',
      height: size,
      viewBox: STICKER_VIEW_BOX,
      width: size,
      xmlns: 'http://www.w3.org/2000/svg',
    },
    createElement('circle', {
      cx: 12,
      cy: 12,
      fill: platform.stickerHex ?? PENDING_STICKER_HEX,
      r: 12,
    }),
    glyph,
  );
}
