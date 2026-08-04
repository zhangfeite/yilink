# Vercel 与海外托管部署

## 当前兼容性状态

当前代码库不能直接作为 PostgreSQL + Vercel 的生产部署使用：

- [Prisma schema](../../apps/web/prisma/schema.prisma) 的 datasource 明确为 SQLite。
- 已提交的 Prisma migration 也是 SQLite migration。
- Docker Compose 的持久化方案依赖挂载到 <code>/data</code> 的 named volume。

因此，仅把 <code>DATABASE_URL</code> 改成 PostgreSQL URL 会失败。请先完成 PostgreSQL schema、migration 和数据迁移支持，再继续本页的托管部署步骤。该限制也适用于其他需要外部 PostgreSQL 的无状态托管平台。

## PostgreSQL 就绪后所需环境变量

完成兼容改造后，在 Vercel 项目的 Preview 与 Production 环境分别配置以下变量。数据库凭据应来自已选定的托管 PostgreSQL 服务。

| 变量                                                                                     | 示例或要求                                                         |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| <code>DATABASE_URL</code>                                                                | <code>postgresql://USER:PASSWORD@HOST:5432/DB?schema=public</code> |
| <code>AUTH_SECRET</code>                                                                 | 生产环境使用高强度随机值，且不得提交到仓库。                       |
| <code>AUTH_URL</code>                                                                    | 对应环境的完整 HTTPS 地址。                                        |
| <code>PAGES_HOST</code>                                                                  | 可选的公开主页独立域名。                                           |
| <code>NEXT_PUBLIC_APP_URL</code>                                                         | 可选；未设置 <code>PAGES_HOST</code> 时用于二维码链接。            |
| <code>GITHUB_ID</code> / <code>GITHUB_SECRET</code>                                      | 可选；同时配置时启用 GitHub 登录。                                 |
| <code>LEMONSQUEEZY_WEBHOOK_SECRET</code>                                                 | 可选；LemonSqueezy Webhook 的 HMAC-SHA256 密钥。                   |
| <code>LEMONSQUEEZY_VARIANT_MINI</code> / <code>LEMONSQUEEZY_VARIANT_PRO</code>           | 可选；基础与完整买断套餐的 variant ID。                            |
| <code>LEMONSQUEEZY_CHECKOUT_URL_MINI</code> / <code>LEMONSQUEEZY_CHECKOUT_URL_PRO</code> | 可选；两个套餐的 HTTPS 结账链接。                                  |
| <code>NEXT_PUBLIC_PRICE_MINI</code> / <code>NEXT_PUBLIC_PRICE_PRO</code>                 | 可选；用户设置页展示的价格文案。                                   |

Next.js 会在构建时处理 <code>NEXT_PUBLIC_</code> 前缀的变量，因此应为 Preview 和 Production 分别核对值。[Vercel 的框架环境变量文档](https://vercel.com/docs/environment-variables/framework-environment-variables) 说明了这一行为。

## Vercel 项目配置

仓库是 pnpm workspace。完成 PostgreSQL 兼容改造后，在 Vercel 导入仓库并使用以下设置：

| 设置                 | 值                                                                     |
| -------------------- | ---------------------------------------------------------------------- |
| Root Directory       | <code>.</code>                                                         |
| Framework Preset     | Next.js                                                                |
| Install Command      | <code>pnpm install --frozen-lockfile</code>                            |
| Build Command        | <code>pnpm --filter @yilink/web build</code>                           |
| Output Directory     | 留空，使用 Next.js 默认检测。                                          |
| Node.js              | 20                                                                     |
| Environment Variable | <code>ENABLE_EXPERIMENTAL_COREPACK=1</code>，确保使用仓库声明的 pnpm。 |

Vercel 支持 pnpm workspace monorepo，并允许在项目设置中覆盖安装与构建命令；详细规则见 [Vercel monorepo 文档](https://vercel.com/docs/monorepos) 与 [Build 配置文档](https://vercel.com/docs/builds/configure-a-build)。

## 部署前检查

在连接生产项目之前，至少完成以下检查：

1. 使用目标 PostgreSQL URL 运行 <code>pnpm --filter @yilink/web db:deploy</code>。
2. 使用同一组环境变量运行 <code>pnpm build</code>。
3. 验证注册、登录、公开主页、二维码和统计请求可访问。
4. 为 Preview 与 Production 分别设置数据库、Auth.js 和 OAuth 回调地址。

Vercel CLI 可用于在本地拉取项目设置并执行平台构建：

```bash
npx vercel pull
npx vercel build
```

命令的行为和产物位置以 [Vercel CLI build 文档](https://vercel.com/docs/cli/build) 为准。
