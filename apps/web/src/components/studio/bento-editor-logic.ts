import {
  BENTO_COLUMNS,
  MIN_COLS_BY_TYPE,
  MIN_ROWS_BY_TYPE,
  clampToBounds,
  compact,
  normalizeBentoLayout,
  overlaps,
  pushDown,
  type BentoBlock,
  type BentoPlacement,
} from '@yilink/shared';

import type { StudioBlock, StudioLayout } from './types';

export type PositionedStudioBlock = StudioBlock &
  BentoBlock & { placement: BentoPlacement; position: number };

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createHistory<T>(initial: T): HistoryState<T> {
  return { past: [], present: initial, future: [] };
}

export function commitHistory<T>(history: HistoryState<T>, next: T): HistoryState<T> {
  if (Object.is(history.present, next)) return history;
  return {
    past: [...history.past, history.present].slice(-20),
    present: next,
    future: [],
  };
}

export function undoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future].slice(0, 20),
  };
}

export function redoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  const next = history.future[0];
  if (next === undefined) return history;
  return {
    past: [...history.past, history.present].slice(-20),
    present: next,
    future: history.future.slice(1),
  };
}

function legacyGridPlacement(block: StudioBlock, position: number): BentoPlacement {
  if (block.type !== 'LINK') return { x: 0, y: position * 4, w: 4, h: 4 };
  if (block.size === 'SM') return { x: 0, y: position * 4, w: 2, h: 1 };
  if (block.size === 'MD') return { x: 0, y: position * 4, w: 2, h: 4 };
  return { x: 0, y: position * 4, w: 4, h: 4 };
}

/** Produces a client-only conversion candidate. Calling it never persists data. */
export function createBentoCandidate(
  blocks: readonly StudioBlock[],
  sourceLayout: StudioLayout,
): PositionedStudioBlock[] {
  return normalizeBentoLayout(
    blocks.map((block, position) => ({
      ...block,
      position,
      placement:
        sourceLayout === 'LIST'
          ? { x: 0, y: position, w: BENTO_COLUMNS, h: 1 }
          : legacyGridPlacement(block, position),
    })),
  );
}

export function normalizeStudioBento(blocks: readonly StudioBlock[]): PositionedStudioBlock[] {
  return normalizeBentoLayout(blocks.map((block, position) => ({ ...block, position })));
}

export function applyBentoOperation(
  blocks: readonly StudioBlock[],
  blockId: string,
  nextPlacement: BentoPlacement,
): PositionedStudioBlock[] {
  const positioned = normalizeBentoLayout(
    blocks.map((block, position) => ({ ...block, position })),
  );
  const movedIndex = positioned.findIndex((block) => block.id === blockId);
  if (movedIndex < 0) return positioned;
  positioned[movedIndex] = {
    ...positioned[movedIndex],
    placement: clampToBounds(nextPlacement),
  };
  return compact(pushDown(positioned, movedIndex)) as PositionedStudioBlock[];
}

export function minimumPlacement(block: StudioBlock): BentoPlacement {
  return {
    x: 0,
    y: 0,
    w: MIN_COLS_BY_TYPE[block.type],
    h: MIN_ROWS_BY_TYPE[block.type],
  };
}

export function placementIsValid(block: StudioBlock, placement: BentoPlacement): boolean {
  const minimum = minimumPlacement(block);
  return (
    placement.w >= minimum.w &&
    placement.h >= minimum.h &&
    placement.x >= 0 &&
    placement.y >= 0 &&
    placement.x + placement.w <= BENTO_COLUMNS
  );
}

export function hasOverlap(blocks: readonly StudioBlock[]): boolean {
  return blocks.some((block, index) =>
    blocks
      .slice(index + 1)
      .some((other) =>
        block.placement && other.placement ? overlaps(block.placement, other.placement) : false,
      ),
  );
}

function occupiedCells(blocks: readonly StudioBlock[]): Set<string> {
  const cells = new Set<string>();
  for (const block of blocks) {
    if (!block.placement) continue;
    for (let y = block.placement.y; y < block.placement.y + block.placement.h; y += 1) {
      for (let x = block.placement.x; x < block.placement.x + block.placement.w; x += 1) {
        cells.add(`${x}:${y}`);
      }
    }
  }
  return cells;
}

export function hasIsolatedHole(blocks: readonly StudioBlock[]): boolean {
  const cells = occupiedCells(blocks);
  const maxY = Math.max(
    0,
    ...blocks.map((block) => (block.placement?.y ?? 0) + (block.placement?.h ?? 1)),
  );
  for (let y = 1; y < maxY - 1; y += 1) {
    for (let x = 0; x < BENTO_COLUMNS; x += 1) {
      if (cells.has(`${x}:${y}`)) continue;
      const above = cells.has(`${x}:${y - 1}`);
      const below = cells.has(`${x}:${y + 1}`);
      const left = x === 0 || cells.has(`${x - 1}:${y}`);
      const right = x === BENTO_COLUMNS - 1 || cells.has(`${x + 1}:${y}`);
      if (above && below && left && right) return true;
    }
  }
  return false;
}

export function fullWidthCount(blocks: readonly StudioBlock[]): number {
  return blocks.filter((block) => block.type !== 'DIVIDER' && block.placement?.w === BENTO_COLUMNS)
    .length;
}

