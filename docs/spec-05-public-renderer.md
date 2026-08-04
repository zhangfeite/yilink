# Spec-05：公开页渲染器（/p/[slug]）

> 工人：Codex（gpt-5.6-sol）｜验收：Claude 本体（含浏览器视觉评审，对标 docs/design/theme-preview.html）
> 上位文档：[architecture.md](architecture.md) §6、[design-direction.md](design/design-direction.md)（八条法则+反面清单=视觉验收标准）、`docs/design/themes.json`（8 主题 token，v2 schema）、`docs/design/theme-preview.html`（成品视觉基准，CSS 结构可参考移植）
> 并行约定（严格遵守）：**只允许改动** `apps/web/src/app/p/**`、`apps/web/src/components/public/**`（新建）、`apps/web/src/lib/themes.ts`、`apps/web/src/lib/ua.ts`（新建）、`apps/web/src/themes/themes.json`（从 docs/design 拷贝）、`apps/web/prisma/seed.ts`（新建）+ package.json 仅允许加 `db:seed` script。**禁止**：动 `/api/v1/**`（spec-04 工区）、动 packages/icons、增删依赖、改 pnpm-lock.yaml、改 prisma schema、改 docs/**、git commit。

## 1. 交付

1. **主题装载**：`docs/design/themes.json` 拷入 `apps/web/src/themes/themes.json`；`lib/themes.ts` 读取并用 `@yilink/shared` 的 theme zod schema 在模块加载时校验（校验失败直接 throw，fail fast）；导出 `getTheme(id)`（未知 id 回退 minimal-light）
2. **渲染器** `/p/[slug]`：
   - 数据：prisma 查 `status=PUBLISHED` 的 page + 可见 blocks（position 序）；非 PUBLISHED → `notFound()`（HIDDEN 页渲染中性「页面暂不可用」占位，不渲染任何用户内容，无羞辱字样）
   - 缓存：`unstable_cache` 或 fetch-cache 等价机制，tag = `pageCacheTag(slug)`（从 `@yilink/shared` 引入）
   - 版式：照 theme-preview.html 的成品结构实现——不对称身份卡（display 大字+右上悬置头像）、节标题、链接卡（列表/网格两布局，Block.size 映射 SM/MD/LG）、贴纸行（SOCIAL block，先用 `packages/icons` 当前已有的导出；若图标缺失回退首字母圆片）、TEXT（markdown 白名单渲染：粗斜体/链接/列表，无原始 HTML）、IMAGE、WECHAT 卡（一键复制+可选二维码图）、DIVIDER、吸底转化条（page.ctaConfig 非空时渲染；**转化唯一性**：ctaConfig.type==='wechat' 时自动隐藏 WECHAT block）、页脚「Powered by 一链 YiLink」
   - 主题应用：token → CSS 变量内联到页面根元素（变量名沿用 preview：--card/--text/--accent/--r-card/--d-size…）
3. **头部与微信适配**：
   - `generateMetadata`：title=seoTitle||title，description，og:title/og:description/og:image（头像，绝对 URL）
   - `lib/ua.ts`：UA 分类（wechat/weibo/qq/douyin/browser/bot）；微信内：链接卡 config 带 `isAppDownload:true` 时（blocks schema 已有该字段？——没有则在渲染层按 URL 后缀 .apk 判断，不改 shared）降级为「复制链接」按钮
   - 性能预算：公开页零框架 JS 直出——客户端只允许一段 ≤5KB 内联脚本（复制微信号/复制链接/CTA toast/统计占位函数 `window.__yl_e` 空实现）；所有交互不依赖 React hydration（RSC + 原生 DOM 事件）
4. **种子数据** `prisma/seed.ts`：demo 用户 + 3 个已发布主页 `demo-illustrator`/`demo-photographer`/`demo-developer`，内容照 theme-preview.html 三个场景预设（含 ctaConfig）；`pnpm db:seed` 可重复执行（upsert）

## 2. 验收（逐条执行贴输出）

1. `pnpm lint && pnpm typecheck && pnpm build` 零错误；`pnpm db:seed` 成功
2. `curl localhost:3000/p/demo-photographer` 的 HTML：含 og 标签、含 ink-dark 的 --card 变量值、含「约拍套餐」文本——三段 grep 结果贴报告
3. `curl -A "MicroMessenger" localhost:3000/p/demo-illustrator` 正常 200（微信 UA 不报错）
4. 未发布/不存在 slug → 404；`git status --short` 贴报告（证明未越区）
5. 视觉验收由验收方浏览器执行（375px 对照 theme-preview 三预设），报告无需截图
