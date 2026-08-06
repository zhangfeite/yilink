# Spec-14：审核实体化与发布状态机（本 wave 唯一 schema 所有者）

> 工人：Codex（gpt-5.6-sol）｜验收：Claude 本体｜依据：[iteration-plan-wave5.md](iteration-plan-wave5.md) A2/A3/A6、[advice-codex.md](advice-codex.md) 风险 1 与工程债 2
> 工区：**只许改** `packages/moderation/**`、`apps/web/prisma/schema.prisma` 与新增 migration（**本 wave 仅你可动 schema**）、`apps/web/src/app/api/v1/pages/**`（publish/unpublish/route/blocks）、`apps/web/src/app/api/v1/admin/**`、`apps/web/src/lib/moderation.ts`、`apps/web/src/components/public/public-page.tsx`（仅页脚举报处）、`apps/web/src/components/studio/page-editor.tsx`（仅保存后审核态提示）、`apps/web/src/app/p/[slug]/page.tsx`（仅 REVIEW 状态处理）、i18n 词条、`apps/web/.env.example` + 测试。禁止依赖/锁文件；不 git commit。

## 1. Schema（一次 migration 完成）

- `PageStatus` 增 `REVIEW`；`Page` 增 `deletedAt DateTime?`（软删除，本 spec 一并实现）

## 2. 审核实体化

- `local-words` 默认词库从空数组改为内置基础违禁集（分类：赌博、色情、荐股/理财诈骗、违禁品、政治敏感词类目——各 20-40 词，覆盖常见变体；命中即 `block`），另设 `review` 级观察词集（金融/医疗/加群类营销话术）；词库文件独立、注释说明维护方式
- 新增 `UrlBlocklistProvider`：命中域名黑名单（内置最小集：已知垃圾 TLD 模式 + env `URL_BLOCKLIST` 追加）即 `block`；与词库 provider 组合调用
- 公开页页脚（Powered by 旁）加「举报」mailto 链接（env `REPORT_EMAIL`，默认 report@yilink.app）

## 3. 发布状态机

- publish：`block`→422（现状）；`review`→**status=REVIEW，不发布**，提示「已提交审核」；`pass`→PUBLISHED
- **已发布页的任何保存**（PATCH 元信息 / blocks PUT）：重新机审——`pass`→保持 PUBLISHED + `revalidateTag(…, {expire:0})`（修复改后不生效）；`review`→降为 REVIEW + revalidateTag（公开页下线为占位）；`block`→422 拒绝保存该次修改
- 公开渲染：REVIEW 状态与 HIDDEN 同样渲染中性「暂不可用」占位（不羞辱）
- admin：`/moderation` 队列含 REVIEW 页面，放行动作 → PUBLISHED + revalidateTag；编辑器保存响应含审核结果，界面提示「内容审核中，通过后自动恢复展示」

## 4. 软删除

- DELETE 页面 → `deletedAt=now` + status 保持 + revalidateTag；所有查询（公开/列表/统计/编辑器/admin）过滤 `deletedAt: null`；30 天硬清理并入现有 rollup 脚本（追加一段）；admin 可见已删列表并可恢复（简表）

## 5. 测试与验收

- vitest ≥14：词库 block/review 命中；URL 黑名单；publish 三 verdict 全路径；**已发布修改重审三 verdict**（含 revalidateTag 断言）；REVIEW 公开占位；软删除过滤与恢复
- 全套验收命令输出完整贴出（判定行不过管道）；`git status --short` 贴报告
