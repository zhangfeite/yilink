import { z } from 'zod';

export const BENTO_COLUMNS = 4;

export interface BentoPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type BentoBlockType =
  | 'LINK'
  | 'SOCIAL'
  | 'TEXT'
  | 'IMAGE'
  | 'WECHAT'
  | 'QR'
  | 'DIVIDER';

export interface BentoBlock {
  type: BentoBlockType;
  position: number;
  placement?: BentoPlacement | null;
  size?: 'SM' | 'MD' | 'LG';
  [key: string]: unknown;
}

export type NormalizedBentoBlock<T extends BentoBlock> = Omit<T, 'placement' | 'position' | 'size'> & {
  placement: BentoPlacement;
  position: number;
  size: 'SM' | 'MD' | 'LG';
};

const placementShape = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(BENTO_COLUMNS),
  h: z.number().int().min(1),
});

export const bentoPlacementSchema = placementShape.refine(
  ({ x, w }) => x + w <= BENTO_COLUMNS,
  'Placement extends beyond the bento grid',
);

export const MIN_ROWS_BY_TYPE: Record<BentoBlockType, number> = {
  LINK: 1,
  TEXT: 1,
  SOCIAL: 1,
  WECHAT: 1,
  QR: 1,
  IMAGE: 1,
  DIVIDER: 1,
};

export const MIN_COLS_BY_TYPE: Record<BentoBlockType, number> = {
  LINK: 2,
  TEXT: 2,
  SOCIAL: 2,
  WECHAT: 2,
  QR: 2,
  IMAGE: 1,
  DIVIDER: 4,
};

export function overlaps(a: BentoPlacement, b: BentoPlacement): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function clampToBounds(p: BentoPlacement): BentoPlacement {
  const w = Math.min(BENTO_COLUMNS, Math.max(1, Math.trunc(p.w)));
  return {
    x: Math.min(BENTO_COLUMNS - w, Math.max(0, Math.trunc(p.x))),
    y: Math.max(0, Math.trunc(p.y)),
    w,
    h: Math.max(1, Math.trunc(p.h)),
  };
}

function constrainedPlacement(block: BentoBlock): BentoPlacement {
  const minW = MIN_COLS_BY_TYPE[block.type];
  const minH = MIN_ROWS_BY_TYPE[block.type];
  const source = block.placement ?? { x: 0, y: Math.max(0, block.position), w: BENTO_COLUMNS, h: 1 };
  if (block.type === 'DIVIDER') return { x: 0, y: Math.max(0, Math.trunc(source.y)), w: 4, h: 1 };
  return clampToBounds({ ...source, w: Math.max(minW, source.w), h: Math.max(minH, source.h) });
}

function cloneWithPlacement<T extends BentoBlock>(blocks: readonly T[]): T[] {
  return blocks.map((block) => ({ ...block, placement: constrainedPlacement(block) }));
}

/** Moves the selected block and every block it collides with down deterministically. */
export function pushDown<T extends BentoBlock>(blocks: readonly T[], movedIndex: number): T[] {
  const result = cloneWithPlacement(blocks);
  if (!result[movedIndex]) return result;
  const queue = [movedIndex];
  const queued = new Set(queue);
  while (queue.length) {
    const currentIndex = queue.shift()!;
    const current = result[currentIndex].placement!;
    for (let index = 0; index < result.length; index += 1) {
      if (index === currentIndex || !overlaps(current, result[index].placement!)) continue;
      const candidate = result[index];
      candidate.placement = { ...candidate.placement!, y: current.y + current.h };
      if (!queued.has(index)) {
        queue.push(index);
        queued.add(index);
      }
    }
  }
  return result;
}

/** Removes vertical gaps without changing the stable reading order of overlapping peers. */
export function compact<T extends BentoBlock>(blocks: readonly T[]): T[] {
  const result = cloneWithPlacement(blocks);
  const ordered = result
    .map((block, index) => ({ block, index }))
    .sort((a, b) => a.block.placement!.y - b.block.placement!.y || a.block.placement!.x - b.block.placement!.x || a.block.position - b.block.position || a.index - b.index);
  const placed: T[] = [];
  for (const { block } of ordered) {
    let y = 0;
    while (placed.some((other) => overlaps({ ...block.placement!, y }, other.placement!))) y += 1;
    block.placement = { ...block.placement!, y };
    placed.push(block);
  }
  return result;
}

function legacySize(placement: BentoPlacement): 'SM' | 'MD' | 'LG' {
  if (placement.w >= BENTO_COLUMNS) return 'LG';
  return placement.h <= 1 ? 'SM' : 'MD';
}

/** Canonical, idempotent layout used by both editor and server-side validation. */
export function normalizeBentoLayout<T extends BentoBlock>(
  blocks: readonly T[],
): NormalizedBentoBlock<T>[] {
  let result = cloneWithPlacement(blocks);
  const order = result
    .map((block, index) => ({ block, index }))
    .sort((a, b) => a.block.placement!.y - b.block.placement!.y || a.block.placement!.x - b.block.placement!.x || a.block.position - b.block.position || a.index - b.index);
  result = order.map(({ block }) => block);
  for (let index = 0; index < result.length; index += 1) result = pushDown(result, index);
  result = compact(result);
  return result
    .map((block, index) => ({ ...block, size: legacySize(block.placement!), position: index }))
    .sort((a, b) => a.position - b.position) as NormalizedBentoBlock<T>[];
}

/** Safe legacy fallback for missing or malformed placements. */
export function firstFitFallback<T extends BentoBlock>(blocks: readonly T[]): T[] {
  return [...blocks]
    .sort((a, b) => a.position - b.position)
    .map((block, index) => ({
      ...block,
      placement: { x: 0, y: index, w: BENTO_COLUMNS, h: 1 },
      size: 'LG' as const,
      position: index,
    }));
}
