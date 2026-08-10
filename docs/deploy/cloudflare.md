# Cloudflare Workers 部署（官方托管路径）

> 技术栈：Workers（OpenNext 适配）+ D1（业务库，与 SQLite 同方言、迁移零改造）+ R2（增量缓存）+ D1（tag 缓存，保障发布/隐藏的即时生效）。
> 本地已验证全链路：注册/登录/建页/发布/公开页/统计/缓存失效。

## 前置

- Node ≥ 22（wrangler 硬性要求；仓库其余部分 Node 20 亦可）
- Cloudflare 账号（Workers 付费档 $5/月起——bcrypt 密码哈希超出免费档 CPU 限额）
- `pnpm install` 已完成

## 一、登录与资源创建（一次性）

```bash
cd apps/web
pnpm exec wrangler login
pnpm exec wrangler d1 create yilink-db
pnpm exec wrangler d1 create yilink-tag-cache
pnpm exec wrangler r2 bucket create yilink-inc-cache
```

把两条 `d1 create` 输出的 `database_id` 填入 `apps/web/wrangler.jsonc` 对应条目（替换 `local-placeholder-*`）。

## 二、初始化远端数据库

```bash
pnpm cf:d1:apply:remote        # 业务表（prisma migrate diff 生成的全量 DDL）
pnpm cf:d1:tag:apply:remote    # OpenNext tag 缓存表（revalidations）
```

> schema 变更后：`pnpm cf:d1:schema` 重新生成 `cloudflare/d1-schema.sql`；增量迁移用
> `wrangler d1 execute yilink-db --remote --file <单条迁移.sql>` 按序执行 `prisma/migrations/` 新增目录。

## 三、机密与变量

```bash
pnpm exec wrangler secret put AUTH_SECRET          # ≥32 字节随机值
pnpm exec wrangler secret put AUTH_URL             # https://yilink.app
# 可选：计费与微信分享
pnpm exec wrangler secret put LEMONSQUEEZY_WEBHOOK_SECRET
pnpm exec wrangler secret put WECHAT_JSSDK_APP_ID
pnpm exec wrangler secret put WECHAT_JSSDK_APP_SECRET
```

非机密变量（如 `NEXT_PUBLIC_APP_URL`）已在 `wrangler.jsonc` 的 `vars` 中。

## 四、部署

```bash
pnpm cf:deploy    # = opennextjs-cloudflare build && wrangler deploy
```

首次部署得到 `*.workers.dev` 地址；自定义域名在 Cloudflare 控制台
Workers → yilink → Settings → Domains & Routes 绑定 `yilink.app`（域名需已托管在同账号）。

## 五、本地 Workers 环境（可选，联调用）

```bash
pnpm exec wrangler d1 execute yilink-db --local --file cloudflare/d1-schema.sql
pnpm cf:d1:tag:apply:local
cp .dev.vars.example .dev.vars 2>/dev/null || printf 'AUTH_SECRET=local-dev-only\nAUTH_URL=http://localhost:8787\n' > .dev.vars
pnpm cf:preview   # build + wrangler dev（http://localhost:8787）
```

## 六、边缘限频（托管版必配项）

应用内的静默丢弃只作为最后一道保护，托管版必须在 Cloudflare 控制台的
**Security → WAF → Rate limiting rules** 配置以下三条按 IP 计数的规则。动作可按业务
风险从 Managed Challenge 调整为 Block，但阈值不能高于下表建议值。

| 规则 | 匹配条件（均为 POST） | 阈值 | 建议动作 |
|---|---|---:|---|
| register | 路径为 `/register` 或 `/api/v1/auth/register` | 每 IP 10 次 / 10 分钟 | Managed Challenge，持续 1 小时 |
| login | 路径为 `/login` 或 `/api/auth/callback/credentials` | 每 IP 20 次 / 10 分钟 | Managed Challenge，持续 30 分钟 |
| api-e | 路径为 `/api/e` | 每 IP 120 次 / 1 分钟 | Block，持续 10 分钟 |

这三条规则是托管版上线的必配项：它们提供跨 Worker isolate 的共享限频，避免匿名统计、
注册和登录流量绕过进程内保护并消耗 D1/CPU。

## 七、备份与恢复

仓库中的 `.github/workflows/scheduled.yml` 每日 UTC 20:00（北京时间 04:00）执行两项运维：
调用受 `CRON_SECRET` 保护的 `/api/internal/rollup` 完成昨日统计聚合与 30 天原始事件清理，
并执行 `wrangler d1 export yilink-db --remote`。导出的 SQL 作为 GitHub Actions artifact 保留
30 天。部署前请在 Worker 写入 `CRON_SECRET`，并在 GitHub Actions secrets 同时配置同名、相同
的 `CRON_SECRET` 和具备 D1 权限的 `CLOUDFLARE_API_TOKEN`。

手工恢复必须先导入**空库**，不要直接覆盖仍可能可读的生产库：

```bash
cd apps/web
pnpm exec wrangler d1 create yilink-db-restore
pnpm exec wrangler d1 execute yilink-db-restore --remote --file /path/to/yilink-db.sql
pnpm exec wrangler d1 execute yilink-db-restore --remote --command \
  "SELECT (SELECT COUNT(*) FROM User) AS users, (SELECT COUNT(*) FROM Page) AS pages, (SELECT COUNT(*) FROM Order) AS orders;"
```

核对导入后的用户、主页和订单行数与备份时记录一致后，才将恢复库的 `database_id` 切入
`wrangler.jsonc` 并部署。

### 演练记录（2026-08-06，首次）

| 项 | 结果 |
|---|---|
| 备份来源 | `wrangler d1 export yilink-db --remote`，36 KB |
| 恢复目标 | 新建空库 `yilink-db-restore`（演练后已删除） |
| 行数校验 | 生产 5 users / 7 pages / 0 orders → 恢复库完全一致（另核 24 blocks） |
| 导入统计 | 8 张表、315 行写入 |
| 端到端耗时 | 约 1 分钟（RTO 参考值；RPO ≤ 24h，由每日 scheduled.yml 决定） |
| **注意事项** | **新建 D1 库后立即导入可能因就绪时序失败一次，重试即成功**——脚本化恢复流程需带一次重试 |

结论：备份可恢复、行数无损。下次演练建议在 schema 变更后立即执行。

## 关键实现约定（改代码前必读）

1. **Prisma 官方形态**：`prisma-client-js` + `previewFeatures = ["driverAdapters"]`，**不要**给 generator 配置自定义 `output`；`next.config.ts` 的 `serverExternalPackages: ['@prisma/client', '.prisma/client']` 是 OpenNext 构建期 patch client 适配 workerd 的前提，二者缺一即回退到二进制引擎并在 Workers 崩溃。
2. **D1 不支持交互式事务**：一律「读在事务外、写用 `db.$transaction([...])` 批量形态」。新代码禁止 `db.$transaction(async tx => …)`。
3. **主键禁用 BigInt autoincrement**：D1 adapter 的 Int64 编解码有坑，统一 String cuid。
4. **缓存拓扑**（`open-next.config.ts`）：R2 增量缓存 + D1 tag 缓存——`revalidateTag(tag, { expire: 0 })` 的跨隔离即时失效（审核隐藏/发布 SLA）依赖它，不可降级为内存实现。
5. wrangler 的 `.wasm` 默认按 CompiledWasm 打包，**不要**添加自定义 `rules` 覆盖（会把 WebAssembly.Module 变成 ArrayBuffer 导致引擎实例化失败）。
