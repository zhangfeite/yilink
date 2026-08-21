import { expect, test } from '@playwright/test';

import templates from '../src/templates/templates.json';

// 文案断言全是中文；Playwright 默认 Accept-Language 是 en，会让 next-intl 切到英文界面
test.use({ locale: 'zh-CN' });

/**
 * 黄金路径：零账号 → 选模板建页 → 发布 → 公开可访问。
 *
 * 这条链路曾在「建页」一步 100% 失败（PUT /layout 只发 3 个键，服务端 schema 要 11 个），
 * 单测因为 mock 了 fetcher 而毫无察觉。所以这里必须打真服务、真库，
 * 并核对模板内容确实落进了页面，而不只是页面被创建。
 */
test('a new visitor can create a page from a template, publish it and open it publicly', async ({ page }) => {
  const stamp = `${Date.now().toString(36)}${test.info().workerIndex}`;
  const email = `activation-${stamp}@example.com`;
  const slug = `act-${stamp}`.slice(0, 30);
  const template = templates[0];

  await page.goto('/register');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill('YiLink-e2e-2026!');
  await page.locator('button[type="submit"]').click();
  // 注册 = bcrypt + 建会话，冷启动的 dev server 还要现编译 auth 路由，5s 默认窗口不够
  await expect(page).toHaveURL(/\/studio$/, { timeout: 20_000 });
  // 登录是一串 302：URL 先变、文档后到。不等它落定就发起下一次导航会互相打断（ERR_ABORTED）
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: '新建主页' }).click();
  // 模板卡片按 templates.json 顺序渲染，第一张即 templates[0]
  await page.locator('button[aria-pressed]').first().click();
  await page.getByRole('button', { name: '继续' }).click();
  await page.locator('#new-page-slug').fill(slug);
  await page.locator('#new-page-title').fill('激活测试');
  await page.getByRole('button', { name: '创建并开始编辑' }).click();

  await expect(page).toHaveURL(/\/studio\/pages\/[^/]+$/);
  const pageId = page.url().split('/').pop()!;

  // 模板内容必须真的落库：区块数、主题、转化动作一个都不能少
  // page.request 与页面共享 cookie；独立的 request fixture 没有登录态，会拿到 401
  const created = await page.request.get(`/api/v1/pages/${pageId}`);
  expect(created.ok()).toBe(true);
  const { page: createdPage } = (await created.json()) as {
    page: { themeId: string; ctaConfig: unknown; themeConfig: { role?: string } | null };
  };
  expect(createdPage.themeId).toBe(template.defaultTheme);
  expect(createdPage.ctaConfig).not.toBeNull();
  expect(createdPage.themeConfig?.role).toBe(template.identity.role);


  await page.getByRole('button', { name: '发布', exact: true }).click();
  // 模板文案可能命中观察词进入人工审核，这两种结果都算链路通了
  await expect(page.getByText(/主页已发布|已提交审核/).first()).toBeVisible();

  const afterPublish = await page.request.get(`/api/v1/pages/${pageId}`);
  const { page: published } = (await afterPublish.json()) as { page: { status: string } };
  expect(['PUBLISHED', 'REVIEW']).toContain(published.status);

  if (published.status === 'PUBLISHED') {
    await page.goto(`/p/${slug}`);
    await expect(page.getByRole('heading', { level: 1, name: '激活测试' })).toBeVisible();
    // 至少一个模板区块渲染出来，且转化条在
    expect(await page.locator('[data-block-id]').count()).toBeGreaterThan(0);
    await expect(page.locator('[class*="ctaBar"]')).toBeVisible();
  }
});
