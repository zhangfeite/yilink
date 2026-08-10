# Spec-17：布局兼容基线 + 既有缺陷修复（BENTO 的 P0）

> 工人：Codex（gpt-5.6-terra）｜验收：Claude 本体｜上位：[plan-free-layout.md](plan-free-layout.md) §四 P0、[advice-layout-codex.md](advice-layout-codex.md) §5.1 与 §2.3
> 本 spec **不实现任何 BENTO 编辑或渲染功能**，只建立「改动零风险」的凭据与地基。
> 工区：**只许改** `packages/shared/src/layout/**`（新建）、`packages/shared/src/index.ts`（导出）、`apps/web/prisma/schema.prisma` 与新增 migration、`apps/web/src/app/api/v1/pages/[id]/blocks/route.ts`、`apps/web/src/app/api/v1/pages/[id]/route.ts`（仅合并保存所需）、`apps/web/src/lib/pages-api-schemas.ts`、`apps/web/src/components/studio/page-editor.tsx`（仅保存调用与 id 回填）、`apps/web/e2e/**`、`apps/web/playwright.config.ts` + 测试。禁止改公开页渲染逻辑与 CSS；不 git commit。

## 1. 布局引擎纯函数（`packages/shared/src/layout/bento.ts`）

无 React、无 DOM 依赖，编辑器与服务端共用。4 微列模型：

```ts
export const BENTO_COLUMNS = 4;
export interface BentoPlacement { x: number; y: number; w: number; h: number }
```

导出并实现：
- `bentoPlacementSchema`（zod，整数、边界、越界 refine）
- `MIN_ROWS_BY_TYPE` / `MIN_COLS_BY_TYPE`：LINK/TEXT/SOCIAL/WECHAT/QR 最小 2 微列，IMAGE 可 1 微列，DIVIDER 固定 `w=4,h=1`
- `overlaps(a,b)`、`clampToBounds(p)`
- `pushDown(blocks, movedIndex)`：碰撞时确定性向下推挤
- `compact(blocks)`：向上压紧消除悬空（**过滤后调用**——隐藏块与 CTA 去重后必须重新压紧）
- `normalizeBentoLayout(blocks)`：clamp → 解重叠 → 压紧 → 按 `(y,x,原 position)` 重排 `position` → 派生 legacy `size` 影子值（半宽紧凑=SM/半宽标准=MD/通栏=LG）；**幂等且确定性**
- `firstFitFallback(blocks)`：placement 非法/缺失时按 position 生成通栏安全布局（公开页防御用）

单测 ≥18：边界 clamp、重叠检测、推挤、压紧、**幂等性**（跑两次结果相同）、**确定性**（同输入同输出）、隐藏块过滤后压紧、CTA 去重后压紧、类型最小尺寸、DIVIDER 约束、firstFit 降级、position 与阅读顺序一致。

## 2. 数据模型（nullable 增量，零回填）

```prisma
model Page  { bentoVersion Int?  }   // null=旧渲染
model Block { placement    Json? }   // {x,y,w,h}
```

migration 只含两条 `ALTER TABLE ADD COLUMN`。**禁止任何 UPDATE/backfill**；禁止给 `Layout` enum 加值。

## 3. 修既有缺陷（本 spec 的重点）

### 3.1 block id 稳定化
`blocks` PUT 现为 `deleteMany + createMany`，每次保存都换 id，**打断按区块的点击归因**（ClickEvent.blockId 失效）。改为 diff：
- 请求项可带 `id`（既有块）或不带/带 `draft-` 前缀（新块）
- 归属校验后：既有 id → update（含 position/size/config/isVisible/placement）；新块 → create；请求中缺席的既有 id → delete
- 响应返回服务端 canonical blocks（含真实 id），编辑器必须用返回值 `setBlocks`，不得沿用本地临时 id

### 3.2 保存原子性
页面元信息与 blocks 现为两次请求（PATCH + PUT），中间态可产生不一致。新增 `PUT /api/v1/pages/:id/layout` 单请求单事务：body `{ layout, bentoVersion, blocks }`，D1 批量事务内完成 Page 与 Block 更新；沿用现有审核规则（已发布页保存需重新过审，verdict=block 拒绝、review 降级 REVIEW）。旧的分离端点保留兼容，编辑器切到新端点。

## 4. 兼容基线（零 diff 凭据）

`apps/web/e2e/layout-baseline.spec.ts`：
- 对 8 个场景模板各建页（用 templates.json 数据直接 seed 或经 API），在 **320 / 375 / 480px** 三视口对公开页做 `toHaveScreenshot()` 基线快照
- 另加结构测试：连续 LINK 被非 LINK 打断时的 LinkGroup 分组行为（锁定现状语义）
- 断言公开页内联交互脚本 ≤5KB
- 快照文件入库，作为后续 BENTO 改动的回归基线

## 5. 验收

1. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿（判定输出完整贴报告，不过管道）
2. `pnpm --filter @yilink/web e2e` 通过，基线快照生成并入库
3. 迁移在全新库与既有库各验证一次；`git status --short` 贴报告
4. 报告说明：本 spec 未改动任何公开页渲染代码（`components/public/**` 与其 CSS 应为零 diff）
