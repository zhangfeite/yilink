import {
  BENTO_COLUMNS,
  compact,
  firstFitFallback,
  type BentoBlock,
  type BentoPlacement,
} from '@yilink/shared';
import type { ReactNode } from 'react';


/**
 * BENTO 自由布局的公开页渲染：服务端算好矩形，输出 CSS 变量 + CSS Grid 直出。
 * 无 'use client'、零框架 JS 增量——布局能力不进浏览器（plan-free-layout §三）。
 */

export interface BentoRenderBlock {
  id: string;
  type: BentoBlock['type'];
  placement: BentoPlacement | null;
  node: ReactNode;
}

/** 主题 gap 派生行高单位，使 h=4 恒为 84px（gap=12→12px，gap=14→10.5px）。 */
export function bentoRowUnit(gap: string | undefined): string {
  const parsed = Number.parseFloat(gap ?? '');
  if (!Number.isFinite(parsed) || parsed <= 0) return '12px';
  // h=4 时高度 = 4*u + 3*gap = 84 → u = (84 - 3*gap) / 4
  const unit = (84 - 3 * parsed) / 4;
  return unit > 0 ? `${Math.round(unit * 100) / 100}px` : '12px';
}

interface EngineBlock extends BentoBlock {
  id: string;
}

/**
 * 可见性与 CTA 去重发生在渲染前，会在网格里留洞，故此处必须重新压紧；
 * placement 缺失或非法时整页退回 first-fit 通栏安全布局，绝不重叠、绝不抛错。
 */
export function resolveBentoLayout(blocks: readonly BentoRenderBlock[]): BentoRenderBlock[] {
  if (blocks.length === 0) return [];

  const hasInvalid = blocks.some((block) => {
    const p = block.placement;
    if (!p) return true;
    return (
      !Number.isInteger(p.x) ||
      !Number.isInteger(p.y) ||
      !Number.isInteger(p.w) ||
      !Number.isInteger(p.h) ||
      p.x < 0 ||
      p.y < 0 ||
      p.w < 1 ||
      p.h < 1 ||
      p.x + p.w > BENTO_COLUMNS
    );
  });

  const engineInput: EngineBlock[] = blocks.map((block, index) => ({
    id: block.id,
    type: block.type,
    position: index,
    size: 'MD',
    placement: block.placement ?? { x: 0, y: index, w: BENTO_COLUMNS, h: 4 },
  }));

  const resolved = hasInvalid ? firstFitFallback(engineInput) : compact(engineInput);
  const byId = new Map(resolved.map((block) => [block.id, block.placement]));

  return blocks.map((block) => ({
    ...block,
    placement: byId.get(block.id) ?? block.placement,
  }));
}

/** Prisma Json → BentoPlacement；非法结构返回 null 交由 firstFit 兜底。 */
export function parsePlacement(value: unknown): BentoPlacement | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const { x, y, w, h } = record;
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof w !== 'number' ||
    typeof h !== 'number'
  ) {
    return null;
  }
  return { x, y, w, h };
}
