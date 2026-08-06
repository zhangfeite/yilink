import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAuthSecretError } from './auth-validation';

const originalAuthSecret = process.env.AUTH_SECRET;
const originalNodeEnv = process.env.NODE_ENV;
const originalNextPhase = process.env.NEXT_PHASE;

function restoreEnvironment(
  name: 'AUTH_SECRET' | 'NODE_ENV' | 'NEXT_PHASE',
  value: string | undefined,
) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) {
    delete env[name];
  } else {
    env[name] = value;
  }
}

describe('production AUTH_SECRET validation', () => {
  afterEach(() => {
    restoreEnvironment('AUTH_SECRET', originalAuthSecret);
    restoreEnvironment('NODE_ENV', originalNodeEnv);
    restoreEnvironment('NEXT_PHASE', originalNextPhase);
    vi.resetModules();
  });

  it('does not enforce a production secret in local development', () => {
    expect(getAuthSecretError({ nodeEnv: 'development' })).toBeNull();
  });

  it('defers validation during a production build', () => {
    expect(
      getAuthSecretError({
        nodeEnv: 'production',
        nextPhase: 'phase-production-build',
      }),
    ).toBeNull();
  });

  it('rejects a missing production secret', () => {
    expect(getAuthSecretError({ nodeEnv: 'production' })).toBe(
      'AUTH_SECRET is required in production.',
    );
  });

  it('rejects a production secret shorter than 32 bytes', () => {
    expect(getAuthSecretError({ secret: 'too-short', nodeEnv: 'production' })).toBe(
      'AUTH_SECRET must be at least 32 bytes in production.',
    );
  });

  it('rejects the local development placeholder', () => {
    expect(getAuthSecretError({ secret: 'local-dev-only', nodeEnv: 'production' })).toBe(
      'AUTH_SECRET must not use a development placeholder in production.',
    );
  });

  it('rejects the Docker Compose placeholder', () => {
    expect(
      getAuthSecretError({
        secret: 'change-this-development-secret-before-production',
        nodeEnv: 'production',
      }),
    ).toBe('AUTH_SECRET must not use a development placeholder in production.');
  });

  it('accepts a sufficiently long production secret', () => {
    expect(
      getAuthSecretError({
        secret: 'a-production-secret-that-is-at-least-32-bytes',
        nodeEnv: 'production',
      }),
    ).toBeNull();
  });

  it('fails while the authentication module initializes for a production request', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.AUTH_SECRET = 'local-dev-only';
    delete process.env.NEXT_PHASE;
    vi.resetModules();

    await expect(import('./auth-validation')).rejects.toThrow(
      'AUTH_SECRET must not use a development placeholder in production.',
    );
  });
});
