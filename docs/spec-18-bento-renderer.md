# Spec-18：BENTO 公开页渲染器（P1 第一路）

> 工人：Codex（gpt-5.6-sol）｜验收：Claude 本体（浏览器视觉 + 基线零 diff）
> 上位：[plan-free-layout.md](plan-free-layout.md)、[advice-layout-codex.md](advice-layout-codex.md) §4；引擎已就绪于 `packages/shared/src/layout/bento.ts`（`normalizeBentoLayout` / `compact` / `firstFitFallback` / `BENTO_COLUMNS=4`）
> 工区：**只许改** `apps/web/src/components/public/bento-flow.tsx`（新建）、`apps/web/src/components/public/public-page.tsx`（仅新增 BENTO 分支与 props）、`apps/web/src/components/public/public-page.module.css`（仅追加 BENTO 样式类，**不得修改任何既有类**）、`apps/web/src/app/p/[slug]/page.tsx`（仅查询字段与分支）+ 测试。禁止改编辑器、API、prisma、依赖锁；不 git commit。

## 执行纪律（同 spec-17 §4.5，硬要求）

分段落盘：§1 渲染组件 → §2 CSS → §3 页面分支与防御 → §4 测试。每节完成立刻写文件+跑测试+向 `/tmp/codex-bento-renderer-progress.md` 追加一行进度。禁止攒到最后。卡住则跳过并记录。

## 1. BentoFlow 组件（服务端，无 'use client'）

```tsx
<BentoFlow blocks={resolved} uaClass={uaClass} reportEmail={...} />
```

- 入参为已过滤（isVisible + CTA 去重）的 blocks；**组件内部先调 `compact()` 重新压紧**（过滤会留洞），再渲染
- 每块渲染为 `<div class={styles.bentoItem} style={{'--b-col','--b-row','--b-w','--b-h'}}>`，内部复用现有的七种 block 视图（从 public-page.tsx 抽出可复用渲染函数，**不改其 DOM 结构与既有 class**）
- placement 缺失/非法 → 用 `firstFitFallback` 生成通栏安全布局，**绝不 500、绝不重叠**
- BENTO 下**不做「连续 LINK 合成 LinkGroup」**（混排后无稳定边界）：每个 LINK 独立成 tile，整个网格用单个 `<section aria-label="页面内容">` 包裹
- DOM 顺序 = `position` 顺序（引擎已保证与 y,x 一致），**不使用 CSS order 或 dense**

## 2. CSS（仅追加）

```css
.bentoGrid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr));
  grid-auto-rows:var(--bento-row-unit,12px); gap:var(--gap); align-items:stretch; }
.bentoItem { grid-column:var(--b-col)/span var(--b-w); grid-row:var(--b-row)/span var(--b-h);
  min-width:0; min-height:0; overflow:hidden; }
```

- `--bento-row-unit` 由 `themeStyle()` 从主题 `grid.gap` 派生（gap=12→12px，gap=14→10.5px，使 h=4 恒为 84px），解析失败回退 12px
- 各 block 视图补 BENTO 填充：IMAGE `object-fit:cover` 撑满；TEXT 按高度档 line-clamp；SOCIAL 按可用高度换行；QR 保持正方形不裁码；WECHAT 复制按钮始终可见
- **绝不使用绝对定位塞内容**，只有外层 grid placement 是定位系统

## 3. 页面分支与防御

`app/p/[slug]/page.tsx`：查询增 `bentoVersion`（Page）与 `placement`（Block）；渲染分支：

```tsx
page.bentoVersion === 1 ? <BentoFlow .../> : <ContentFlow .../>   // 旧分支一字不改
```

## 4. 测试

- vitest ≥10：compact 在过滤后被调用、非法 placement 走 firstFit、CSS 变量输出正确、BENTO 下不生成 LinkGroup、DOM 顺序与 position 一致、row-unit 派生
- e2e 增 `bento-render.spec.ts`：构造一个 `bentoVersion=1` 的夹具页（含通栏块、半宽块、高块、缺 placement 的块），在 320/375/480px 截图；**并断言 `layout-baseline.spec.ts` 全部 9 例仍通过（旧页面零 diff）**
- 断言公开页内联脚本大小无增长（≤5KB）、client chunk 无新增

## 5. 验收

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿（判定输出完整贴报告，不过管道）；`git status --short` 贴报告；报告须写明「既有 CSS 类零修改」的自证方式。
