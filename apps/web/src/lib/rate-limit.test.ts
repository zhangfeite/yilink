import { beforeEach, describe, expect, it } from 'vitest';

import { allowAttempt, LOGIN_RULE, rateLimitSubject, REGISTER_RULE, resetRateLimit } from './rate-limit';

describe('allowAttempt', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it('allows attempts up to the limit and rejects the next one', () => {
    const now = 1_000_000;
    for (let attempt = 0; attempt < LOGIN_RULE.limit; attempt += 1) {
      expect(allowAttempt('login-ip', '1.2.3.4', LOGIN_RULE, now + attempt)).toBe(true);
    }
    expect(allowAttempt('login-ip', '1.2.3.4', LOGIN_RULE, now + LOGIN_RULE.limit)).toBe(false);
  });

  it('resets the bucket after the window elapses', () => {
    const now = 1_000_000;
    for (let attempt = 0; attempt < LOGIN_RULE.limit; attempt += 1) {
      allowAttempt('login-ip', '1.2.3.4', LOGIN_RULE, now);
    }
    expect(allowAttempt('login-ip', '1.2.3.4', LOGIN_RULE, now)).toBe(false);
    expect(allowAttempt('login-ip', '1.2.3.4', LOGIN_RULE, now + LOGIN_RULE.windowMs)).toBe(true);
  });

  it('scopes buckets by scope and key independently', () => {
    const now = 1_000_000;
    for (let attempt = 0; attempt < LOGIN_RULE.limit; attempt += 1) {
      allowAttempt('login-ip', '1.2.3.4', LOGIN_RULE, now);
    }
    expect(allowAttempt('login-ip', '1.2.3.4', LOGIN_RULE, now)).toBe(false);
    // 另一 IP、另一 scope 都不受影响
    expect(allowAttempt('login-ip', '5.6.7.8', LOGIN_RULE, now)).toBe(true);
    expect(allowAttempt('register-ip', '1.2.3.4', REGISTER_RULE, now)).toBe(true);
  });

  it('merges header-less callers into one shared, still-limited subject', () => {
    expect(rateLimitSubject(undefined)).toBe('unknown');
    const headers = new Headers({ 'cf-connecting-ip': '9.9.9.9' });
    expect(rateLimitSubject(headers)).toBe('9.9.9.9');
  });
});
