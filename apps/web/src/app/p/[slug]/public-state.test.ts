import { describe, expect, it } from 'vitest';

import { publicPageDisposition } from './public-state';

describe('public page disposition', () => {
  it('maps REVIEW and HIDDEN to the same neutral unavailable path', () => {
    expect(publicPageDisposition('REVIEW')).toBe('unavailable');
    expect(publicPageDisposition('HIDDEN')).toBe('unavailable');
  });

  it('keeps DRAFT on the not-ready path and PUBLISHED on the public path', () => {
    expect(publicPageDisposition('DRAFT')).toBe('draft');
    expect(publicPageDisposition('PUBLISHED')).toBe('published');
  });

  it('treats deleted pages as missing regardless of their retained status', () => {
    expect(publicPageDisposition('PUBLISHED', new Date())).toBe('missing');
    expect(publicPageDisposition('REVIEW', new Date())).toBe('missing');
  });
});