function downgradeExtraFullWidth(blocks: readonly StudioBlock[]): StudioBlock[] {
  const result = blocks.map((block) => ({
    ...block,
    placement: block.placement ? { ...block.placement } : null,
  }));
  while (fullWidthCount(result) > 3) {
    const candidate = result
      .filter((block) => block.type !== 'DIVIDER' && block.placement?.w === BENTO_COLUMNS)
      .sort((a, b) => a.placement!.h - b.placement!.h || a.id.localeCompare(b.id))[0];
    if (!candidate?.placement) break;
    candidate.placement.w = Math.max(2, MIN_COLS_BY_TYPE[candidate.type]);
  }
  return result;
}

function firstFit(blocks: readonly StudioBlock[]): PositionedStudioBlock[] {
  const placed: PositionedStudioBlock[] = [];
  for (const [position, source] of blocks.entries()) {
    const minimum = minimumPlacement(source);
    const sourcePlacement = source.placement ?? minimum;
    const shape = clampToBounds({
      x: 0,
      y: 0,
      w: Math.max(minimum.w, sourcePlacement.w),
      h: Math.max(minimum.h, sourcePlacement.h),
    });
    let placement = shape;
    let found = false;
    for (let y = 0; y < 1000 && !found; y += 1) {
      for (let x = 0; x <= BENTO_COLUMNS - shape.w; x += 1) {
        const candidate = { ...shape, x, y };
        if (!placed.some((block) => overlaps(candidate, block.placement))) {
          placement = candidate;
          found = true;
          break;
        }
      }
    }
    placed.push({ ...source, position, placement });
  }
  return compact(placed) as PositionedStudioBlock[];
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  return result;
}

export function bentoConstraintsSatisfied(blocks: readonly StudioBlock[]): boolean {
  return !hasOverlap(blocks) && !hasIsolatedHole(blocks) && fullWidthCount(blocks) <= 3;
}

/** Random legal arrangement. The optional RNG keeps unit tests deterministic. */
export function randomizeBentoLayout(
  blocks: readonly StudioBlock[],
  random: () => number = Math.random,
): PositionedStudioBlock[] {
  const prepared = downgradeExtraFullWidth(
    normalizeBentoLayout(blocks.map((block, position) => ({ ...block, position }))),
  );
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = firstFit(shuffled(prepared, random));
    if (bentoConstraintsSatisfied(candidate)) return candidate;
  }
  return tidyBentoLayout(prepared);
}

function rhythmRank(block: StudioBlock): number {
  if (block.type === 'LINK' || block.type === 'IMAGE') return 0;
  if (block.type === 'SOCIAL') return 3;
  if (block.type === 'DIVIDER') return 2;
  return 1;
}

export function tidyBentoLayout(blocks: readonly StudioBlock[]): PositionedStudioBlock[] {
  const prepared = downgradeExtraFullWidth(
    normalizeBentoLayout(blocks.map((block, position) => ({ ...block, position }))),
  );
  const ordered = prepared
    .map((block, index) => ({ block, index }))
    .sort((a, b) => rhythmRank(a.block) - rhythmRank(b.block) || a.index - b.index)
    .map(({ block }) => block);
  return firstFit(ordered);
}

export type BentoGuardrailWarning = 'ADJACENT_FULL' | 'NO_FOCUS' | 'BOTTOM_HOLE';

export function detectBentoGuardrails(blocks: readonly StudioBlock[]): BentoGuardrailWarning[] {
  const ordered = [...blocks].sort(
    (a, b) =>
      (a.placement?.y ?? 0) - (b.placement?.y ?? 0) ||
      (a.placement?.x ?? 0) - (b.placement?.x ?? 0),
  );
  const warnings: BentoGuardrailWarning[] = [];
  if (
    ordered.some(
      (block, index) => block.placement?.w === 4 && ordered[index + 1]?.placement?.w === 4,
    )
  ) {
    warnings.push('ADJACENT_FULL');
  }
  if (
    !ordered.some(
      (block) =>
        (block.placement?.y ?? 99) < 12 && block.placement?.w === 4 && block.type !== 'DIVIDER',
    )
  ) {
    warnings.push('NO_FOCUS');
  }
  const cells = occupiedCells(ordered);
  const maxY = Math.max(
    0,
    ...ordered.map((block) => (block.placement?.y ?? 0) + (block.placement?.h ?? 1)),
  );
  const bottomOccupied = Array.from({ length: BENTO_COLUMNS }, (_, x) =>
    cells.has(`${x}:${maxY - 1}`),
  ).filter(Boolean).length;
  if (bottomOccupied > 0 && bottomOccupied < BENTO_COLUMNS) warnings.push('BOTTOM_HOLE');
  return warnings;
}

export function publishingBlocker(blocks: readonly StudioBlock[]): StudioBlock | null {
  return (
    blocks.find((block) => {
      if (!block.isVisible || !block.placement) return false;
      if (block.type === 'QR') return block.placement.w < 2 || block.placement.h < 4;
      if (block.type === 'WECHAT') return block.placement.w < 2 || block.placement.h < 2;
      return false;
    }) ?? null
  );
}
