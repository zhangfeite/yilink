import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock('../../../../../../lib/auth', () => ({ auth: authMock }));

import { db } from '../../../../../../lib/db';
import { GET } from './route';

const userId = 'stats-owner';

async function clearDatabase() {
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

function pageContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('/api/v1/pages/:id/stats', () => {
  beforeEach(async () => {
    await clearDatabase();
    await db.user.create({ data: { id: userId, email: 'stats@example.com' } });
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: userId } });
  });

  it('returns the fixed wave placeholder shape for an owned page', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'stats-page', title: '统计主页' },
    });

    const response = await GET(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      views: 0,
      uniques: 0,
      clicks: 0,
      daily: [],
    });
  });

  it('returns 404 for an inaccessible page', async () => {
    const otherUser = await db.user.create({
      data: { id: 'stats-other', email: 'stats-other@example.com' },
    });
    const page = await db.page.create({
      data: { userId: otherUser.id, slug: 'other-stats-page', title: '其他统计主页' },
    });

    const response = await GET(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(404);
  });
});
