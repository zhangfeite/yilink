import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '../../../../lib/db';
import { POST } from './route';

const originalCronSecret = process.env.CRON_SECRET;
const cronSecret = 'rollup-test-secret';

async function clearDatabase() {
  await db.clickEvent.deleteMany();
  await db.dailyStat.deleteMany();
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

function request(authorization?: string): Request {
  return new Request('http://localhost/api/internal/rollup', {
    method: 'POST',
    headers: authorization ? { authorization } : undefined,
  });
}

describe('POST /api/internal/rollup', () => {
  beforeEach(async () => {
    await clearDatabase();
    process.env.CRON_SECRET = cronSecret;
  });

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it('runs the daily rollup when the bearer secret is correct', async () => {
    const response = await POST(request(`Bearer ${cronSecret}`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      rolledUpPages: 0,
      deletedEvents: 0,
    });
  });

  it('rejects missing and incorrect bearer secrets', async () => {
    const [missing, incorrect] = await Promise.all([
      POST(request()),
      POST(request('Bearer incorrect-secret')),
    ]);

    expect(missing.status).toBe(401);
    expect(incorrect.status).toBe(401);
  });

  it('returns 503 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false });
  });
});
