import { describe, expect, it } from 'vitest';

import {
  BENTO_COLUMNS,
  bentoPlacementSchema,
  clampToBounds,
  compact,
  firstFitFallback,
  normalizeBentoLayout,
  overlaps,
  pushDown,
} from './bento';

const block = (overrides: Record<string, unknown> = {}) => ({
  type: 'LINK' as const,
  position: 0,
  placement: { x: 0, y: 0, w: 2, h: 1 },
  ...overrides,
});

describe('bento layout', () => {
  it('has four micro columns', () => expect(BENTO_COLUMNS).toBe(4));
  it('validates a placement inside bounds', () => expect(bentoPlacementSchema.safeParse({ x: 2, y: 0, w: 2, h: 1 }).success).toBe(true));
  it('rejects placement outside bounds', () => expect(bentoPlacementSchema.safeParse({ x: 3, y: 0, w: 2, h: 1 }).success).toBe(false));
  it('requires integer placement values', () => expect(bentoPlacementSchema.safeParse({ x: 0.5, y: 0, w: 2, h: 1 }).success).toBe(false));
  it('clamps negative coordinates', () => expect(clampToBounds({ x: -2, y: -1, w: 2, h: 1 })).toEqual({ x: 0, y: 0, w: 2, h: 1 }));
  it('clamps right overflow', () => expect(clampToBounds({ x: 3, y: 0, w: 3, h: 1 })).toEqual({ x: 1, y: 0, w: 3, h: 1 }));
  it('detects overlap', () => expect(overlaps({ x: 0, y: 0, w: 2, h: 1 }, { x: 1, y: 0, w: 2, h: 1 })).toBe(true));
  it('does not treat touching edges as overlap', () => expect(overlaps({ x: 0, y: 0, w: 2, h: 1 }, { x: 2, y: 0, w: 2, h: 1 })).toBe(false));
  it('pushes collisions down', () => expect(pushDown([block(), block({ position: 1 })], 0)[1].placement!.y).toBe(1));
  it('pushes collision chains down', () => expect(pushDown([block(), block({ position: 1 }), block({ position: 2 })], 0).map((item) => item.placement!.y)).toEqual([0, 1, 2]));
  it('compacts floating blocks', () => expect(compact([block({ placement: { x: 0, y: 3, w: 2, h: 1 } })])[0].placement!.y).toBe(0));
  it('compacts around occupied columns', () => expect(compact([block(), block({ position: 1, placement: { x: 2, y: 4, w: 2, h: 1 } })])[1].placement!.y).toBe(0));
  it('enforces link minimum width', () => expect(normalizeBentoLayout([block({ placement: { x: 0, y: 0, w: 1, h: 1 } })])[0].placement!.w).toBe(2));
  it('permits image one-column width', () => expect(normalizeBentoLayout([block({ type: 'IMAGE', placement: { x: 0, y: 0, w: 1, h: 1 } })])[0].placement!.w).toBe(1));
  it('forces divider geometry', () => expect(normalizeBentoLayout([block({ type: 'DIVIDER', placement: { x: 2, y: 5, w: 2, h: 4 } })])[0].placement).toEqual({ x: 0, y: 0, w: 4, h: 1 }));
  it('is idempotent', () => { const once = normalizeBentoLayout([block(), block({ position: 1 })]); expect(normalizeBentoLayout(once)).toEqual(once); });
  it('is deterministic', () => { const input = [block(), block({ position: 1 })]; expect(normalizeBentoLayout(input)).toEqual(normalizeBentoLayout(input)); });
  it('compacts after hidden blocks are filtered', () => expect(compact([block(), block({ position: 2, placement: { x: 0, y: 4, w: 2, h: 1 } })])[1].placement!.y).toBe(1));
  it('compacts after CTA de-duplication', () => expect(compact([block({ placement: { x: 0, y: 2, w: 4, h: 1 } })])[0].placement!.y).toBe(0));
  it('derives legacy half-width compact size', () => expect(normalizeBentoLayout([block()])[0].size).toBe('SM'));
  it('derives legacy half-width standard size', () => expect(normalizeBentoLayout([block({ placement: { x: 0, y: 0, w: 2, h: 2 } })])[0].size).toBe('MD'));
  it('derives legacy full-width size', () => expect(normalizeBentoLayout([block({ placement: { x: 0, y: 0, w: 4, h: 1 } })])[0].size).toBe('LG'));
  it('uses position for the fallback reading order', () => expect(firstFitFallback([block({ position: 3 }), block({ position: 1 })]).map((item) => item.position)).toEqual([0, 1]));
  it('makes fallback blocks full width', () => expect(firstFitFallback([block()])[0].placement).toEqual({ x: 0, y: 0, w: 4, h: 1 }));
});
