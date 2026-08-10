import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { PrismaClient, type Prisma } from '@prisma/client';

import templates from '../src/templates/templates.json';

// Prisma 引擎把 file:./ 解析为相对 prisma/ 目录；测试脚本 cwd 是 apps/web，故显式对齐
const E2E_DB_URL = 'file:' + resolve(process.cwd(), 'prisma/data/yilink-e2e.db');
const db = new PrismaClient({ datasources: { db: { url: E2E_DB_URL } } });
const userId = 'layout-baseline-user';
const viewports = [320, 375, 480] as const;

type Template = (typeof templates)[number];

async function seedTemplate(template: Template) {
  const page = await db.page.upsert({
    where: { slug: `baseline-${template.id}` },
    update: {
      title: template.identity.title,
      bio: template.identity.bio,
      layout: template.layout,
      themeId: template.defaultTheme,
      themeConfig: { role: template.identity.role },
      ctaConfig: template.cta as Prisma.InputJsonValue,
      status: 'PUBLISHED',
      deletedAt: null,
      bentoVersion: null,
    },
    create: {
      userId,
      slug: `baseline-${template.id}`,
      title: template.identity.title,
      bio: template.identity.bio,
      layout: template.layout,
      themeId: template.defaultTheme,
      themeConfig: { role: template.identity.role },
      ctaConfig: template.cta as Prisma.InputJsonValue,
      status: 'PUBLISHED',
    },
  });
  await db.block.deleteMany({ where: { pageId: page.id } });
  await db.block.createMany({
    data: template.blocks.map((block, position) => ({
      pageId: page.id,
      type: block.type,
      size: block.size,
      position,
      isVisible: true,
      config: block.config as Prisma.InputJsonValue,
    })),
  });
}

test.beforeAll(async () => {
  await db.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: 'layout-baseline@example.com' },
  });
  for (const template of templates) await seedTemplate(template);
  const page = await db.page.upsert({
    where: { slug: 'baseline-link-group-break' },
    update: { title: 'LinkGroup baseline', status: 'PUBLISHED', deletedAt: null },
    create: {
      userId,
      slug: 'baseline-link-group-break',
      title: 'LinkGroup baseline',
      status: 'PUBLISHED',
    },
  });
  await db.block.deleteMany({ where: { pageId: page.id } });
  await db.block.createMany({
    data: [
      {
        pageId: page.id,
        type: 'LINK',
        size: 'LG',
        position: 0,
        config: { title: '第一链接', url: 'https://example.com/one' },
      },
      {
        pageId: page.id,
        type: 'TEXT',
        size: 'MD',
        position: 1,
        config: { markdown: '中断 LinkGroup 的文本' },
      },
      {
        pageId: page.id,
        type: 'LINK',
        size: 'LG',
        position: 2,
        config: { title: '第二链接', url: 'https://example.com/two' },
      },
    ],
  });
});

test.afterAll(async () => {
  await db.$disconnect();
});

for (const template of templates) {
  test(`public baseline: ${template.id}`, async ({ page }) => {
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/p/baseline-${template.id}`, { waitUntil: 'networkidle' });
      await expect(
        page.getByRole('heading', { level: 1, name: template.identity.title }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot(`${template.id}-${width}.png`, {
        animations: 'disabled',
        fullPage: true,
      });
    }
  });
}

test('preserves LinkGroup boundaries and keeps the public interaction script below 5KB', async ({
  page,
}) => {
  await page.goto('/p/baseline-link-group-break', { waitUntil: 'networkidle' });
  await expect(page.locator('h2', { hasText: '精选链接' })).toHaveCount(2);
  await expect(page.getByText('中断 LinkGroup 的文本')).toBeVisible();
  const inlineScriptBytes = await page
    .locator('script')
    .evaluateAll(
      (scripts) =>
        scripts
          .map((script) => script.textContent ?? '')
          .find((source) => source.includes('window.__yl_e'))?.length ?? 0,
    );
  expect(inlineScriptBytes).toBeGreaterThan(0);
  expect(inlineScriptBytes).toBeLessThanOrEqual(5 * 1024);
});
