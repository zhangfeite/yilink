# Spec-07：页面二维码接口

> 工人：Codex（gpt-5.6-terra）｜验收：Claude 本体｜依赖 `qrcode`（已预装，勿动锁文件）
> 工区：**只许改** `apps/web/src/app/api/v1/pages/[id]/qr/route.ts`（新建）、`apps/web/src/lib/qr.ts`（新建）+ 测试。禁止其他一切；不 git commit。

## 1. `GET /api/v1/pages/:id/qr`

- 鉴权：仅页主（复用现有 auth + 404 语义）
- 参数：`format=png|svg`（默认 png）、`size`（px，256-1024 夹取，默认 512，仅 png 生效）
- 内容：页面绝对 URL——`PAGES_HOST` 配置时用 `https://{PAGES_HOST}/{slug}`，否则 `NEXT_PUBLIC_APP_URL`（.env.example 补该变量+注释）回退 request origin + `/p/{slug}`
- 纠错级别 M；正确 Content-Type 与 `Content-Disposition: attachment; filename="yilink-{slug}.{ext}"`；`logo` 参数保留：出现即 501 `NOT_IMPLEMENTED`（海报与 logo 合成在 wave-4 客户端方案）
- 缓存头：`private, max-age=3600`

## 2. 测试与验收

- vitest ≥6：svg 输出含 `<svg` 且内容可扫描性由结构断言（模块矩阵非空）；png 魔数 `89 50 4E 47`；size 夹取；非页主 404；未登录 401；logo 501
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；`git status --short` 贴报告
