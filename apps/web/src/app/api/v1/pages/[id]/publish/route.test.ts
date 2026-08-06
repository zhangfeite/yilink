import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, moderationCheckMock, revalidateTagMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  moderationCheckMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock('../../../../../../lib/auth', () => ({ auth: authMock }));
vi.mock('../../../../../../lib/moderation', () => ({
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

import { db } from '../../../../../../lib/db';
import { POST } from './route';

const userId = 'publish-owner';

async function clearDatabase() {
  await db.moderationRecord.deleteMany();
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

function pageContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('/api/v1/pages/:id/publish', () => {
  beforeEach(async () => {
    await clearDatabase();
    await db.user.create({ data: { id: userId, email: 'publish@example.com' } });
    authMock.mockReset();
    moderationCheckMock.mockReset();
    revalidateTagMock.mockReset();
    authMock.mockResolvedValue({ user: { id: userId } });
  });

  it('does not change status when moderation blocks the content', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'blocked-page', title: '需要审核的主页', bio: '简介' },
    });
    await db.block.create({
      data: {
        pageId: page.id,
        type: 'LINK',
        size: 'MD',
        isVisible: true,
        position: 0,
        config: { title: '链接', url: 'https://blocked.example.com' },
      },
    });
    moderationCheckMock.mockResolvedValue({ verdict: 'block', labels: ['blocked'] });

    const response = await POST(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'MODERATION_BLOCKED' },
    });
    await expect(db.page.findUnique({ where: { id: page.id } })).resolves.toMatchObject({
      status: 'DRAFT',
      publishedAt: null,
    });
    await expect(
      db.moderationRecord.findFirst({ where: { targetType: 'page', targetId: page.id } }),
    ).resolves.toMatchObject({
      provider: 'local-words+url-blocklist',
      verdict: 'block',
      detail: { labels: ['blocked'] },
    });
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('publishes approved content and invalidates its page cache tag', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'approved-page', title: '可发布主页', bio: '页面简介' },
    });
    await db.block.create({
      data: {
        pageId: page.id,
        type: 'LINK',
        size: 'MD',
        isVisible: true,
        position: 0,
        config: { title: '官网', url: 'https://example.com' },
      },
    });
    moderationCheckMock.mockResolvedValue({ verdict: 'pass', labels: [] });

    const response = await POST(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: { id: page.id, status: 'PUBLISHED' },
    });
    expect(moderationCheckMock).toHaveBeenCalledWith({
      title: '可发布主页',
      bio: '页面简介',
      avatarUrl: null,
      seoTitle: null,
      seoDesc: null,
      ctaConfig: null,
      themeConfig: null,
      blocks: [{ title: '官网', url: 'https://example.com' }],
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('page:approved-page', { expire: 0 });
    await expect(db.page.findUnique({ where: { id: page.id } })).resolves.toMatchObject({
      status: 'PUBLISHED',
      publishedAt: expect.any(Date),
    });
    await expect(
      db.moderationRecord.findFirst({ where: { targetType: 'page', targetId: page.id } }),
    ).resolves.toMatchObject({
      provider: 'local-words+url-blocklist',
      verdict: 'pass',
      detail: { labels: [] },
    });
  });

  it('keeps review content offline in REVIEW and leaves it pending human review', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'review-page', title: '待人工复核的主页', bio: '简介' },
    });
    moderationCheckMock.mockResolvedValue({ verdict: 'review', labels: ['需要复核'] });

    const response = await POST(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: { id: page.id, status: 'REVIEW', publishedAt: null },
      moderation: { verdict: 'review', labels: ['需要复核'] },
      message: '已提交审核',
    });
    await expect(
      db.moderationRecord.findFirst({ where: { targetType: 'page', targetId: page.id } }),
    ).resolves.toMatchObject({
      provider: 'local-words+url-blocklist',
      verdict: 'review',
      detail: { labels: ['需要复核'] },
      reviewedBy: null,
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('page:review-page', { expire: 0 });
  });

  it('does not let an owner republish a page hidden by an admin', async () => {
    const page = await db.page.create({
      data: {
        userId,
        slug: 'admin-hidden-page',
        title: '管理员隐藏页面',
        status: 'HIDDEN',
      },
    });

    const response = await POST(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(409);
    expect(moderationCheckMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('treats a soft-deleted owned page as not found', async () => {
    const page = await db.page.create({
      data: {
        userId,
        slug: 'deleted-publish-page',
        title: '已删除页面',
        deletedAt: new Date(),
      },
    });

    const response = await POST(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(404);
    expect(moderationCheckMock).not.toHaveBeenCalled();
  });

  it('returns 404 before calling moderation for a page the user does not own', async () => {
    const otherUser = await db.user.create({
      data: { id: 'publish-other', email: 'publish-other@example.com' },
    });
    const page = await db.page.create({
      data: { userId: otherUser.id, slug: 'other-publish-page', title: '其他页面' },
    });

    const response = await POST(new Request('http://localhost'), pageContext(page.id));

    expect(response.status).toBe(404);
    expect(moderationCheckMock).not.toHaveBeenCalled();
  });
});
