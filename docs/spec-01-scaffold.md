# Spec-01：Monorepo 脚手架与基础设施

> 工人：Codex（gpt-5.6-sol）｜验收：Claude 本体｜上位文档：[architecture.md](architecture.md)
> 目标：交付一个**可运行、可测试、可容器化**的空壳应用。只做基础设施，不做业务功能（编辑器/公开页渲染/统计/审核/计费都在后续 spec）。

## 0. 硬性约束

- pnpm workspaces monorepo；TypeScript `strict: true`；Next.js App Router 最新稳定版；Node ≥ 20；`package.json` 写死 `packageManager` 字段
- ESLint + Prettier 统一配置；vitest 单测；Playwright E2E
- **依赖 license 红线：仅 MIT/Apache-2.0/BSD/ISC/CC0；禁止任何 GPL/AGPL 依赖**
- 不引入 Redis/消息队列/CSS-in-JS 运行时（样式用 Tailwind CSS）
- 不得修改 `docs/**` 下任何文件；不执行 `git commit`（交付工作区变更即可）

## 1. 交付文件清单

```
package.json / pnpm-workspace.yaml / turbo 不引入
tsconfig.base.json  .eslintrc  .prettierrc
apps/web/
  package.json  next.config.ts  tailwind.config.ts  middleware.ts
  src/app/(marketing)/page.tsx            # 营销首页占位：产品一句话 + GitHub 链接
  src/app/(auth)/login/page.tsx           # 登录表单（错误态、zod 校验）
  src/app/(auth)/register/page.tsx        # 注册表单（邮箱+密码，密码强度提示）
  src/app/studio/layout.tsx               # 登录保护 + 侧边导航（我的主页/数据/设置 三个占位路由）
  src/app/studio/page.tsx
  src/app/p/[slug]/page.tsx               # 公开页占位（渲染 slug + "coming soon"）
  src/app/api/health/route.ts             # GET → {ok:true, version}
  src/app/api/v1/auth/register/route.ts   # POST 注册
  src/lib/auth.ts                         # Auth.js v5 配置
  src/lib/db.ts                           # Prisma client 单例
  src/i18n/{zh-CN,en}.json + next-intl 装配（zh-CN 默认）
  prisma/schema.prisma                    # 一字不差采用 architecture.md §4（允许补充 @@index）
  .env.example                            # 全部 env 及注释（见 §3）
packages/shared/
  src/blocks.ts                           # BlockType zod schemas（architecture.md §4 七种）
  src/theme.ts                            # 主题 token 的 zod schema（palette/background/font/radius/buttonStyle）
  src/index.ts  package.json  tsconfig.json
packages/icons/
  package.json  README.md  src/index.ts   # 仅目录骨架 + 1 个示例图标（wechat）+ 元数据类型定义
packages/moderation/
  src/provider.ts                         # ModerationProvider 接口：check(payload)→{verdict:'pass'|'review'|'block', labels:string[]}
  src/local-words.ts                      # 本地词库实现（词库文件留空数组占位）
  package.json  tsconfig.json
docker/Dockerfile                         # multi-stage，standalone 输出
docker/docker-compose.yml                 # web + sqlite 卷；postgres 服务注释掉备用
.github/workflows/ci.yml                  # install → lint → typecheck → test → build
.gitignore  CONTRIBUTING.md（含 AGPL 红线一节） LICENSE（Apache-2.0）
```

## 2. 行为要求

1. **认证**：Auth.js v5，Credentials Provider（bcrypt 校验）+ GitHub OAuth（仅当 `GITHUB_ID/GITHUB_SECRET` 存在时注册该 Provider）。注册接口做：邮箱格式校验、密码 ≥ 8 位、重复邮箱 409。session 用 JWT 策略。
2. **middleware 域名路由**：读 `PAGES_HOST`。请求 Host 命中时：`/` → rewrite `/p/_home`（占位），`/{slug}` → rewrite `/p/{slug}`，其余路径 404；未配置 `PAGES_HOST` 时不做 host 判断（单域模式）。`/studio/**` 未登录重定向 `/login`。
3. **i18n**：next-intl；语言协商 cookie + Accept-Language，默认 zh-CN；登录/注册/导航文案双语齐全。
4. **Prisma**：migration 提交入库；`pnpm db:migrate`（dev）与 `pnpm db:deploy` 脚本；SQLite 默认路径 `./data/yilink.db`。

## 3. .env.example（必须逐项带中文注释）

`DATABASE_URL`（默认 sqlite）、`AUTH_SECRET`、`AUTH_URL`、`GITHUB_ID?`、`GITHUB_SECRET?`、`PAGES_HOST?`、`MULTI_USER=false`、`NEXT_PUBLIC_APP_NAME=一链 YiLink`

## 4. 验收标准（完成后逐条执行，输出贴在报告末尾）

1. `pnpm install` && `pnpm db:migrate` && `pnpm build` 全部零错误
2. `pnpm lint` && `pnpm typecheck` && `pnpm test` 零错误（shared 包的 zod schema 至少 10 个单测：七种 block 各 1 合法 + 3 个非法输入）
3. `pnpm dev` 下：`curl localhost:3000/api/health` 返回 `{ok:true}`；注册→登录→访问 /studio 的 Playwright E2E 通过（`pnpm e2e`；若沙箱装不了浏览器，测试代码照常交付并在报告说明，由验收方执行）
4. Docker：Dockerfile 与 compose 交付且 `docker build` 语法自检通过（沙箱无 docker daemon 时说明即可，由验收方实跑）
5. 报告末尾列出 `pnpm ls --depth 0` 的直接依赖清单及各自 license（人工核对红线用）

## 5. 明确不做

页面美化（用 Tailwind 默认即可）、主题系统实装、区块编辑、统计、审核逻辑、计费、图标批量、部署文档。
