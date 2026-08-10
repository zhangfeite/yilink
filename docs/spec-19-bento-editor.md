# Spec-19：BENTO 编辑器（P1 第二路）

> 工人：Codex（gpt-5.6-sol）｜验收：Claude 本体（浏览器全流程实操）
> 上位：[plan-free-layout.md](plan-free-layout.md)、[advice-layout-kimi.md](advice-layout-kimi.md)（交互与护栏）、[advice-layout-codex.md](advice-layout-codex.md) §3
> 依赖已就绪：引擎 `packages/shared/src/layout/bento.ts`；原子保存端点 `PUT /api/v1/pages/:id/layout`（body `{layout,bentoVersion,blocks}`）
> 工区：**只许改** `apps/web/src/components/studio/**`、`apps/web/src/app/studio/**`、`apps/web/src/i18n/*.json` + 测试。**禁止**改 `components/public/**`（渲染由 spec-18 负责）、API、prisma、依赖锁；不 git commit。若需预览渲染，**直接 import spec-18 的 BentoFlow**（若尚未存在则先用现有 PublicPageRenderer 占位，并在报告中说明）。

## 执行纪律（硬要求）

分段落盘：§1 转换流程 → §2 桌面编辑 → §3 移动编辑 → §4 骰子与整理 → §5 测试。每节完成立刻写文件+跑测试+向 `/tmp/codex-bento-editor-progress.md` 追加进度行。禁止攒到最后；卡住跳过并记录。

## 1. 转换流程（零风险切换）

- 编辑器顶栏「布局」区增第三个选项：列表 / 网格 / **自由布局（Beta）**
- 点「自由布局」→ 弹层：左侧当前效果、右侧转换后预览（**客户端调 `normalizeBentoLayout` 生成候选 placement，不写库**）；文案说明「可随时切回，内容不会丢失」
- 候选生成规则：LIST → 全部通栏（w=4）；GRID → 连续 LINK 的 SM/MD/LG 映射为半宽紧凑/半宽标准/通栏，其余类型先通栏
- 「取消」零写入；「应用」才调 `/layout` 端点写 `bentoVersion=1` + placement
- 切回列表/网格：清空 `bentoVersion`（placement 保留，便于再切回来）

## 2. 桌面编辑（≥1024px）

- 画布 480px 宽居中，等比映射 4 微列
- **移动**：拖卡片任意处（沿用 dnd-kit PointerSensor）；拖动中显示幽灵占位框（accent 12% 底 + 虚线），其他卡片实时让位；松手吸附到合法槽
- **调整大小**：卡片右缘/下缘/右下角三个 44px 把手（Pointer Events，不走 dnd-kit）；拖动按微网格**跳变吸附**，不连续缩放
- **键盘**：方向键移动一格、Shift+方向键改尺寸、Esc 取消；aria-live 播报「第 N 列第 M 行，宽 W 高 H」
- 所有操作走引擎：`clampToBounds` → `pushDown` → `compact`，编辑器与服务端同一份真相
- **20 步撤销/重做**（本地栈，覆盖移动/缩放/显隐/删除）

## 3. 移动编辑（<1024px，默认路径是「点选」不是拖拽）

- 选中卡片 → 底部弹层：
  - **尺寸选择器**：6 个常用跨度画成迷你网格示意图（通栏薄条 4×1 / 通栏标准 4×4 / 半宽标准 2×4 / 半宽高块 2×8 / 通栏高块 4×8 / 小图 1×4），点选即生效
  - **四方向微调按钮**（上下左右各移一格）
- 长按 180ms + 8px 容差才启动拖拽（TouchSensor），普通触摸仍滚动页面；把手区 `touch-action:none`，画布整体不禁滚

## 4. 骰子与整理（Kimi 提案，MVP 一等公民）

- **🎲 换个排法**：在合法布局空间内随机重排（满足全部约束、通栏块 ≤3、无孤洞），200ms 洗牌动画，可连点；每次生成前快照，一键撤销
  - 实现：纯数据层——打乱顺序候选 + first-fit 放置 + compact + 约束校验，失败重试至多 20 次
- **✨ 一键整理**：消除孤洞、通栏块超限时降级最小的一个、恢复推荐节奏（hero 靠前、社交贴纸靠后）；同样可撤销
- 两个按钮常驻编辑器工具栏，移动端优先展示

## 5. 护栏（写进 UI 而非阻断）

- 尺寸低于类型最小值时把手拒绝继续缩小（视觉抖动反馈）
- 保存时跑启发式，命中出**可忽略的黄条**（不弹窗、不阻断）：连续 2 个以上通栏块相邻 / 首屏无重点块 / 底部留孤洞（附「一键整理」按钮）
- **唯一阻断**：二维码块或含操作按钮的块被裁到无法显示完整内容时，禁止发布并明确提示

## 6. 测试与验收

- vitest ≥12：候选生成（LIST/GRID 两路）、撤销栈、骰子约束满足、整理消洞、护栏启发式命中、尺寸下限拒绝
- 验收命令全绿（判定输出完整贴报告，不过管道）；`git status --short` 贴报告
- 浏览器全流程由验收方实测：转换 → 桌面拖拽/缩放 → 移动点选 → 骰子 → 整理 → 保存 → 公开页一致
