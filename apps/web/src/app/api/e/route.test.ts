import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '../../../lib/db';
import { hashIp, resetEventRateLimit } from '../../../lib/stats';
import { POST } from './route';

const originalAuthSecret = process.env.AUTH_SECRET;

async function clearDatabase() {
  await db.clickEvent.deleteMany();
  await db.dailyStat.deleteMany();
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

function eventRequest(body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Request('http://localhost/api/e', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 MicroMessenger',
      'x-forwarded-for': '203.0.113.10',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/e', () => {
  beforeEach(async () => {
    await clearDatabase();
    process.env.AUTH_SECRET = 'stats-test-secret';
    resetEventRateLimit();
  });

  afterAll(() => {
    if (originalAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = originalAuthSecret;
    }
  });

  it('records a valid event with only coarse, derived request data', async () => {
    const user = await db.user.create({ data: { id: 'event-user', email: 'event@example.com' } });
    const page = await db.page.create({
      data: { userId: user.id, slug: 'event-page', title: '事件主页', status: 'PUBLISHED' },
    });

    const response = await POST(
      eventRequest(
        { pageId: page.id, blockId: 'block-1', kind: 'CLICK' },
        { referer: 'https://www.zhihu.com/question/1' },
      ),
    );

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe('');
    const [event] = await db.clickEvent.findMany();
    expect(event).toMatchObject({
      pageId: page.id,
      blockId: 'block-1',
      kind: 'CLICK',
      uaClass: 'wechat',
      refClass: 'zhihu',
    });
    expect(event?.tsBucket.toISOString()).toMatch(/T\d{2}:00:00\.000Z$/);
    expect(event?.ipHash).toBe(hashIp('203.0.113.10', event!.tsBucket, 'stats-test-secret'));
  });

  it('silently drops invalid bodies, bots, and pages that are not published', async () => {
    const user = await db.user.create({ data: { id: 'event-draft-user', email: 'draft@example.com' } });
    const draft = await db.page.create({
      data: { userId: user.id, slug: 'draft-event-page', title: '草稿主页' },
    });

    const invalid = await POST(eventRequest({ pageId: draft.id, kind: 'OPEN' }));
    const draftResponse = await POST(eventRequest({ pageId: draft.id, kind: 'VIEW' }));
    const missingResponse = await POST(eventRequest({ pageId: 'missing-page', kind: 'VIEW' }));
    const botResponse = await POST(
      eventRequest(
        { pageId: draft.id, kind: 'VIEW' },
        { 'user-agent': 'Googlebot/2.1', 'x-forwarded-for': '203.0.113.11' },
      ),
    );

    expect([invalid, draftResponse, missingResponse, botResponse].map((response) => response.status)).toEqual([
      204,
      204,
      204,
      204,
    ]);
    await expect(db.clickEvent.count()).resolves.toBe(0);
  });

  it('accepts at most 60 events per ip hash in one in-memory minute bucket', async () => {
    const user = await db.user.create({ data: { id: 'event-limit-user', email: 'limit@example.com' } });
    const page = await db.page.create({
      data: { userId: user.id, slug: 'event-limit-page', title: '限频主页', status: 'PUBLISHED' },
    });

    const responses = [];
    for (let index = 0; index < 61; index += 1) {
      responses.push(await POST(eventRequest({ pageId: page.id, kind: 'VIEW' })));
    }

    expect(responses.every((response) => response.status === 204)).toBe(true);
    await expect(db.clickEvent.count({ where: { pageId: page.id } })).resolves.toBe(60);
  });
});
