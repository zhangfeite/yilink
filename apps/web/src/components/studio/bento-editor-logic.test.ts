import { describe, expect, it } from 'vitest';

import {
  commitHistory,
  bentoConstraintsSatisfied,
  createBentoCandidate,
  createHistory,
  detectBentoGuardrails,
  hasIsolatedHole,
  placementIsValid,
  publishingBlocker,
  randomizeBentoLayout,
  redoHistory,
  tidyBentoLayout,
  undoHistory,
} from './bento-editor-logic';
import type { StudioBlock } from './types';

function block(type: StudioBlock['type'], size: StudioBlock['size']): StudioBlock {
  return { id: `${type}-${size}`, type, size, isVisible: true, config: {} };
}

describe('bento conversion candidates', () => {
  it('converts LIST blocks to full-width rows', () => {
    const result = createBentoCandidate([block('LINK', 'SM'), block('IMAGE', 'MD')], 'LIST');
    expect(result.map(({ placement }) => placement.w)).toEqual([4, 4]);
  });

  it('maps GRID link sizes and makes non-links full width', () => {
    const result = createBentoCandidate(
      [block('LINK', 'SM'), block('LINK', 'MD'), block('LINK', 'LG'), block('TEXT', 'SM')],
      'GRID',
    );
    expect(result.map(({ placement }) => [placement.w, placement.h])).toEqual([
      [2, 1],
      [2, 4],
      [4, 4],
      [4, 4],
    ]);
  });
});

describe('bento history', () => {
  it('undoes and redoes an edit', () => {
    const edited = commitHistory(createHistory([1]), [2]);
    expect(undoHistory(edited).present).toEqual([1]);
    expect(redoHistory(undoHistory(edited)).present).toEqual([2]);
  });

  it('keeps at most twenty undo snapshots', () => {
    let history = createHistory(0);
    for (let value = 1; value <= 25; value += 1) history = commitHistory(history, value);
    expect(history.past).toHaveLength(20);
    expect(history.past[0]).toBe(5);
  });
});

describe('bento layout actions and guardrails', () => {
  const positioned = (
    id: string,
    type: StudioBlock['type'],
    placement: NonNullable<StudioBlock['placement']>,
  ): StudioBlock => ({ id, type, size: 'MD', isVisible: true, config: {}, placement });

  it('generates a random arrangement satisfying all constraints', () => {
    const input = Array.from({ length: 6 }, (_, index) =>
      positioned(`link-${index}`, 'LINK', { x: 0, y: index * 4, w: 4, h: 4 }),
    );
    expect(bentoConstraintsSatisfied(randomizeBentoLayout(input, () => 0.42))).toBe(true);
  });

  it('detects a cell enclosed on four sides as an isolated hole', () => {
    const input = [
      positioned('top', 'IMAGE', { x: 1, y: 0, w: 1, h: 1 }),
      positioned('left', 'IMAGE', { x: 0, y: 1, w: 1, h: 1 }),
      positioned('right', 'IMAGE', { x: 2, y: 1, w: 1, h: 1 }),
      positioned('bottom', 'IMAGE', { x: 1, y: 2, w: 1, h: 1 }),
    ];
    expect(hasIsolatedHole(input)).toBe(true);
  });

  it('tidy removes isolated holes', () => {
    const input = [
      positioned('top', 'IMAGE', { x: 1, y: 0, w: 1, h: 1 }),
      positioned('left', 'IMAGE', { x: 0, y: 1, w: 1, h: 1 }),
      positioned('right', 'IMAGE', { x: 2, y: 1, w: 1, h: 1 }),
      positioned('bottom', 'IMAGE', { x: 1, y: 2, w: 1, h: 1 }),
    ];
    expect(hasIsolatedHole(tidyBentoLayout(input))).toBe(false);
  });

  it('tidy moves social stickers behind hero content', () => {
    const result = tidyBentoLayout([
      positioned('social', 'SOCIAL', { x: 0, y: 0, w: 2, h: 1 }),
      positioned('hero', 'LINK', { x: 0, y: 2, w: 4, h: 4 }),
    ]);
    expect(result.map((item) => item.id)).toEqual(['hero', 'social']);
  });

  it('warns about adjacent full-width cards', () => {
    const warnings = detectBentoGuardrails([
      positioned('one', 'LINK', { x: 0, y: 0, w: 4, h: 1 }),
      positioned('two', 'LINK', { x: 0, y: 1, w: 4, h: 1 }),
    ]);
    expect(warnings).toContain('ADJACENT_FULL');
  });

  it('warns when the first screen has no focal card', () => {
    expect(
      detectBentoGuardrails([positioned('small', 'LINK', { x: 0, y: 0, w: 2, h: 1 })]),
    ).toContain('NO_FOCUS');
  });

  it('rejects a size below the block type minimum', () => {
    expect(placementIsValid(block('LINK', 'SM'), { x: 0, y: 0, w: 1, h: 1 })).toBe(false);
  });

  it('blocks publishing when a QR card is cropped too short', () => {
    const qr = positioned('qr', 'QR', { x: 0, y: 0, w: 2, h: 1 });
    expect(publishingBlocker([qr])?.id).toBe('qr');
  });
});
