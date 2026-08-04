export type Plan = 'FREE' | 'PRO_MINI' | 'PRO';

export const PLAN_LIMITS = {
  FREE: { pages: 3 },
  PRO_MINI: { pages: 10 },
  PRO: { pages: Infinity },
} as const satisfies Record<Plan, { pages: number }>;

export const PLAN_NAMES_ZH = {
  FREE: '免费版',
  PRO_MINI: '基础买断',
  PRO: '完整买断',
} as const satisfies Record<Plan, string>;
