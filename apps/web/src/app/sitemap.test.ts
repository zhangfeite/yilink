import { beforeEach, describe, expect, it, vi } from 'vitest';

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(async () => new Headers({ host: 'yilink.app', 'x-forwarded-proto': 'https' })),
}));

vi.mock('next/headers', () => ({ headers: headersMock }));

import { db } from '@/lib/db';

import robots from './robots';
import sitemap from './sitemap';

const userId = 'sitemap-owner';
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

async function clearDatabase() {
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

describe('sitemap', () => {
  beforeEach(async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    await clearDatabase();
    await db.user.create({ data: { id: userId, email: 'sitemap@example.com' } });
  });

  it('lists only published, undeleted pages', async () => {
    await db.page.createMany({
      data: [
        { userId, slug: 'live-page', title: '已发布', status: 'PUBLISHED', publishedAt: new Date() },
        { userId, slug: 'draft-page', title: '草稿', status: 'DRAFT' },
        { userId, slug: 'review-page', title: '待审', status: 'REVIEW' },
        // 审核下架页绝不能靠 sitemap 被送回搜索引擎
        { userId, slug: 'hidden-page', title: '已隐藏', status: 'HIDDEN', hiddenReason: 'manual' },
        {
          userId,
          slug: 'deleted-page',
          title: '已删除',
          status: 'PUBLISHED',
          publishedAt: new Date(),
          deletedAt: new Date(),
        },
      ],
    });

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://yilink.app');
    expect(urls).toContain('https://yilink.app/p/live-page');
    for (const excluded of ['draft-page', 'review-page', 'hidden-page', 'deleted-page']) {
      expect(urls, excluded).not.toContain(`https://yilink.app/p/${excluded}`);
    }
  });

  it('percent-encodes slugs so a crafted slug cannot break the XML', async () => {
    // slug 规则本身不允许这些字符，但 sitemap 是对外输出，编码不能依赖上游约束
    await db.page.create({
      data: { userId, slug: 'a b&c', title: '奇怪 slug', status: 'PUBLISHED', publishedAt: new Date() },
    });

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain('https://yilink.app/p/a%20b%26c');
  });

  it('prefers the configured public origin over the request host', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://configured.example/';
    await db.page.create({
      data: { userId, slug: 'live-page', title: '已发布', status: 'PUBLISHED', publishedAt: new Date() },
    });

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain('https://configured.example');
    expect(urls).toContain('https://configured.example/p/live-page');

    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });
});

describe('robots', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('points crawlers at the sitemap and keeps logged-in surfaces out of the index', async () => {
    const result = await robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(result.sitemap).toBe('https://yilink.app/sitemap.xml');
    expect(rule?.allow).toBe('/');
    expect(rule?.disallow).toEqual(
      expect.arrayContaining(['/api/', '/studio', '/admin', '/login', '/register']),
    );
  });
});
