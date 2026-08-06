import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock('../../../../lib/auth', () => ({ auth: authMock }));

import { db } from '../../../../lib/db';
import { GET, POST } from './route';

const userId = 'pages-user';

async function clearDatabase() {
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

async function createUser(id = userId) {
  return db.user.create({
    data: {
      id,
      email: `${id}@example.com`,
    },
  });
}

function createPageRequest(body: unknown) {
  return new Request('http://localhost/api/v1/pages', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('/api/v1/pages', () => {
  beforeEach(async () => {
    await clearDatabase();
    await createUser();
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: userId } });
  });

  it('creates a page with a valid slug', async () => {
    const response = await POST(
      createPageRequest({ slug: 'my-page', title: '我的主页', templateId: 'creator' }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      page: {
        userId,
        slug: 'my-page',
        title: '我的主页',
        templateId: 'creator',
        status: 'DRAFT',
      },
    });
  });

  it('rejects an invalid slug', async () => {
    const response = await POST(createPageRequest({ slug: 'Not Valid', title: '我的主页' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('rejects a reserved slug', async () => {
    const response = await POST(createPageRequest({ slug: 'admin', title: '我的主页' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('reports a global duplicate slug as SLUG_TAKEN', async () => {
    const otherUser = await createUser('other-user');
    await db.page.create({
      data: { userId: otherUser.id, slug: 'already-taken', title: '别人的主页' },
    });

    const response = await POST(createPageRequest({ slug: 'already-taken', title: '我的主页' }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'SLUG_TAKEN' },
    });
  });

  it('enforces the FREE page limit', async () => {
    await db.page.createMany({
      data: [
        { userId, slug: 'page-one', title: '页面一' },
        { userId, slug: 'page-two', title: '页面二' },
        { userId, slug: 'page-three', title: '页面三' },
      ],
    });

    const response = await POST(createPageRequest({ slug: 'page-four', title: '页面四' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'PAGE_LIMIT' },
    });
  });

  it('allows a PRO_MINI user to create a fourth page', async () => {
    await db.user.update({
      where: { id: userId },
      data: { plan: 'PRO_MINI' },
    });
    await db.page.createMany({
      data: [
        { userId, slug: 'mini-page-one', title: '页面一' },
        { userId, slug: 'mini-page-two', title: '页面二' },
        { userId, slug: 'mini-page-three', title: '页面三' },
      ],
    });

    const response = await POST(createPageRequest({ slug: 'mini-page-four', title: '页面四' }));

    expect(response.status).toBe(201);
  });

  it('does not count soft-deleted pages against the page limit', async () => {
    await db.page.createMany({
      data: [
        { userId, slug: 'active-one', title: '页面一' },
        { userId, slug: 'active-two', title: '页面二' },
        { userId, slug: 'deleted-three', title: '已删除', deletedAt: new Date() },
      ],
    });

    const response = await POST(createPageRequest({ slug: 'replacement-page', title: '替代页面' }));

    expect(response.status).toBe(201);
  });

  it('lists only the current user pages with block counts', async () => {
    const ownPage = await db.page.create({
      data: { userId, slug: 'own-page', title: '我的页面' },
    });
    await db.block.create({
      data: {
        pageId: ownPage.id,
        type: 'DIVIDER',
        size: 'MD',
        isVisible: true,
        position: 0,
        config: {},
      },
    });
    const otherUser = await createUser('list-other-user');
    await db.page.create({
      data: { userId: otherUser.id, slug: 'other-page', title: '别人的页面' },
    });
    await db.page.create({
      data: {
        userId,
        slug: 'deleted-own-page',
        title: '已删除页面',
        deletedAt: new Date(),
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pages).toEqual([
      expect.objectContaining({ id: ownPage.id, _count: { blocks: 1 } }),
    ]);
  });
});
