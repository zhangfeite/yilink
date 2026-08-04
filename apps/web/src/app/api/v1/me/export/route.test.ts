import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock('../../../../../lib/auth', () => ({ auth: authMock }));

import { db } from '../../../../../lib/db';
import { GET } from './route';

const userId = 'export-user';

async function clearDatabase() {
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

describe('/api/v1/me/export', () => {
  beforeEach(async () => {
    await clearDatabase();
    authMock.mockReset();
  });

  it('returns UNAUTHORIZED without a session', async () => {
    authMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('exports the user pages and their blocks as an attachment', async () => {
    await db.user.create({
      data: { id: userId, email: 'export@example.com', name: '导出用户' },
    });
    const page = await db.page.create({
      data: { userId, slug: 'export-page', title: '导出主页' },
    });
    await db.block.createMany({
      data: [
        {
          pageId: page.id,
          type: 'TEXT',
          size: 'MD',
          isVisible: true,
          position: 0,
          config: { markdown: '第一块' },
        },
        {
          pageId: page.id,
          type: 'LINK',
          size: 'MD',
          isVisible: true,
          position: 1,
          config: { title: '官网', url: 'https://example.com' },
        },
      ],
    });
    authMock.mockResolvedValue({ user: { id: userId } });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="yilink-export.json"',
    );
    await expect(response.json()).resolves.toMatchObject({
      user: { id: userId, email: 'export@example.com', name: '导出用户', plan: 'FREE' },
      pages: [
        {
          id: page.id,
          slug: 'export-page',
          blocks: [
            { position: 0, type: 'TEXT', config: { markdown: '第一块' } },
            {
              position: 1,
              type: 'LINK',
              config: { title: '官网', url: 'https://example.com' },
            },
          ],
        },
      ],
    });
  });
});
