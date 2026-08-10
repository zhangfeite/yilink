/**
 * BENTO 模板合身体检：内容是否装得下格子、是否被省略号截断、版面有没有空洞。
 *
 * 这三件事程序化能测，肉眼反而容易漏（半行截断在缩略图上看不出来）。改模板坐标或文案后跑一遍。
 * 需要本地已有对应预览页（见 bento-preview.mjs），默认 slug 前缀 bp-。
 *
 * 用法：BASE=http://localhost:3000 node scripts/bento-fit-check.mjs
 * 退出码非 0 表示有不合身的块。
 *
 * 注意：本地 D1 改动不会让 unstable_cache 失效，跑之前要删掉整个 .next 并重启 dev（只删 .next/cache 不够）。
 */
import { readFileSync } from 'node:fs';
import { chromium, devices } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const PREFIX = process.env.SLUG_PREFIX ?? 'bp-';
const templates = JSON.parse(readFileSync('src/templates/templates.json', 'utf8'));

/** 坐标层面的空洞行：整行不足 4 列即为留白，连续多行会看成「版面没排满」。 */
function holeRows(template) {
  const placed = template.blocks.filter((b) => b.placement).map((b) => b.placement);
  if (!placed.length) return { rows: 0, total: 0 };
  const total = Math.max(...placed.map((p) => p.y + p.h));
  let rows = 0;
  for (let y = 0; y < total; y += 1) {
    const used = placed
      .filter((p) => p.y <= y && y < p.y + p.h)
      .reduce((sum, p) => sum + p.w, 0);
    if (used < 4) rows += 1;
  }
  return { rows, total };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
let bad = 0;

for (const template of templates) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${'p'}/${PREFIX}${template.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);

  const problems = await page.evaluate(() => {
    const found = [];
    for (const tile of document.querySelectorAll('[style*="--b-col"]')) {
      const w = tile.style.getPropertyValue('--b-w');
      const h = tile.style.getPropertyValue('--b-h');
      const where = `w=${w} h=${h}`;
      // 纵向装不下：文本/贴纸容器的内容高超过自身裁切框，会露出半行
      for (const selector of [
        '[class*="linkText"] small',
        '[class*="linkText"] strong',
        '[class*="markdown"]',
        '[class*="stickerGrid"]',
        '[class*="wechatCard"]',
        '[class*="qrCard"]',
      ]) {
        for (const el of tile.querySelectorAll(selector)) {
          const over = el.scrollHeight - el.clientHeight;
          if (over > 2) found.push(`${where} 欠高 ${Math.round(over)}px（${selector}）`);
        }
      }
      // 横向被省略号吃掉：单行卡的描述被截断，往往正好丢掉关键词
      for (const el of tile.querySelectorAll('[class*="linkText"] small, [class*="linkText"] strong')) {
        if (el.scrollWidth > el.clientWidth + 1) {
          found.push(`${where} 截断「${el.textContent.trim()}」`);
        }
      }
    }
    return found;
  });

  const holes = holeRows(template);
  const ok = problems.length === 0 && holes.rows <= 3;
  if (!ok) bad += 1;
  console.log(
    `${ok ? '✅' : '❌'} ${template.id.padEnd(24)} 空洞 ${holes.rows}/${holes.total} 行` +
      (problems.length ? `\n   ${problems.join('\n   ')}` : ''),
  );
  await page.close();
}

await browser.close();
console.log(bad ? `\n${bad} 个模板不合身` : '\n全部模板合身');
process.exitCode = bad ? 1 : 0;
