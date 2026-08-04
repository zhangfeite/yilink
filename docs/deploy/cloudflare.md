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

## 关键实现约定（改代码前必读）

1. **Prisma 官方形态**：`prisma-client-js` + `previewFeatures = ["driverAdapters"]`，**不要**给 generator 配置自定义 `output`；`next.config.ts` 的 `serverExternalPackages: ['@prisma/client', '.prisma/client']` 是 OpenNext 构建期 patch client 适配 workerd 的前提，二者缺一即回退到二进制引擎并在 Workers 崩溃。
2. **D1 不支持交互式事务**：一律「读在事务外、写用 `db.$transaction([...])` 批量形态」。新代码禁止 `db.$transaction(async tx => …)`。
3. **主键禁用 BigInt autoincrement**：D1 adapter 的 Int64 编解码有坑，统一 String cuid。
4. **缓存拓扑**（`open-next.config.ts`）：R2 增量缓存 + D1 tag 缓存——`revalidateTag(tag, { expire: 0 })` 的跨隔离即时失效（审核隐藏/发布 SLA）依赖它，不可降级为内存实现。
5. wrangler 的 `.wasm` 默认按 CompiledWasm 打包，**不要**添加自定义 `rules` 覆盖（会把 WebAssembly.Module 变成 ArrayBuffer 导致引擎实例化失败）。
