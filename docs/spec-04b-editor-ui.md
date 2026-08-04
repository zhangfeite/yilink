# Spec-04b：编辑器 UI（/studio）

> 工人：Codex（gpt-5.6-sol）｜验收：Claude 本体（浏览器实测全流程）｜上位：[architecture.md](architecture.md)、[design-direction.md](design/design-direction.md)、[template-system.md](design/template-system.md)、spec-04 的 API
> 工区：**只许改** `apps/web/src/app/studio/**`、`apps/web/src/components/studio/**`（新建）、`apps/web/src/lib/templates.ts`（新建）、`apps/web/src/i18n/{zh-CN,en}.json`（增 studio 词条）。**禁止**：动 `/api/**`、`middleware.ts`、`components/public/interaction-script.ts`、prisma、依赖与锁文件（dnd-kit/qrcode 已预装）、docs/**、git commit。例外：预览复用需要时，可在 `components/public/` 内做**最小**重构（如抽纯视图组件），但公开页渲染输出与 spec-05 验收行为不得变化。

## 1. 页面与流程

1. **/studio 主页列表**：我的主页卡片（标题/slug/状态徽章/编辑入口）+「新建主页」。
2. **新建流程（两步弹层或子页）**：
   - 选场景模板：读 `lib/templates.ts`（加载 `src/templates/templates.json`，用 `@yilink/shared` 的 `sceneTemplatesFileSchema` 校验；**文件缺失或校验失败时回退到内置 3 个模板**——从 seed 三人设硬编码派生，保证本 spec 不依赖并行产出的 json）；卡片展示 nameZh/persona/默认主题色点
   - 填 slug + 标题 → 依次调 POST /pages、PUT blocks（模板区块）、PATCH（layout/themeId/ctaConfig/bio=identity.bio、themeConfig.role=identity.role）→ 跳编辑器
3. **/studio/pages/[id] 编辑器**：
   - 桌面双栏：左编辑 / 右 375px 实时预览（**复用 public-page 组件**保证所见即所得；预览随未保存草稿实时变化）；移动端「编辑/预览」双 Tab
   - 页面设置：标题、role（写入 themeConfig.role）、bio、avatarUrl（URL 输入 + 字母头像预览）、SEO 标题/描述
   - 区块编辑：列表 + dnd-kit 拖拽排序；添加区块（7 类型菜单）；每类型专属表单（zod 即时校验错误展示）；可见性开关；layout=GRID 时显示 SM/MD/LG 尺寸选择
   - 顶栏：主题选择器（8 套色点，来自 `lib/themes.ts`）、布局切换、CTA 配置（type wechat/link + label/value；**type=wechat 时提示「转化唯一性」并在预览中自动隐藏 WECHAT 区块**，与渲染器行为一致）、保存（显式按钮 + 脏状态标记）、发布/取消发布（发布前自动保存；MODERATION_BLOCKED 422 时展示原因）、复制链接、下载二维码（链接到 `/api/v1/pages/:id/qr?format=png`，接口 404 时按钮隐藏——该接口由并行 spec-07 提供）
4. 全部文案走 i18n（zh-CN 完整、en 可后补占位）；样式 Tailwind，观感对齐设计法则（工作台可朴素，但不许出现反面清单里的克隆脸/花哨堆砌）。

## 2. 测试与验收

- vitest：templates 加载器（合法/非法/缺失回退）、create-from-template 的请求装配 util ≥6 用例
- 验收命令：`pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；`git status --short` 贴报告
- 运行时流程（新建→模板→编辑→保存→发布→公开页可见）由验收方浏览器实测；`pnpm build` 若报 already running 为并行工人冲突，等待重试即可
