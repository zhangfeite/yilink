/**
 * 本地批量生成所有场景模板的 BENTO 预览页并截图，用于视觉评审。
 * 用法：BASE=http://localhost:3000 EMAIL=... PASSWORD=... node scripts/bento-preview.mjs
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium, devices } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const OUT = process.env.OUT ?? '/tmp/bento-preview';
mkdirSync(OUT, { recursive: true });

const templates = JSON.parse(readFileSync('src/templates/templates.json', 'utf8'));

const jar = [];
function cookieHeader() {
  return jar.join('; ');
}
async function req(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: 'manual',
    headers: { 'content-type': 'application/json', cookie: cookieHeader(), ...(init.headers ?? {}) },
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const pair = c.split(';')[0];
    const name = pair.split('=')[0];
    const idx = jar.findIndex((entry) => entry.startsWith(`${name}=`));
    if (idx >= 0) jar[idx] = pair;
    else jar.push(pair);
  }
  return res;
}

const csrf = await (await req('/api/auth/csrf')).json();
await req('/api/auth/callback/credentials', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: EMAIL, password: PASSWORD }).toString(),
});

const created = [];
for (const t of templates) {
  const slug = `bp-${t.id}`.slice(0, 30);
  let res = await req('/api/v1/pages', {
    method: 'POST',
    body: JSON.stringify({ slug, title: t.identity.title, templateId: t.id }),
  });
  let pageId;
  if (res.status === 201) {
    pageId = (await res.json()).page.id;
  } else {
    const list = await (await req('/api/v1/pages')).json();
    pageId = list.pages.find((p) => p.slug === slug)?.id;
    if (!pageId) {
      console.log(`SKIP ${t.id}: ${res.status} ${(await res.text()).slice(0, 80)}`);
      continue;
    }
  }

  const layoutRes = await req(`/api/v1/pages/${pageId}/layout`, {
    method: 'PUT',
    body: JSON.stringify({
      title: t.identity.title,
      bio: t.identity.bio,
      avatarUrl: null,
      layout: t.layout,
      bentoVersion: t.bentoVersion ?? null,
      themeId: t.defaultTheme,
      seoTitle: null,
      seoDesc: null,
      ctaConfig: t.cta,
      themeConfig: { role: t.identity.role },
      blocks: t.blocks.map((b) => ({
        type: b.type,
        size: b.size,
        isVisible: true,
        config: b.config,
        placement: b.placement ?? null,
      })),
    }),
  });
  await req(`/api/v1/pages/${pageId}/publish`, { method: 'POST' });
  // 观察词命中会进 REVIEW，用管理员放行
  await req(`/api/v1/admin/pages/${pageId}/restore`, { method: 'POST' });
  created.push({ id: t.id, slug, layout: layoutRes.status });
}

console.log('已准备页面:', created.map((c) => `${c.id}(${c.layout})`).join(' '));

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
for (const c of created) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/p/${c.slug}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const title = await page.title();
  const tiles = await page.locator('[style*="--b-col"]').count();
  await page.screenshot({ path: `${OUT}/${c.id}.png`, fullPage: true });
  console.log(`${c.id}: tiles=${tiles} title="${title}"`);
  await page.close();
}
await browser.close();
