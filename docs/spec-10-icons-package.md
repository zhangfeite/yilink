# Spec-10：packages/icons 实装（国内平台图标体系）

> 工人：Codex（gpt-5.6-terra）｜验收：Claude 本体｜上位文档：[design-direction.md](design/design-direction.md) 法则六、`docs/design/platform-icons-verified.json`（唯一数据源）、`docs/design/platform-icons-draft-REVIEW.md`（信度警示）
> 并行约定（严格遵守）：**只允许改动** `packages/icons/**` 与根 `pnpm-lock.yaml`（因本包新增依赖）。**禁止**：动 apps/web、其他 packages、docs/**、git commit。

## 1. 目标

把 `docs/design/platform-icons-verified.json` 的 42 平台变成可发布的 TS 包：真实品牌矢量（simple-icons 26 个）+ 自绘占位机制（16 个待补），供 spec-05 渲染器与未来编辑器消费。**这个包未来独立发 npm 引流，质量按对外开源标准。**

## 2. 交付

1. 依赖：`simple-icons`（仅本包 dependencies；license MIT，合规）
2. 构建脚本 `scripts/generate.ts`：读 verified.json + simple-icons，产出 `src/generated/registry.ts`——每平台一条：`{ id, nameZh, nameEn, category, aliases, stickerHex, glyphPath: string | null, source: 'simple-icons' | 'custom' | 'pending' }`；**stickerHex 以 verified.json 为准**（含 bilibili/douyin 的 App 认知色覆写）；`pnpm --filter @yilink/icons generate` 可重跑且幂等
3. 组件（React，无客户端状态，可 RSC）：
   - `<PlatformGlyph id size />`：裸品牌形（currentColor 或指定 fill）
   - `<PlatformSticker id size />`：设计法则六的贴纸形态——品牌色圆底 + 白色 glyph（douyin 保留三层错位色，硬编码该特例）；`pending` 平台回退：中性圆底 + nameZh 首字（渲染不许碎）
4. 自绘补充机制：`src/custom/{id}.ts` 导出 `{ path, viewBox? }` 即自动覆盖 pending（generate 时合并）；本 spec 只建机制+目录 README（16 个自绘件后续设计任务交付）
5. 导出与工程：具名导出全部组件+registry+类型；tree-shakeable（`sideEffects:false`）；vitest ≥10 用例（registry 完整性 42 条、26 条有 glyphPath、贴纸回退渲染、douyin 特例、id 不重复）；README 双语（用法+贡献自绘图标指引+商标使用免责说明）

## 3. 验收（逐条执行贴输出）

1. `pnpm --filter @yilink/icons generate && pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿
2. 报告贴 registry 统计（simple-icons/custom/pending 各多少）与 `git status --short`（证明只动了本包+lockfile）
