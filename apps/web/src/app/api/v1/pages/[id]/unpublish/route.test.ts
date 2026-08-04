import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, revalidateTagMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock('../../../../../../lib/auth', () => ({ auth: authMock }));
vi.mock('next/cache', () => ({ revalidateTag: revalidateTagMock }));

import { db } from '../../../../../../lib/db';
import { POST } from './route';

const userId = 'unpublish-owner';

async function clearDatabase() {
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

function pageContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('/api/v1/pages/:id/unpublish', () => {
  beforeEach(async () => {
    await clearDatabase();
    await db.user.create({ data: { id: userId, email: 'unpublish@example.com' } });
    authMock.mockReset();
    revalidateTagMock.mockReset();
    authMock.mockResolvedValue({ user: { id: userId } });
  });

  it('sets an owned page back to DRAFT and invalidates its cache tag', async () => {
    const page = await db.page.create({
      data: {
        userId,
        slug: 'published-page',
        title: '已发布主页',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    const response = await POST(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: { id: page.id, status: 'DRAFT' },
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('page:published-page', 'max');
  });

  it('returns 404 and does not invalidate cache for another user page', async () => {
    const otherUser = await db.user.create({
      data: { id: 'unpublish-other', email: 'unpublish-other@example.com' },
    });
    const page = await db.page.create({
      data: { userId: otherUser.id, slug: 'other-unpublish-page', title: '其他主页' },
    });

    const response = await POST(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(404);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });
});
