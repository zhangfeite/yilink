import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/lib/db';

import { POST } from './route';

const originalInviteCodes = process.env.INVITE_CODES;

async function clearDatabase() {
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

function registerRequest(body: unknown) {
  return new Request('http://localhost/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function restoreInviteCodes() {
  if (originalInviteCodes === undefined) {
    delete process.env.INVITE_CODES;
  } else {
    process.env.INVITE_CODES = originalInviteCodes;
  }
}

describe('POST /api/v1/auth/register', () => {
  beforeEach(async () => {
    await clearDatabase();
    delete process.env.INVITE_CODES;
  });

  afterAll(restoreInviteCodes);

  it('keeps registration open when no invitation table is configured', async () => {
    const response = await POST(
      registerRequest({ email: 'open@example.com', password: 'password-with-8-chars' }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      user: { email: 'open@example.com' },
    });
  });

  it('returns INVITE_INVALID when a required invitation code is missing', async () => {
    process.env.INVITE_CODES = 'alpha';

    const response = await POST(
      registerRequest({ email: 'missing-invite@example.com', password: 'password-with-8-chars' }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'INVITE_INVALID', message: '邀请码无效' },
    });
    await expect(db.user.count()).resolves.toBe(0);
  });

  it('returns INVITE_INVALID when the invitation code is not configured', async () => {
    process.env.INVITE_CODES = 'alpha';

    const response = await POST(
      registerRequest({
        email: 'wrong-invite@example.com',
        password: 'password-with-8-chars',
        inviteCode: 'not-alpha',
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'INVITE_INVALID', message: '邀请码无效' },
    });
  });

  it('accepts a configured code regardless of case and surrounding whitespace', async () => {
    process.env.INVITE_CODES = ' Alpha ';

    const response = await POST(
      registerRequest({
        email: 'invited@example.com',
        password: 'password-with-8-chars',
        inviteCode: '  aLpHa  ',
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      user: { email: 'invited@example.com' },
    });
  });

  it('keeps duplicate-email responses limited to the already-registered message', async () => {
    const input = { email: 'duplicate@example.com', password: 'password-with-8-chars' };
    await POST(registerRequest(input));

    const response = await POST(registerRequest(input));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'EMAIL_EXISTS', message: '该邮箱已注册' },
    });
  });
});
