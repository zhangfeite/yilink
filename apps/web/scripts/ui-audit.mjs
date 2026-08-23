/**
 * 产品壳的全界面真机截图：营销页 / 注册登录 / 工作台 / 编辑器 / 数据 / 设置，桌面 1280 + 手机 375。
 *
 * 审美验收看图不看代码：任何壳的视觉改动，合并前后各跑一次，对着
 * docs/design/design-direction.md 的八条法则逐张过。脚本自己注册一个一次性账号并建一张模板页。
 *
 * 用法：BASE=http://localhost:3000 OUT=/tmp/ui-audit node scripts/ui-audit.mjs
 * 注意：目标服务需已跑过 db:deploy；注册若要邀请码请设 INVITE=xxx。
 */
import { mkdirSync } from 'node:fs';
import { chromium, devices } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = process.env.OUT ?? '/tmp/ui-audit';
const INVITE = process.env.INVITE ?? '';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const desk = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' });
const mob = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, locale: 'zh-CN' });

async function shot(ctx, path, name, full = false) {
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  await page.close();
}

await shot(desk, '/', 'home-desktop-full', true);
await shot(mob, '/', 'home-mobile-full', true);
await shot(desk, '/register', 'register-desktop');
await shot(mob, '/register', 'register-mobile');
await shot(desk, '/login', 'login-desktop');

const stamp = Date.now().toString(36);
const page = await desk.newPage();
await page.goto(BASE + '/register');
await page.fill('input[name="email"]', `ui-${stamp}@example.com`);
await page.fill('input[name="password"]', 'UiAudit-2026!');
if (await page.locator('input[name="inviteCode"]').count()) {
  await page.fill('input[name="inviteCode"]', INVITE || 'none');
}
await page.click('button[type="submit"]');
await page.waitForURL(/\/studio$/, { timeout: 20_000 });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/studio-empty-desktop.png` });

await page.getByRole('button', { name: '新建主页' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/studio-create-modal.png` });
await page.locator('button[aria-pressed]').first().click();
await page.getByRole('button', { name: '继续' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/studio-create-step2.png` });
await page.fill('#new-page-slug', `ui-${stamp}`);
await page.fill('#new-page-title', '林小满');
await page.getByRole('button', { name: '创建并开始编辑' }).click();
await page.waitForURL(/\/studio\/pages\//, { timeout: 20_000 });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/editor-desktop.png` });
await page.screenshot({ path: `${OUT}/editor-desktop-full.png`, fullPage: true });
const editorUrl = page.url();

for (const [path, name] of [['/studio', 'studio-list-desktop'], ['/studio/data', 'data-desktop'], ['/studio/settings', 'settings-desktop']]) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

await mob.addCookies(await desk.cookies());
const m = await mob.newPage();
await m.goto(editorUrl, { waitUntil: 'networkidle' });
await m.waitForTimeout(800);
await m.screenshot({ path: `${OUT}/editor-mobile.png` });
await m.screenshot({ path: `${OUT}/editor-mobile-full.png`, fullPage: true });
await m.goto(BASE + '/studio', { waitUntil: 'networkidle' });
await m.waitForTimeout(500);
await m.screenshot({ path: `${OUT}/studio-mobile.png` });

await browser.close();
console.log(`截图已写入 ${OUT}`);
