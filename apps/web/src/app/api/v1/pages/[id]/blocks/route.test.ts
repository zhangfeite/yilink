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
import { PUT } from './route';

const userId = 'blocks-owner';
const otherUserId = 'blocks-other-user';

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

function replaceRequest(blocks: unknown) {
  return new Request('http://localhost/api/v1/pages/page/blocks', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(blocks),
  });
}

describe('/api/v1/pages/:id/blocks', () => {
  beforeEach(async () => {
    await clearDatabase();
    await db.user.createMany({
      data: [
        { id: userId, email: 'blocks-owner@example.com' },
        { id: otherUserId, email: 'blocks-other@example.com' },
      ],
    });
    authMock.mockReset();
    moderationCheckMock.mockReset();
    revalidateTagMock.mockReset();
    authMock.mockResolvedValue({ user: { id: userId } });
  });

  it('replaces blocks in input order after validating their configs', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'blocks-page', title: '区块主页' },
    });
    await db.block.create({
      data: {
        pageId: page.id,
        type: 'DIVIDER',
        size: 'MD',
        isVisible: true,
        position: 0,
        config: {},
      },
    });

    const response = await PUT(
      replaceRequest([
        {
          type: 'LINK',
          size: 'LG',
          isVisible: true,
          config: { title: '官网', url: 'https://example.com' },
        },
        {
          type: 'TEXT',
          size: 'SM',
          isVisible: false,
          config: { markdown: '一段文字' },
        },
      ]),
      pageContext(page.id),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      blocks: [
        {
          pageId: page.id,
          type: 'LINK',
          size: 'LG',
          isVisible: true,
          position: 0,
          config: { title: '官网', url: 'https://example.com' },
        },
        {
          pageId: page.id,
          type: 'TEXT',
          size: 'SM',
          isVisible: false,
          position: 1,
          config: { markdown: '一段文字' },
        },
      ],
    });
  });

  it('rejects an invalid config without replacing persisted blocks', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'invalid-blocks-page', title: '区块主页' },
    });
    const existingBlock = await db.block.create({
      data: {
        pageId: page.id,
        type: 'DIVIDER',
        size: 'MD',
        isVisible: true,
        position: 0,
        config: {},
      },
    });

    const response = await PUT(
      replaceRequest([
        {
          type: 'LINK',
          size: 'MD',
          isVisible: true,
          config: { title: '坏链接', url: 'not-a-url' },
        },
      ]),
      pageContext(page.id),
    );

    expect(response.status).toBe(400);
    await expect(db.block.findUnique({ where: { id: existingBlock.id } })).resolves.not.toBeNull();
  });

  it('rejects more than 50 blocks', async () => {
    const page = await db.page.create({
      data: { userId, slug: 'too-many-blocks-page', title: '区块主页' },
    });
    const blocks = Array.from({ length: 51 }, () => ({
      type: 'DIVIDER',
      size: 'MD',
      isVisible: true,
      config: {},
    }));

    const response = await PUT(replaceRequest(blocks), pageContext(page.id));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('keeps an approved published block replacement public and revalidates it', async () => {
    const page = await db.page.create({
      data: {
        userId,
        slug: 'published-blocks-pass',
        title: '公开主页',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    moderationCheckMock.mockResolvedValue({ verdict: 'pass', labels: [] });

    const response = await PUT(
      replaceRequest([
        {
          type: 'LINK',
          size: 'MD',
          isVisible: true,
          config: { title: '新官网', url: 'https://example.com/new' },
        },
      ]),
      pageContext(page.id),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: { status: 'PUBLISHED' },
      moderation: { verdict: 'pass' },
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('page:published-blocks-pass', { expire: 0 });
  });

  it('saves review blocks, moves the published page to REVIEW, and revalidates it', async () => {
    const page = await db.page.create({
      data: {
        userId,
        slug: 'published-blocks-review',
        title: '公开主页',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    moderationCheckMock.mockResolvedValue({ verdict: 'review', labels: ['finance:投资咨询'] });

    const response = await PUT(
      replaceRequest([
        {
          type: 'TEXT',
          size: 'MD',
          isVisible: true,
          config: { markdown: '投资咨询' },
        },
      ]),
      pageContext(page.id),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: { status: 'REVIEW' },
      moderation: { verdict: 'review' },
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('page:published-blocks-review', {
      expire: 0,
    });
  });

  it('rejects blocked published blocks without replacing the persisted set', async () => {
    const page = await db.page.create({
      data: {
        userId,
        slug: 'published-blocks-block',
        title: '公开主页',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    const existingBlock = await db.block.create({
      data: {
        pageId: page.id,
        type: 'DIVIDER',
        size: 'MD',
        isVisible: true,
        position: 0,
        config: {},
      },
    });
    moderationCheckMock.mockResolvedValue({ verdict: 'block', labels: ['adult:色情直播'] });

    const response = await PUT(
      replaceRequest([
        {
          type: 'TEXT',
          size: 'MD',
          isVisible: true,
          config: { markdown: '违规内容' },
        },
      ]),
      pageContext(page.id),
    );

    expect(response.status).toBe(422);
    await expect(db.block.findUnique({ where: { id: existingBlock.id } })).resolves.not.toBeNull();
    await expect(db.page.findUnique({ where: { id: page.id } })).resolves.toMatchObject({
      status: 'PUBLISHED',
    });
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('returns 404 for a page owned by another user', async () => {
    const page = await db.page.create({
      data: { userId: otherUserId, slug: 'other-blocks-page', title: '别人的区块主页' },
    });

    const response = await PUT(replaceRequest([]), pageContext(page.id));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });
});
