import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock('../../../../../../lib/auth', () => ({ auth: authMock }));

import { db } from '../../../../../../lib/db';
import { PUT } from './route';

const userId = 'blocks-owner';
const otherUserId = 'blocks-other-user';

async function clearDatabase() {
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
