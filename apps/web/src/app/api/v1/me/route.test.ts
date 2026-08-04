import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock('../../../../lib/auth', () => ({ auth: authMock }));

import { db } from '../../../../lib/db';
import { GET, PATCH } from './route';

const userId = 'me-user';

async function clearDatabase() {
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

async function createUser() {
  return db.user.create({
    data: {
      id: userId,
      email: 'me@example.com',
      name: '原始名字',
    },
  });
}

describe('/api/v1/me', () => {
  beforeEach(async () => {
    await clearDatabase();
    authMock.mockReset();
  });

  it('returns UNAUTHORIZED when no session exists', async () => {
    authMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'UNAUTHORIZED', message: '请先登录' },
    });
  });

  it('returns the current user fields', async () => {
    await createUser();
    authMock.mockResolvedValue({ user: { id: userId } });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        id: userId,
        email: 'me@example.com',
        name: '原始名字',
        plan: 'FREE',
      },
    });
  });

  it('updates a name between 1 and 30 characters', async () => {
    await createUser();
    authMock.mockResolvedValue({ user: { id: userId } });

    const response = await PATCH(
      new Request('http://localhost/api/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: '更新后的名字' }),
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: { id: userId, name: '更新后的名字' },
    });
  });

  it('rejects an invalid name', async () => {
    await createUser();
    authMock.mockResolvedValue({ user: { id: userId } });

    const response = await PATCH(
      new Request('http://localhost/api/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: '' }),
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'INVALID_INPUT', message: '请求参数无效' },
    });
  });
});
