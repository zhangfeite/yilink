import { describe, expect, it } from 'vitest';

import { feedbackMailto } from './feedback-link';

describe('feedbackMailto', () => {
  it('includes only the intended diagnostics', () => {
    const href = decodeURIComponent(feedbackMailto('page-1', 'Test UA', '/studio/page-1'));
    expect(href).toContain('mailto:report@yilink.app?subject=一链反馈');
    expect(href).toContain('页面 ID：page-1');
    expect(href).toContain('浏览器：Test UA');
    expect(href).toContain('路径：/studio/page-1');
  });
});
