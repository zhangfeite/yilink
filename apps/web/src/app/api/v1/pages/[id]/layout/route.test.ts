import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, moderationCheckMock, revalidateTagMock } = vi.hoisted(() => ({ authMock: vi.fn(), moderationCheckMock: vi.fn(), revalidateTagMock: vi.fn() }));
vi.mock('../../../../../../lib/auth', () => ({ auth: authMock }));
vi.mock('../../../../../../lib/moderation', () => ({
  moderatePageContent: moderationCheckMock,
  pageModerationRecordData: (pageId: string, result: { verdict: string; labels: string[] }) => ({ targetType: 'page', targetId: pageId, provider: 'local-words+url-blocklist', verdict: result.verdict, detail: { labels: result.labels } }),
}));
vi.mock('next/cache', () => ({ revalidateTag: revalidateTagMock }));

import { db } from '../../../../../../lib/db';
import { PUT } from './route';

const userId = 'layout-owner';
function pageContext(id: string) { return { params: Promise.resolve({ id }) }; }
function payload(blocks: unknown, overrides: Record<string, unknown> = {}) {
  return { title: '原子保存', bio: null, avatarUrl: null, layout: 'GRID', bentoVersion: null, themeId: 'minimal-light', seoTitle: null, seoDesc: null, ctaConfig: null, themeConfig: {}, blocks, ...overrides };
}
function request(body: unknown) { return new Request('http://localhost/api/v1/pages/page/layout', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }

describe('PUT /api/v1/pages/:id/layout', () => {
  beforeEach(async () => {
    await db.moderationRecord.deleteMany(); await db.block.deleteMany(); await db.page.deleteMany(); await db.order.deleteMany(); await db.user.deleteMany();
    await db.user.create({ data: { id: userId, email: 'layout-owner@example.com' } });
    authMock.mockReset(); moderationCheckMock.mockReset(); revalidateTagMock.mockReset(); authMock.mockResolvedValue({ user: { id: userId } });
  });

  it('updates metadata and a stable-ID block diff in one response', async () => {
    const page = await db.page.create({ data: { userId, slug: 'atomic-layout', title: '旧标题' } });
    const retained = await db.block.create({ data: { pageId: page.id, type: 'DIVIDER', size: 'MD', isVisible: true, position: 0, config: {} } });
    const response = await PUT(request(payload([{ id: retained.id, type: 'DIVIDER', size: 'LG', isVisible: false, placement: { x: 0, y: 0, w: 4, h: 1 }, config: {} }, { id: 'draft-text', type: 'TEXT', size: 'MD', isVisible: true, config: { markdown: '新块' } }], { title: '新标题', bentoVersion: 1 })), pageContext(page.id));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ page: { title: '新标题', bentoVersion: 1, layout: 'GRID' }, blocks: [{ id: retained.id, position: 0 }, { type: 'TEXT', position: 1 }] });
  });

  it('rejects blocked published saves before any metadata or block change', async () => {
    const page = await db.page.create({ data: { userId, slug: 'atomic-blocked', title: '安全标题', status: 'PUBLISHED', publishedAt: new Date() } });
    const existing = await db.block.create({ data: { pageId: page.id, type: 'DIVIDER', size: 'MD', isVisible: true, position: 0, config: {} } });
    moderationCheckMock.mockResolvedValue({ verdict: 'block', labels: ['adult:色情直播'] });
    const response = await PUT(request(payload([{ id: existing.id, type: 'TEXT', size: 'MD', isVisible: true, config: { markdown: '违规' } }], { title: '违规标题' })), pageContext(page.id));
    expect(response.status).toBe(422);
    await expect(db.page.findUnique({ where: { id: page.id } })).resolves.toMatchObject({ title: '安全标题', status: 'PUBLISHED' });
    await expect(db.block.findUnique({ where: { id: existing.id } })).resolves.not.toBeNull();
  });

  it('downgrades published review saves and records moderation in the same transaction', async () => {
    const page = await db.page.create({ data: { userId, slug: 'atomic-review', title: '公开标题', status: 'PUBLISHED', publishedAt: new Date() } });
    moderationCheckMock.mockResolvedValue({ verdict: 'review', labels: ['finance:投资咨询'] });
    const response = await PUT(request(payload([{ id: 'draft-text', type: 'TEXT', size: 'MD', isVisible: true, config: { markdown: '投资咨询' } }])), pageContext(page.id));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ page: { status: 'REVIEW' }, moderation: { verdict: 'review' } });
    await expect(db.moderationRecord.findFirst({ where: { targetId: page.id } })).resolves.toMatchObject({ verdict: 'review' });
    expect(revalidateTagMock).toHaveBeenCalledWith('page:atomic-review', { expire: 0 });
  });
});
