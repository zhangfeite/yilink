# spec-19：公测激活基础设施（漏斗里程碑 · 渠道归因 · 邀请码核销 · 反馈入口 · 生产巡检）

> 派单对象：Codex（gpt-5.6-terra）。工作区：`feat/activation` 分支。
> 背景：[PROGRESS.md](PROGRESS.md)「迭代路线 · 阶段 1」。产品真实用户数为 0，即将公测；
> 现有统计只回答「别人看了用户主页后发生什么」，回答不了「用户在哪一步流失」。
> 零用户阶段不搭通用埋点平台，只建**很窄**的一组服务端里程碑。

## 工作区隔离

**允许**：`apps/web/prisma/schema.prisma` + 新 migration、`apps/web/src/lib/activation.ts`（新）、`apps/web/src/lib/invite.ts`、
`apps/web/src/app/api/v1/auth/register/route.ts`、`apps/web/src/app/(auth)/actions.ts`、
`apps/web/src/app/api/v1/pages/route.ts`（建页里程碑）、`apps/web/src/app/api/v1/pages/[id]/publish/route.ts`（发布里程碑）、
`apps/web/src/app/api/v1/admin/**`（新增 activation 汇总端点）、`apps/web/src/app/admin/**`（后台展示）、
`apps/web/scripts/invites.mjs`（新）、`.github/workflows/production-smoke.yml`（新）、
`apps/web/src/components/studio/feedback-link.tsx`（新，纯链接组件）、对应测试、i18n 的 `Admin` / `Studio.feedback*` 键。

**禁止**：公开页、`page-editor.tsx`、`block-editor.tsx`、`pages-dashboard.tsx`、营销页、auth 页面的 JSX（只改 actions.ts 的逻辑）、
`layout.tsx`、`next.config.ts`、图标/主题/模板数据。UI 工作区正在并行重做这些文件。

## D1 铁律（违反即全部返工）

- 不用交互式事务，只用 `db.$transaction([...])` 数组形态
- 主键用 cuid 字符串，不用自增
- DateTime 只通过 Prisma 写入（不要手写 SQL 灌时间戳）
- migration 同时要能在本地 SQLite 与 D1 上跑

## 任务 A：激活里程碑 + 渠道归因

### 模型
```prisma
model ActivationEvent {
  id        String   @id @default(cuid())
  userId    String
  kind      ActivationKind   // REGISTERED | PAGE_CREATED | PAGE_PUBLISHED | PAGE_SHARED
  channel   String?          // 注册时从 ?ref= / 邀请码渠道推断，后续事件复制用户的首个 channel
  pageId    String?
  createdAt DateTime @default(now())
  @@index([userId, kind])
  @@index([kind, createdAt])
}
enum ActivationKind { REGISTERED PAGE_CREATED PAGE_PUBLISHED PAGE_SHARED }
```
同一 `(userId, kind)` **只记第一次**（首次建页、首次发布）：用「先查后插」+ 唯一约束兜底，D1 无交互事务。

### 写入点
- REGISTERED：注册 route 与 `registerAction` 成功后；`channel` 取注册请求的 `ref` 字段（表单隐藏域 / JSON 字段，来自落地 URL 的 `?ref=v2ex` 等，只接受 `[a-z0-9-]{1,24}`），或邀请码自带的渠道（见任务 B），都没有则 null。
- PAGE_CREATED：`POST /api/v1/pages` 成功后。
- PAGE_PUBLISHED：publish route 进入 PUBLISHED **或 REVIEW** 时（用户视角已完成动作）。
- PAGE_SHARED：**不要新建端点**。现有的「复制链接 / 下载二维码 / 海报」在客户端，没法可靠上报且本轮不许动编辑器 UI——这一项留空实现，在 `activation.ts` 留一个 `recordShared(userId, pageId)` 函数 + 注释说明由后续 UI 工作区接入。

