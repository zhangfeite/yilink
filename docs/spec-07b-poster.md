# Spec-07b：分享海报（客户端 Canvas 生成）

> 工人：Codex（gpt-5.6-sol）｜验收：Claude 本体（浏览器实测三主题下载）｜上位：[design-direction.md](design/design-direction.md)（法则一/二/三/七直接约束海报版式）
> 方案背景：服务端 satori 需打包 ~10MB 中文字体进开源仓库，故改为浏览器 Canvas（系统中文字体零资产）。
> 工区：**只许改** `apps/web/src/lib/poster.ts`（新建，纯客户端 util）、`apps/web/src/components/studio/share-panel.tsx`（新建）、`apps/web/src/components/studio/page-editor.tsx`（仅接入分享面板入口）+ 测试。**禁止**：动渲染器/API/依赖/docs；不 git commit。

## 1. 分享面板（编辑器顶栏「分享」按钮弹出）

整合现有分散能力 + 新增海报：
- 复制链接（现有逻辑挪入）
- 下载二维码（现有 /qr 链接挪入）
- **生成海报**：预览 + 「下载海报」按钮；尺寸两档：1080×1440（通用 3:4）、1080×1920（竖屏 story）

## 2. 海报版式（Canvas 绘制，读当前页主题 token）

自上而下（3:4 档，1920 档等比拉开留白）：
1. 背景 = 主题 pageBg（gradient 用 CanvasGradient 近似线性）+ 深色主题保持深底
2. 白/深卡片圆角矩形（主题 card 色 + 大圆角），内含：头像（圆形，avatarUrl 加载失败或 CORS 污染时回退 accent 底+首字，**先 fetch blob 再画避免 taint**）、昵称（系统字体栈 800 字重 ~72px）、role 副题、bio ≤2 行截断
3. 二维码：fetch `/api/v1/pages/{id}/qr?format=png&size=512`（同源带 session）画入白底圆角小卡，下方 12px 灰字「打开相机扫码访问」（法则七：相机优先于微信扫）
4. 短链接文本（PAGES_HOST/slug 或站点域名/p/slug）accent 色 600 字重
5. 底部「Powered by 一链 YiLink」浅灰小字

反面清单适用：不许整版实心彩块、不许 emoji 图标；层级与留白对齐主页观感。

## 3. 实现要求

- `poster.ts` 导出 `generatePoster(opts) => Promise<Blob>`：纯函数式、不依赖 React；devicePixelRatio 固定 2 保证清晰度；toBlob('image/png')
- 头像与二维码并行加载；任一失败走回退（二维码失败则海报按钮禁用并提示）
- share-panel 为 client 组件；生成中 loading 态；下载文件名 `yilink-{slug}-poster.png`

## 4. 测试与验收

- vitest（jsdom 可 mock canvas 2d context）≥5：版式计算函数（文本截断/布局坐标）、回退分支、文件名
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；`git status --short` 贴报告
- 视觉验收由验收方浏览器实测：三个 demo 主题各下载一张海报肉眼评审
