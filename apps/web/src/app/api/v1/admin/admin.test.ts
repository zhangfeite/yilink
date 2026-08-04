import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, revalidateTagMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock('../../../../lib/auth', () => ({ auth: authMock }));
vi.mock('next/cache', () => ({ revalidateTag: revalidateTagMock }));

import { db } from '../../../../lib/db';
import { POST as resolveModeration } from './moderation/[id]/resolve/route';
import { GET as getModeration } from './moderation/route';
import { POST as hidePage } from './pages/[id]/hide/route';
import { POST as restorePage } from './pages/[id]/restore/route';
import { GET as getPages } from './pages/route';
import { PATCH as updateUser } from './users/[id]/route';
import { GET as getUsers } from './users/route';

const adminId = 'moderation-admin';
const ownerId = 'moderation-owner';

async function clearDatabase() {
  await db.moderationRecord.deleteMany();
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function createPage(status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' = 'PUBLISHED') {
  return db.page.create({
    data: {
      userId: ownerId,
      slug: 'review-target',
      title: '需要人工审核的主页',
      status,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
    },
  });
}

describe('/api/v1/admin', () => {
  beforeEach(async () => {
    await clearDatabase();
    await db.user.create({
      data: { id: adminId, email: 'admin@example.com', role: 'ADMIN' },
    });
    await db.user.create({
      data: { id: ownerId, email: 'owner@example.com', trustLevel: 12 },
    });
    authMock.mockReset();
    revalidateTagMock.mockReset();
    authMock.mockResolvedValue({ user: { id: adminId } });
  });

  it('returns 404 to a non-admin without exposing moderation data', async () => {
    authMock.mockResolvedValue({ user: { id: ownerId } });

    const response = await getModeration(
      new Request('http://localhost/api/v1/admin/moderation?filter=review'),
    );

    expect(response.status).toBe(404);
  });

  it('lists pending review records with their page and owner context', async () => {
    const page = await createPage();
    await db.moderationRecord.create({
      data: {
        targetType: 'page',
        targetId: page.id,
        provider: 'local-words',
        verdict: 'review',
        detail: { labels: ['复核词'] },
      },
    });
    await db.moderationRecord.create({
      data: {
        targetType: 'page',
        targetId: page.id,
        provider: 'manual',
        verdict: 'pass',
      },
    });

    const response = await getModeration(
      new Request('http://localhost/api/v1/admin/moderation?filter=review'),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      records: [
        {
          verdict: 'review',
          page: {
            id: page.id,
            slug: 'review-target',
            title: '需要人工审核的主页',
            user: { email: 'owner@example.com' },
          },
        },
      ],
    });
  });

  it('hides a public page, writes a manual audit record, and invalidates its cache', async () => {
    const page = await createPage();
    const pendingReview = await db.moderationRecord.create({
      data: {
        targetType: 'page',
        targetId: page.id,
        provider: 'local-words',
        verdict: 'review',
      },
    });

    const response = await hidePage(
      jsonRequest(`http://localhost/api/v1/admin/pages/${page.id}/hide`, 'POST', {
        reason: '疑似违规，需要整改',
      }),
      context(page.id),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: { id: page.id, status: 'HIDDEN', hiddenReason: '疑似违规，需要整改' },
    });
    // 公开页查询只读取 PUBLISHED；HIDDEN 由既有通用不可用页承接，不泄露处理原因。
    await expect(db.page.findUnique({ where: { id: page.id } })).resolves.toMatchObject({
      status: 'HIDDEN',
      hiddenReason: '疑似违规，需要整改',
    });
    await expect(
      db.moderationRecord.findFirst({
        where: { targetType: 'page', targetId: page.id, provider: 'manual', verdict: 'block' },
      }),
    ).resolves.toMatchObject({
      detail: { reason: '疑似违规，需要整改' },
      reviewedBy: adminId,
    });
    await expect(db.moderationRecord.findUnique({ where: { id: pendingReview.id } })).resolves.toMatchObject({
      reviewedBy: adminId,
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('page:review-target', { expire: 0 });
  });

  it('restores a hidden page, clears its private reason, and writes an audit record', async () => {
    const page = await createPage('HIDDEN');
    await db.page.update({
      where: { id: page.id },
      data: { hiddenReason: '此前的内部原因' },
    });

    const response = await restorePage(
      jsonRequest(`http://localhost/api/v1/admin/pages/${page.id}/restore`, 'POST'),
      context(page.id),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: { id: page.id, status: 'PUBLISHED', hiddenReason: null },
    });
    await expect(
      db.moderationRecord.findFirst({
        where: { targetType: 'page', targetId: page.id, provider: 'manual', verdict: 'pass' },
      }),
    ).resolves.toMatchObject({ detail: { action: 'restore' }, reviewedBy: adminId });
    expect(revalidateTagMock).toHaveBeenCalledWith('page:review-target', { expire: 0 });
  });

  it('marks a review record as handled by the current admin', async () => {
    const page = await createPage();
    const record = await db.moderationRecord.create({
      data: {
        targetType: 'page',
        targetId: page.id,
        provider: 'local-words',
        verdict: 'review',
      },
    });

    const response = await resolveModeration(
      jsonRequest(`http://localhost/api/v1/admin/moderation/${record.id}/resolve`, 'POST'),
      context(record.id),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      record: { id: record.id, reviewedBy: adminId },
    });
    await expect(db.moderationRecord.findUnique({ where: { id: record.id } })).resolves.toMatchObject({
      reviewedBy: adminId,
    });
  });

  it('searches pages by slug and lists users with editable trust levels', async () => {
    const page = await createPage();

    const pageResponse = await getPages(
      new Request('http://localhost/api/v1/admin/pages?slug=review'),
    );
    expect(pageResponse.status).toBe(200);
    await expect(pageResponse.json()).resolves.toMatchObject({
      pages: [{ id: page.id, slug: 'review-target', user: { email: 'owner@example.com' } }],
    });

    const usersResponse = await getUsers(
      new Request('http://localhost/api/v1/admin/users?query=owner@example.com'),
    );
    expect(usersResponse.status).toBe(200);
    await expect(usersResponse.json()).resolves.toMatchObject({
      users: [{ id: ownerId, email: 'owner@example.com', trustLevel: 12, _count: { pages: 1 } }],
      pagination: { page: 1, total: 1 },
    });

    const updateResponse = await updateUser(
      jsonRequest(`http://localhost/api/v1/admin/users/${ownerId}`, 'PATCH', { trustLevel: 88 }),
      context(ownerId),
    );
    expect(updateResponse.status).toBe(200);
    await expect(updateResponse.json()).resolves.toMatchObject({
      user: { id: ownerId, trustLevel: 88 },
    });
  });
});
