# Spec-04：Pages / Blocks API 层（/api/v1）

> 工人：Codex（gpt-5.6-terra）｜验收：Claude 本体｜上位文档：[architecture.md](architecture.md) §4/§5
> 并行约定（严格遵守）：**只允许改动** `apps/web/src/app/api/v1/**`、`apps/web/src/lib/**`（新增文件为主）、`packages/shared/src/**`（仅新增 schema 文件+index 导出行）与对应测试文件。**禁止**：改 prisma schema、跑 migrate、动 `src/app/p/**`、动 `packages/icons`、增删依赖、改 pnpm-lock.yaml、改 docs/**、git commit。

## 1. 端点清单（全部 zod 校验，错误统一 `{error:{code,message}}`，未登录 401 `UNAUTHORIZED`，越权 404 处理）

| 端点 | 方法 | 行为 |
|---|---|---|
| `/api/v1/me` | GET | 当前用户（id/email/name/plan） |
| `/api/v1/me` | PATCH | 改 name（1-30 字符） |
| `/api/v1/me/export` | GET | 全量导出 JSON：user + pages + blocks（信任承诺，Content-Disposition 附件） |
| `/api/v1/pages` | GET | 我的主页列表（含 blocks 计数） |
| `/api/v1/pages` | POST | 建页：{slug,title,templateId?}；slug 校验用 `@yilink/shared` 的 `SLUG_PATTERN` + `RESERVED_SLUGS`，冲突 409 `SLUG_TAKEN` |
| `/api/v1/pages/:id` | GET/PATCH/DELETE | 元信息读改删；PATCH 可改 title/bio/avatarUrl/layout/themeId/seoTitle/seoDesc/ctaConfig（ctaConfig schema：`{type:'wechat'\|'link', label:1-12字, value:string} \| null`，新增 zod 定义进 `packages/shared/src/cta.ts` 并从 index 导出） |
| `/api/v1/pages/:id/blocks` | PUT | 区块全量替换：数组 ≤50 项，每项 {type,size,isVisible,config}，config 按 `@yilink/shared` 对应 block schema 校验；事务内 deleteMany+createMany，position 按数组序 |
| `/api/v1/pages/:id/publish` | POST | 发布：调 `@yilink/moderation` local-words provider 检查 title/bio/全部 block 文本与 URL → `block` 则 422 `MODERATION_BLOCKED`（不改状态）；通过则 status=PUBLISHED、publishedAt=now、`revalidateTag(pageCacheTag(slug))` |
| `/api/v1/pages/:id/unpublish` | POST | status=DRAFT + revalidateTag |
| `/api/v1/pages/:id/stats` | GET | 本 wave 返回占位：{views:0,uniques:0,clicks:0,daily:[]}（spec-06 实装，接口形状先定死） |

## 2. 实现要求

- 鉴权：复用 `auth()`（Auth.js）；所有 pages 路由校验 `page.userId === session.user.id`，不匹配一律 404（不泄露存在性）
- 每用户主页数上限：FREE 3 个（常量放 shared），超限 403 `PAGE_LIMIT`
- 输入输出类型从 zod infer，禁止手写重复 interface
- `revalidateTag` 用 `next/cache`；tag 一律来自 `pageCacheTag()`（不许字符串字面量）

## 3. 测试（vitest，不需要起服务器）

- 路由 handler 直接调用测试：mock `auth()`（vi.mock）与真实 SQLite 测试库（`DATABASE_URL=file:./data/test.db`，beforeEach 清表）
- 覆盖：建页成功/slug 非法/保留字/重复；blocks PUT 合法与非法 config；publish 触发审核 block 与通过路径；越权访问 404；export 结构完整
- ≥ 18 个用例；`pnpm test` 全绿

## 4. 验收（完成后逐条执行，输出贴报告末尾）

1. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 零错误
2. `git status --short` 输出贴报告（证明未越区改动）
3. 报告列出每个端点的 curl 示例（验收方将起服实测）
