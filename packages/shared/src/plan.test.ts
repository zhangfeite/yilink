import { describe, expect, it } from 'vitest';

import { PLAN_LIMITS, PLAN_NAMES_ZH } from './plan';

describe('plan definitions', () => {
  it('defines the page quota for every lifetime plan', () => {
    expect(PLAN_LIMITS).toEqual({
      FREE: { pages: 3 },
      PRO_MINI: { pages: 10 },
      PRO: { pages: Infinity },
    });
  });

  it('provides Chinese plan names for account surfaces', () => {
    expect(PLAN_NAMES_ZH).toEqual({
      FREE: '免费版',
      PRO_MINI: '基础买断',
      PRO: '完整买断',
    });
  });
});
