import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock('../../../../../../lib/auth', () => ({ auth: authMock }));

import { db } from '../../../../../../lib/db';
import { addUtcDays, startOfUtcDay } from '../../../../../../lib/stats';
import { GET } from './route';

const userId = 'stats-owner';

async function clearDatabase() {
  await db.clickEvent.deleteMany();
  await db.dailyStat.deleteMany();
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

  it('merges the prior daily aggregates with today\'s live events over the latest 30 days', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'stats-page', title: '统计主页' },
    });
    const today = startOfUtcDay(new Date());
    const yesterday = addUtcDays(today, -1);
    const expiredDay = addUtcDays(today, -30);

    await db.dailyStat.createMany({
      data: [
        { pageId: page.id, date: yesterday, views: 10, uniques: 3, clicks: 2 },
        { pageId: page.id, date: expiredDay, views: 100, uniques: 100, clicks: 100 },
      ],
    });
    await db.clickEvent.createMany({
      data: [
        { id: 1n, pageId: page.id, kind: 'VIEW', tsBucket: today, ipHash: 'today-a' },
        { id: 2n, pageId: page.id, kind: 'VIEW', tsBucket: today, ipHash: 'today-a' },
        { id: 3n, pageId: page.id, kind: 'CLICK', tsBucket: today, ipHash: 'today-b' },
      ],
    });

    const response = await GET(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      views: 12,
      uniques: 5,
      clicks: 3,
      daily: [
        { date: yesterday.toISOString(), views: 10, uniques: 3, clicks: 2 },
        { date: today.toISOString(), views: 2, uniques: 2, clicks: 1 },
      ],
    });
  });

  it('keeps the established empty report shape when an owned page has no events', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'empty-stats-page', title: '空统计主页' },
    });

    const response = await GET(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ views: 0, uniques: 0, clicks: 0, daily: [] });
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
