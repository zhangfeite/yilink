# Spec-08：审核落库与管理后台

> 工人：Codex（gpt-5.6-terra）｜验收：Claude 本体｜上位：[architecture.md](architecture.md)（ModerationRecord 模型、PRD §5 信任承诺：违规先隐藏不羞辱、有申诉）
> 工区：**只许改** `apps/web/src/app/api/v1/admin/**`（新建）、`apps/web/src/app/admin/**`（新建 UI）、`apps/web/src/lib/moderation.ts`（新建）、`apps/web/src/app/api/v1/pages/[id]/publish/route.ts`（仅按 §1 增记录逻辑）、`apps/web/scripts/grant-admin.mjs`（新建，纯 JS）、`apps/web/package.json`（仅加 `admin:grant` script）+ 测试。禁止其他一切；不动依赖锁文件；不 git commit。

## 1. 发布管道补全（publish route 小改）

- 机审结果落 `ModerationRecord`（provider='local-words'，verdict pass/review/block，detail 存命中词）；`block` 维持 422；`review` **放行发布**但记录待人审（先发后审，人审兜底）

## 2. 管理端 API `/api/v1/admin/*`（role=ADMIN 守卫，非管理员一律 404）

- `GET /moderation?filter=review|all`：待人审记录列表（关联 page slug/title/owner email）
- `POST /pages/:id/hide`：body {reason}→ status=HIDDEN + hiddenReason + ModerationRecord(manual/block) + revalidateTag
- `POST /pages/:id/restore`：恢复 PUBLISHED + 记录 + revalidateTag
- `GET /users?query=`：分页用户列表（email/plan/trustLevel/页数）；`PATCH /users/:id`：改 trustLevel(0-100)
- `POST /moderation/:id/resolve`：人审通过标记

## 3. 后台 UI `/admin`（ADMIN 之外 404；朴素表格即可，zh 文案）

- 待人审队列（页面链接可点开公开页新标签）＋ 通过/隐藏（填 reason）操作
- 页面检索（按 slug）＋ 隐藏/恢复；用户列表＋信任分编辑
- 顶部导航两个 tab；无需分页美化，功能正确优先

## 4. 工具与测试

- `pnpm admin:grant <email>`：把用户提为 ADMIN（Node 20 纯 JS）
- vitest ≥10：非管理员 404；hide→公开页 404+记录落库+缓存失效被调用（mock revalidateTag）；restore 恢复；publish 的 review 路径落记录且发布成功；resolve 状态流转
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；`git status --short` 贴报告