### 后台汇总
`GET /api/v1/admin/activation`（管理员）返回：按 channel 分组的 注册数 / 建页数 / 发布数 / 注册→发布中位耗时（分钟）/ 近 7 天每日注册数。
`app/admin` 页面新增一个「激活」区块展示它：一张表（渠道 × 四列）+ 一行注释层写清「只记首次」。样式只用 token（`bg-card text-ink text-muted border-hairline text-accent`），不用 slate/blue。

## 任务 B：邀请码可核销

现状 `INVITE_CODES` 环境变量白名单，任一码可无限复用——一个码泄漏等于开放注册，而对外文案说邀请制是安全考虑。

### 模型
```prisma
model InviteCode {
  id         String    @id @default(cuid())
  codeHash   String    @unique        // sha256(code 小写 trim)，库里不存明文
  channel    String?                  // v2ex / juejin / jike / direct …
  maxUses    Int       @default(1)
  usedCount  Int       @default(0)
  expiresAt  DateTime?
  createdAt  DateTime  @default(now())
  redemptions InviteRedemption[]
}
model InviteRedemption {
  id        String   @id @default(cuid())
  codeId    String
  code      InviteCode @relation(fields: [codeId], references: [id])
  userId    String
  createdAt DateTime @default(now())
  @@unique([codeId, userId])
}
```
### 行为
- `validateInviteCode` 改为 `redeemInviteCode(code, userId)`：查 hash → 未过期 → `usedCount < maxUses` → 批量事务 `[create redemption, update usedCount+1]`；并发超额靠 `usedCount` 的条件更新（`where: { id, usedCount: { lt: maxUses } }`）兜底，更新影响 0 行即视为失败并回滚 redemption（再删一次）。
- **兼容期**：`INVITE_CODES` 环境变量仍然有效（现有 20 个码已分发），但每次命中记一条 `console.warn` 方便日后下线；表里的码优先。
- 注册流程：用户先创建、再核销；核销失败则删除刚建的用户并返回 `INVITE_INVALID`（保持现有错误码与文案不变，UI 工作区会改文案分流）。
- 脚本 `scripts/invites.mjs`：`node scripts/invites.mjs create --channel v2ex --count 30 --max-uses 1 --expires 30d` 生成码，**明文只打印到 stdout 一次**，库里只存 hash；`list` 列出渠道/用量/过期。通过 Prisma 走 `DATABASE_URL`；远端 D1 的用法在脚本头注释写清（用 wrangler 执行生成的 SQL）。

## 任务 C：反馈入口

`FeedbackLink` 纯组件：一个 `mailto:` 链接（收件人从 `NEXT_PUBLIC_FEEDBACK_EMAIL` 取，缺省 `report@yilink.app`），
subject 固定「一链反馈」，body 预填非敏感诊断：页面 ID（若有）、浏览器 UA、当前路径、版本（`NEXT_PUBLIC_BUILD_SHA` 若有）。
**本轮只提供组件与测试，不接入任何页面**（UI 工作区接）。

## 任务 D：生产只读巡检

`.github/workflows/production-smoke.yml`：每 30 分钟 + 手动触发。用 curl 检查
`/api/health`、`/`、`/register`、`/p/demo-photographer`、`/sitemap.xml` 均 200，且 `/` 的 HTML 含 `og:image`、`/sitemap.xml` 含 ≥2 个 `<loc>`。
任一失败 job 失败（GitHub 会发通知）。**不创建任何生产数据。**

## 验收
- 新增测试：里程碑只记首次（并发两次 PAGE_CREATED 只存一条）、channel 正则、邀请码核销（正常 / 过期 / 超额 / 并发超额）、兼容期环境变量码、admin 汇总按渠道分组、中位耗时计算。
- `pnpm test` / `lint` / `typecheck` 全绿；migration 在本地 SQLite（vitest）跑通。
- 分段落盘 + 进度信标：每完成一个任务追加一行到 `/tmp/codex-spec19-beacon.txt`。
