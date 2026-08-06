import { describe, expect, it } from 'vitest';

import { PLAN_LIMITS, PLAN_NAMES_ZH, PLAN_QUOTA_NOTE_ZH } from './plan';

describe('plan definitions', () => {
  it('defines the page quota for every lifetime plan', () => {
    expect(PLAN_LIMITS).toEqual({
      FREE: { pages: 3 },
      PRO_MINI: { pages: 10 },
      PRO: { pages: 50 },
    });
  });

  it('keeps the complete lifetime plan finite at 50 pages', () => {
    expect(PLAN_LIMITS.PRO.pages).toBe(50);
    expect(Number.isFinite(PLAN_LIMITS.PRO.pages)).toBe(true);
  });

  it('allows the last PRO page and rejects the next one', () => {
    const canCreatePage = (pageCount: number) => pageCount < PLAN_LIMITS.PRO.pages;

    expect(canCreatePage(49)).toBe(true);
    expect(canCreatePage(50)).toBe(false);
  });

  it('provides Chinese plan names for account surfaces', () => {
    expect(PLAN_NAMES_ZH).toEqual({
      FREE: '免费版',
      PRO_MINI: '基础买断',
      PRO: '完整买断',
    });
  });

  it('exports the shared fair-use note verbatim', () => {
    expect(PLAN_QUOTA_NOTE_ZH).toBe('配额与合理使用限制见文档，防滥用不防真实使用');
  });
});
