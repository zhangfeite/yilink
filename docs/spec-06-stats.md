# Spec-06：统计管道（采集 → 聚合 → 报表）

> 工人：Codex（gpt-5.6-terra）｜验收：Claude 本体｜上位：[architecture.md](architecture.md) §3/§4（ClickEvent/DailyStat 模型、隐私要求）
> 工区：**只许改** `apps/web/src/app/api/e/route.ts`（新建）、`apps/web/src/app/api/v1/pages/[id]/stats/route.ts`（替换占位实现）、`apps/web/src/lib/stats.ts`（新建，可复用 lib/ua.ts）、`apps/web/middleware.ts`（仅按 §3 放行 /api/e）、`apps/web/src/components/public/interaction-script.ts`（追加 beacon）、`apps/web/scripts/rollup-daily.mjs`（新建，纯 JS，Node 20 兼容）、`apps/web/package.json`（仅加 `stats:rollup` script）+ 对应测试。**禁止**：其他一切文件、依赖与锁文件、docs、git commit。

## 1. 采集 `POST /api/e`

- 无鉴权；body `{pageId, blockId?, kind:'VIEW'|'CLICK'}` zod 校验；page 不存在或未 PUBLISHED → 静默 204（不给探测面）
- 服务端派生：`tsBucket`=当前小时；`uaClass`（wechat/weibo/qq/douyin/browser/bot，bot 直接丢弃）；`refClass`（referer 域名粗分：wechat/weibo/zhihu/bilibili/search/direct/other）；`ipHash`=sha256(ip + AUTH_SECRET + UTC 日期)——**不落原始 IP，不进 URL 参数**（PIPL）
- 简易限频：内存桶 每 ipHash 60 次/分钟，超限 204 丢弃（单实例够用，注释说明托管版换 Redis 的位置）
- 响应一律 204 空体

## 2. 报表 `GET /api/v1/pages/:id/stats`（保持既有响应形状）

- `{views, uniques, clicks, daily:[{date, views, uniques, clicks}]}`：近 30 天；DailyStat 已聚合天数直接读，今天实时从 ClickEvent groupBy 计算合并
- uniques 口径=当日去重 ipHash；跨天不去重（写进注释）
- 公开页 ConversionBar 的「累计访问」数据源与本口径统一（检查 spec-05 的 totalViews 取数处，保持一致，允许小改其取数函数）

## 3. 打通链路

- `middleware.ts`：PAGES_HOST 分支放行 `POST /api/e`（其余 /api 仍 404）——修复已记录的隐患
- `interaction-script.ts`：页面加载发 VIEW（sendBeacon，退化 fetch keepalive）；链接卡/贴纸点击发 CLICK（data-block-id 属性已有则用，没有则补渲染属性——此文件与链接卡组件的 data 属性是本 spec 与 spec-05 的既定接口，可小改 public-page.tsx **仅限添加 data 属性**）
- `scripts/rollup-daily.mjs`：把昨日 ClickEvent 聚合写入 DailyStat（upsert 幂等）并删除 90 天前原始事件；`pnpm stats:rollup` 可跑；自部署 cron 用法写进脚本头注释

## 4. 测试与验收

- vitest ≥10：/api/e 合法/非法/未发布静默/限频；uaClass/refClass 分类；stats 聚合（种入 ClickEvent 断言口径）；rollup 幂等
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；`git status --short` 贴报告；curl 序列（发事件→查报表）写进报告由验收方实测
