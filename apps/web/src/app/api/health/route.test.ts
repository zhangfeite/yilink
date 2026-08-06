import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

afterEach(() => {
  vi.doUnmock('../../../lib/db');
  vi.resetModules();
});

describe('GET /api/health', () => {
  it('returns ready after a lightweight database read', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, version: '0.1.0' });
  });

  it('returns 503 when the database read fails', async () => {
    vi.doMock('../../../lib/db', () => ({
      db: {
        $queryRaw: async () => {
          throw new Error('database unavailable');
        },
      },
    }));
    const { GET: failedDatabaseHealthCheck } = await import('./route');

    const response = await failedDatabaseHealthCheck();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false });
  });
});
