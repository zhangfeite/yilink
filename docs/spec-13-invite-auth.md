# Spec-13：邀请制注册与认证加固 + CI 增强

> 工人：Codex（gpt-5.6-terra）｜验收：Claude 本体｜依据：[iteration-plan-wave5.md](iteration-plan-wave5.md) A1/A7、[advice-codex.md](advice-codex.md) 风险 2
> 工区：**只许改** `apps/web/src/app/(auth)/**`、`apps/web/src/app/api/v1/auth/**`、`apps/web/src/components/register-form.tsx`、`apps/web/src/lib/auth-validation.ts`、`apps/web/src/lib/invite.ts`（新建）、`apps/web/src/i18n/*.json`（增词条）、`apps/web/.env.example`、`docker/docker-compose.yml`（仅 env 注释）、`.github/workflows/ci.yml` + 对应测试。禁止其他一切；不动 prisma/依赖锁文件；不 git commit。

## 1. 邀请码制

- `INVITE_CODES` env：逗号分隔码表（大小写不敏感、trim）；`lib/invite.ts` 导出 `isInviteRequired()`（env 非空即必填）与 `validateInviteCode(code)`
- 注册双入口（Server Action + REST route）统一校验：必填时缺码/错码 → 统一错误「邀请码无效」（i18n `Register.invalidInvite`）；REST 返回 403 `INVITE_INVALID`
- 注册表单增「邀请码」输入（仅 `isInviteRequired` 时渲染——通过服务端把开关传给客户端组件）；自部署未配置 env 则保持开放注册（自部署自由，托管收紧）
- 码本身不落库不打日志

## 2. 认证加固

- 生产启动防呆：`AUTH_SECRET` 缺失/长度 <32/等于已知占位值（`local-dev-only`、compose 示例值）时，生产 build 的运行时首次请求直接 500 明示原因（实现于 auth 初始化处，测试覆盖）
- 登录失败文案确认统一（不存在账号与密码错误同文案——现状已如此则写一条回归测试锁死）
- 注册重复邮箱保持 409（邀请制下枚举价值已低），但响应文案不含「已注册」以外信息

## 3. CI 增强（Codex 清单第 7 条）

- `ci.yml` 增 job：`cf-build`（Node 22 + `pnpm cf:build` 通过即可，不部署）；`e2e`（`npx playwright install --with-deps chromium` + `pnpm e2e`，用生产 build+start 或 dev 均可，稳定优先）
- 现有 verify job 不动

## 4. 测试与验收

- vitest ≥8：邀请码开/关/错/大小写；REST 403；AUTH_SECRET 防呆；重复邮箱文案
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；`git status --short` 贴报告；验收命令输出完整贴出（判定行不过管道）
