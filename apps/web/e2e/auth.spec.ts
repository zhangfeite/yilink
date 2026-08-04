import { expect, test } from '@playwright/test';

test('registers, logs in, and opens the protected studio', async ({ page }) => {
  const email = 'e2e-' + Date.now() + '-' + String(test.info().workerIndex) + '@example.com';
  const password = 'YiLink-e2e-2026!';

  await page.goto('/register');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/login\?registered=1$/);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByTestId('studio-heading')).toBeVisible();

  await page.goto('/studio');
  await expect(page.getByTestId('studio-heading')).toBeVisible();
});
