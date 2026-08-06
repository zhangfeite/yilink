# Spec-15：统计防伪与数据运维闭环

> 工人：Codex（gpt-5.6-terra）｜验收：Claude 本体｜依据：[iteration-plan-wave5.md](iteration-plan-wave5.md) A4/A5/A6、[advice-codex.md](advice-codex.md) 风险 3/4/5
> 工区：**只许改** `apps/web/src/lib/stats.ts`、`apps/web/src/app/api/e/**`、`apps/web/src/app/api/internal/**`（新建）、`apps/web/src/app/api/health/route.ts`、`apps/web/scripts/rollup-daily.mjs`、`apps/web/src/lib/billing.ts`（仅 raw 精简处）、`.github/workflows/scheduled.yml`（新建）、`docs/PRD.md`（仅隐私一行）、`docs/deploy/cloudflare.md`（仅新增运维节）、`apps/web/.env.example` + 测试。**禁止动 prisma schema**（本 wave 归 spec-14）；不动依赖锁文件；不 git commit。

## 1. 统计防伪

- `/api/e`：`blockId` 必须归属该 `pageId`（一次查询验证，不属→静默 204 丢弃）；VIEW 去重——同 `ipHash+pageId+小时桶` 已存在 VIEW 则不再写（存在性查询，无 schema 变更）；CLICK 不去重但同键每小时上限 30 条
- IP 解析：仅信 `CF-Connecting-IP`（Cloudflare 注入）；无该头（本地/自部署直连）才退 `x-forwarded-for` 首段，并在注释说明部署前提
- 文档：`docs/deploy/cloudflare.md` 新增「边缘限频」节——给出 Cloudflare WAF Rate Limiting 规则建议配置（register/login/api-e 三条，含阈值），说明这是托管版必配项

## 2. 数据运维闭环

- 新建受保护端点 `POST /api/internal/rollup`：`Authorization: Bearer ${CRON_SECRET}` 校验（env 缺失→503）；执行与 rollup-daily.mjs 同逻辑的「昨日聚合 + 30 天前原始事件清理」（**留存 90→30 天**，本地脚本同步改）＋ spec-14 的软删除 30 天硬清理钩子（若其函数已就位则调用，未就位留 TODO 注释）
- `.github/workflows/scheduled.yml`：每日 UTC 20:00（北京 4:00）两个 job——①curl 调 rollup 端点（secrets.CRON_SECRET）；②`wrangler d1 export yilink-db --remote` 产物上传 workflow artifact（保留 30 天）作为每日备份（用 secrets.CLOUDFLARE_API_TOKEN，Node 22）
- 健康检查：`/api/health` 增加轻量 DB 读（`SELECT 1` 级），DB 异常时返回 503 `{ok:false}`；保持无鉴权
- `billing.ts`：`Order.raw` 改存精简字段（订单号/变体/金额/邮箱域/事件名/时间），不再整包落库
- `docs/PRD.md` 隐私行改为与实现一致：「访客标识仅存日盐哈希；原始事件保留 30 天后仅存聚合」
- `docs/deploy/cloudflare.md` 新增「备份与恢复」节：每日导出机制、手工恢复步骤（空库 import + 校验行数）、恢复演练由验收方执行记录

## 3. 测试与验收

- vitest ≥10：blockId 归属拒绝；VIEW 去重/CLICK 上限；CF-Connecting-IP 优先；rollup 端点鉴权（对/错/缺 503）；30 天清理边界；health DB 异常 503
- 全套验收命令输出完整贴出（判定行不过管道）；`git status --short` 贴报告
