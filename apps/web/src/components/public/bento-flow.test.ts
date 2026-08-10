import { describe, expect, it } from 'vitest';

import { bentoRowUnit, resolveBentoLayout, type BentoRenderBlock } from './bento-layout';

function block(
  id: string,
  placement: BentoRenderBlock['placement'],
  type: BentoRenderBlock['type'] = 'LINK',
): BentoRenderBlock {
  return { id, type, placement, node: null };
}

describe('bentoRowUnit', () => {
  it('keeps h=4 at 84px for the default 12px gap', () => {
    expect(bentoRowUnit('12px')).toBe('12px');
  });

  it('compensates a larger gap so h=4 stays 84px', () => {
    expect(bentoRowUnit('14px')).toBe('10.5px');
  });

  it('falls back to 12px for unparsable gaps', () => {
    expect(bentoRowUnit(undefined)).toBe('12px');
    expect(bentoRowUnit('inherit')).toBe('12px');
  });
});

describe('resolveBentoLayout', () => {
  it('returns an empty list untouched', () => {
    expect(resolveBentoLayout([])).toEqual([]);
  });

  it('compacts the hole left by a filtered-out block', () => {
    // 中间那块被 CTA 去重/隐藏过滤掉后，y=8 的块必须上浮，否则页面留洞
    const resolved = resolveBentoLayout([
      block('a', { x: 0, y: 0, w: 4, h: 4 }),
      block('c', { x: 0, y: 8, w: 4, h: 4 }),
    ]);
    expect(resolved.map((b) => b.placement?.y)).toEqual([0, 4]);
  });

  it('keeps a valid side-by-side layout stable', () => {
    const input = [
      block('a', { x: 0, y: 0, w: 2, h: 4 }),
      block('b', { x: 2, y: 0, w: 2, h: 4 }),
    ];
    const resolved = resolveBentoLayout(input);
    expect(resolved.map((b) => b.placement)).toEqual([
      { x: 0, y: 0, w: 2, h: 4 },
      { x: 2, y: 0, w: 2, h: 4 },
    ]);
  });

  it('falls back to a safe full-width layout when a placement is missing', () => {
    const resolved = resolveBentoLayout([
      block('a', { x: 0, y: 0, w: 2, h: 4 }),
      block('b', null),
    ]);
    expect(resolved.every((b) => b.placement !== null)).toBe(true);
    expect(resolved.every((b) => (b.placement?.x ?? 0) + (b.placement?.w ?? 0) <= 4)).toBe(true);
  });

  it('falls back when a placement overflows the grid', () => {
    const resolved = resolveBentoLayout([block('a', { x: 3, y: 0, w: 3, h: 4 })]);
    expect((resolved[0].placement?.x ?? 0) + (resolved[0].placement?.w ?? 0)).toBeLessThanOrEqual(4);
  });

  it('never produces overlapping tiles', () => {
    const resolved = resolveBentoLayout([
      block('a', { x: 0, y: 0, w: 4, h: 4 }),
      block('b', { x: 0, y: 0, w: 2, h: 4 }),
      block('c', { x: 2, y: 2, w: 2, h: 4 }),
    ]);
    for (let i = 0; i < resolved.length; i += 1) {
      for (let j = i + 1; j < resolved.length; j += 1) {
        const a = resolved[i].placement!;
        const b = resolved[j].placement!;
        const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it('preserves block identity and order of the input array', () => {
    const resolved = resolveBentoLayout([
      block('a', { x: 0, y: 0, w: 2, h: 4 }),
      block('b', { x: 2, y: 0, w: 2, h: 4 }),
    ]);
    expect(resolved.map((b) => b.id)).toEqual(['a', 'b']);
  });
});
