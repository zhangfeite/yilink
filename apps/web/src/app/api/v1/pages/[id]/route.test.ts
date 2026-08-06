import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, moderationCheckMock, revalidateTagMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  moderationCheckMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock('../../../../../lib/auth', () => ({ auth: authMock }));
vi.mock('../../../../../lib/moderation', () => ({
  moderatePageContent: moderationCheckMock,
  pageModerationRecordData: (pageId: string, result: { verdict: string; labels: string[] }) => ({
    targetType: 'page',
    targetId: pageId,
    provider: 'local-words+url-blocklist',
    verdict: result.verdict,
    detail: { labels: result.labels },
  }),
}));
vi.mock('next/cache', () => ({ revalidateTag: revalidateTagMock }));

import { db } from '../../../../../lib/db';
import { DELETE, GET, PATCH } from './route';

const userId = 'page-owner';
const otherUserId = 'page-other-user';

async function clearDatabase() {
  await db.moderationRecord.deleteMany();
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
    moderationCheckMock.mockReset();
    revalidateTagMock.mockReset();
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

  it('keeps an approved published metadata edit public and invalidates the cache', async () => {
    const page = await db.page.create({
      data: {
        userId,
        slug: 'published-pass-edit',
        title: '旧标题',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    moderationCheckMock.mockResolvedValue({ verdict: 'pass', labels: [] });

    const response = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: '审核通过的新标题' }),
      }),
      pageContext(page.id),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: { title: '审核通过的新标题', status: 'PUBLISHED' },
      moderation: { verdict: 'pass' },
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('page:published-pass-edit', { expire: 0 });
    await expect(
      db.moderationRecord.findFirst({ where: { targetId: page.id } }),
    ).resolves.toMatchObject({ verdict: 'pass' });
  });

  it('saves a review metadata edit, takes the page offline, and invalidates the cache', async () => {
    const page = await db.page.create({
      data: {
        userId,
        slug: 'published-review-edit',
        title: '旧标题',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    moderationCheckMock.mockResolvedValue({ verdict: 'review', labels: ['finance:投资咨询'] });

    const response = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bio: '投资咨询服务' }),
      }),
      pageContext(page.id),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: { bio: '投资咨询服务', status: 'REVIEW' },
      moderation: { verdict: 'review' },
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('page:published-review-edit', { expire: 0 });
  });

  it('rejects a blocked published metadata edit without changing content or cache', async () => {
    const page = await db.page.create({
      data: {
        userId,
        slug: 'published-block-edit',
        title: '安全标题',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    moderationCheckMock.mockResolvedValue({ verdict: 'block', labels: ['gambling:博彩平台'] });

    const response = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: '违规新标题' }),
      }),
      pageContext(page.id),
    );

    expect(response.status).toBe(422);
    await expect(db.page.findUnique({ where: { id: page.id } })).resolves.toMatchObject({
      title: '安全标题',
      status: 'PUBLISHED',
    });
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('rechecks later REVIEW edits so queued content cannot be swapped before approval', async () => {
    const page = await db.page.create({
      data: {
        userId,
        slug: 'queued-swap-guard',
        title: '待人工审核内容',
        status: 'REVIEW',
      },
    });
    moderationCheckMock.mockResolvedValue({ verdict: 'block', labels: ['adult:色情直播'] });

    const response = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: '试图替换的违规内容' }),
      }),
      pageContext(page.id),
    );

    expect(response.status).toBe(422);
    await expect(db.page.findUnique({ where: { id: page.id } })).resolves.toMatchObject({
      title: '待人工审核内容',
      status: 'REVIEW',
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

  it('soft-deletes an owned page without changing its publication status', async () => {
    const page = await db.page.create({
      data: {
        userId,
        slug: 'delete-page',
        title: '待删除主页',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    const response = await DELETE(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(204);
    await expect(db.page.findUnique({ where: { id: page.id } })).resolves.toMatchObject({
      status: 'PUBLISHED',
      deletedAt: expect.any(Date),
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('page:delete-page', { expire: 0 });

    const getResponse = await GET(new Request('http://localhost'), pageContext(page.id));
    expect(getResponse.status).toBe(404);
  });
});
