import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock('../../../../../lib/auth', () => ({ auth: authMock }));

import { db } from '../../../../../lib/db';
import { DELETE, GET, PATCH } from './route';

const userId = 'page-owner';
const otherUserId = 'page-other-user';

async function clearDatabase() {
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

async function createUser(id: string) {
  return db.user.create({ data: { id, email: `${id}@example.com` } });
}

function pageContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('/api/v1/pages/:id', () => {
  beforeEach(async () => {
    await clearDatabase();
    await createUser(userId);
    await createUser(otherUserId);
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: userId } });
  });

  it('returns an owned page', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'owned-page', title: '我的主页' },
    });

    const response = await GET(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: { id: page.id, slug: 'owned-page', title: '我的主页' },
    });
  });

  it('updates editable metadata and ctaConfig', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'editable-page', title: '旧标题' },
    });
    const response = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: '新标题',
          bio: '新的简介',
          avatarUrl: 'https://example.com/avatar.png',
          layout: 'GRID',
          themeId: 'warm',
          seoTitle: 'SEO 标题',
          seoDesc: 'SEO 描述',
          ctaConfig: { type: 'link', label: '访问官网', value: 'https://example.com' },
        }),
      }),
      pageContext(page.id),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: {
        id: page.id,
        title: '新标题',
        bio: '新的简介',
        avatarUrl: 'https://example.com/avatar.png',
        layout: 'GRID',
        themeId: 'warm',
        seoTitle: 'SEO 标题',
        seoDesc: 'SEO 描述',
        ctaConfig: { type: 'link', label: '访问官网', value: 'https://example.com' },
      },
    });
  });

  it('rejects invalid editable metadata', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'invalid-update', title: '旧标题' },
    });
    const response = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ctaConfig: { type: 'link', label: '', value: '' } }),
      }),
      pageContext(page.id),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('returns 404 for another user page without disclosing it', async () => {
    const page = await db.page.create({
      data: { userId: otherUserId, slug: 'other-user-page', title: '其他用户的主页' },
    });

    const response = await GET(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });

  it('deletes an owned page', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'delete-page', title: '待删除主页' },
    });

    const response = await DELETE(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(204);
    await expect(db.page.findUnique({ where: { id: page.id } })).resolves.toBeNull();
  });
});
