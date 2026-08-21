import { expect, test } from '@playwright/test';

test('registers, is signed in automatically, and opens the protected studio', async ({ page }) => {
  const email = 'e2e-' + Date.now() + '-' + String(test.info().workerIndex) + '@example.com';
  const password = 'YiLink-e2e-2026!';

  await page.goto('/register');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // 注册成功直接建会话落到工作台，不再经过 /login 二次输入账密
  // 注册 = bcrypt + 建会话，冷启动的 dev server 还要现编译 auth 路由，5s 默认窗口不够
  await expect(page).toHaveURL(/\/studio$/, { timeout: 20_000 });
  // 登录是一串 302：URL 先变、文档后到。不等它落定就发起下一次导航会互相打断（ERR_ABORTED）
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('studio-heading')).toBeVisible();

  // 会话必须跨导航存活
  await page.goto('/studio');
  await expect(page.getByTestId('studio-heading')).toBeVisible();
});
