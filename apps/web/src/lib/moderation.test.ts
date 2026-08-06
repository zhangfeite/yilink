import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./auth', () => ({ auth: vi.fn() }));

import { db } from './db';
import { purgeExpiredDeletedPages } from './moderation';

describe('soft-deleted page retention', () => {
  beforeEach(async () => {
    await db.moderationRecord.deleteMany();
    await db.block.deleteMany();
    await db.page.deleteMany();
    await db.order.deleteMany();
    await db.user.deleteMany();
  });

  it('hard-deletes only pages older than 30 days and reports the count', async () => {
    const now = new Date('2026-08-06T12:00:00.000Z');
    const dayMs = 24 * 60 * 60 * 1000;
    await db.user.create({ data: { id: 'retention-owner', email: 'retention@example.com' } });
    await db.page.createMany({
      data: [
        {
          id: 'expired-deleted-page',
          userId: 'retention-owner',
          slug: 'expired-deleted-page',
          title: '超过三十天',
          deletedAt: new Date(now.getTime() - 31 * dayMs),
        },
        {
          id: 'boundary-deleted-page',
          userId: 'retention-owner',
          slug: 'boundary-deleted-page',
          title: '正好三十天',
          deletedAt: new Date(now.getTime() - 30 * dayMs),
        },
        {
          id: 'active-page',
          userId: 'retention-owner',
          slug: 'active-retention-page',
          title: '未删除页面',
        },
      ],
    });

    await expect(purgeExpiredDeletedPages(db, now)).resolves.toEqual({ deletedPages: 1 });
    await expect(db.page.findUnique({ where: { id: 'expired-deleted-page' } })).resolves.toBeNull();
    await expect(
      db.page.findUnique({ where: { id: 'boundary-deleted-page' } }),
    ).resolves.not.toBeNull();
    await expect(db.page.findUnique({ where: { id: 'active-page' } })).resolves.not.toBeNull();
  });
});
