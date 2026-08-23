# spec-18：产品壳设计系统——把营销页 / 登录注册 / 工作台 / 编辑器抬到公开页的水准

> 上位法则：[design-direction.md](design/design-direction.md) 八条法则 + 反面清单，本文不重复，只讲如何落到「壳」上。
> 审美判据：产品负责人对标小宇宙名片的高级感；**合规但平庸会被整体否决**（v1 主题的前车之鉴）。
> token 基座已在 main 落地：`apps/web/src/app/globals.css` + `tailwind.config.ts`。本文所有工作区都只准取用这些 token。

## 为什么

公开页（用户的主页）已经达标：大字立面、两层海拔、单色纪律、注释层。
但包着它的壳是三套互不相干的皮：营销页自定义青绿；登录注册是裸 Tailwind 卡 + 海军蓝按钮 + 蓝焦点环；
工作台 / 编辑器是 slate/blue 后台模板脸，编辑器工具栏蓝黄绿黑四色混杂。
用户在壳里待的时间比在自己主页上长得多——壳的平庸会直接折价产品。

## 总纪律（每个工作区都适用，验收一票否决）

1. **只用 token**：`bg-page / bg-card / bg-card-muted / text-ink / text-muted / border-hairline / text-accent / bg-accent / bg-accent-soft / shadow-card / rounded-card / rounded-control / text-display / text-section / text-body / text-caption`。
   **禁止** `slate-* blue-* amber-* emerald-* green-* yellow-* gray-* zinc-*` 以及任何十六进制色。验收用 grep 查。
2. **单色**：整个壳只有一个彩色——accent。成功态用 accent，不用绿；警示用 `danger`，不用黄。
3. **两层海拔**：页面底（page）上只浮白卡（card，`shadow-card`，`rounded-card` 20px）；卡内分组用 `bg-card-muted` 或 hairline 分割，**不得卡套卡再套卡**（最多两层）。
4. **大字当立面**：每个页面的标题用 `text-display`（36/800/-0.02em），上方 eyebrow 用 `text-caption text-accent font-semibold tracking-wide`，下方说明 `text-body text-muted`。这是所有页面统一的页眉骨架。
5. **按钮等级**：主动作 = `bg-accent text-accent-on rounded-full`（每屏最多一个）；次动作 = `bg-card border border-hairline text-ink rounded-full`；文字动作 = `text-accent` 无底。**禁止黑底按钮、禁止蓝底按钮。**
6. **注释层**：引导语、计数、时间戳一律 `text-caption text-muted`。
7. **焦点与选中**：焦点环走全局 `:focus-visible`（accent）；选中态用 `bg-accent-soft` + `border-accent`，不用实心填充。
8. **留白慷慨**：卡内边距 ≥ 24px，区块间距 ≥ 32px。宁可多滚一屏，不许挤。
9. **不引入新依赖、不改公开页渲染器、不改 API**。
10. **每个工作区的改动必须附真机截图（桌面 1280 + 手机 375）放到 `docs/assets/ui-v2/<zone>-*.png`**，验收看图不看代码。

## 工作区 A · 登录与注册（含发布前阶段 0）

**现状**：白卡居中、海军蓝按钮、蓝焦点环、与首页割裂；邀请码必填但零说明；注册页没有回首页的路。

**艺术方向**：不对称双栏。左栏（桌面 5/12）是品牌叙事面：冷青灰底 + 「一」品牌圆标 + 一句 display 级标题（如「一条链接，装下你的全部主页。」）+ 下方一张**真实公开页的缩小渲染**（用 `PublicPageRenderer` 渲染 `templates.json` 的某个模板，`preview` 模式，缩放 0.72，不要 iframe、不要黑手机壳，用 hairline 细边 + 圆角 28px 的「纸」承托）。右栏是表单卡：白卡、`rounded-card`、标题 `text-display`、输入框 `rounded-control border-hairline` 聚焦 accent 环、主按钮 accent 圆角满宽。手机端单栏：品牌面压缩成顶部 120px 的标题区，去掉渲染预览。

**阶段 0 必做**（来自 `docs/launch-fact-check.md` #12）：
- 邀请码字段下方一行注释层说明去哪拿：「公测期凭邀请码注册。在 V2EX 帖或 GitHub issue（标题带「邀请码」）索取。」含 GitHub issue 链接。
- 支持 `?invite=xxx` URL 预填邀请码（服务端读 searchParams 传给表单 `defaultValue`，不要客户端 `useSearchParams` 带 Suspense 那套）。
- 邀请码错误的文案分流：空 →「公测期需要邀请码」；填了但无效 →「邀请码无效，请核对大小写与空格」。
- 注册页与登录页顶部加回首页的品牌链接。
- 登录页 `?registered=1` 时显示一条 accent-soft 的提示「账号已创建，请登录」（现状不显示）。

**文件**：`src/app/(auth)/**`、`src/components/register-form.tsx`、`src/components/login-form.tsx`、i18n 的 `Register` / `Login` 命名空间。

## 工作区 B · 工作台壳 + 主页列表 + 数据 + 设置

**现状**：左栏 slate 侧边栏 + 蓝字品牌；黑底「新建主页」；虚线空状态；模板选择弹窗蓝框选中。

**艺术方向**：
- **壳**：侧边栏去掉边框线，改为 page 底色上直接放品牌圆标（复用营销页 `.brandMark` 的「一」圆章，accent 描边）+ 文字 wordmark（`text-ink`，不再蓝色）；导航项选中态 `bg-card shadow-card rounded-control`（像一张小纸浮起来），未选中 `text-muted`。手机端顶栏同理。
- **页眉骨架**：eyebrow / display / 说明三段，见总纪律 4。
- **主页列表卡**：每张主页一张白卡，左侧一块 **主题色样**（取该页 theme 的 `neutral.pageBg` 做 56×56 圆角色块，上面用 `accent` 写标题首字——和公开页的头像占位一个做法），中间标题 + `/p/slug` 注释层 + 状态（草稿 `text-muted` / 已发布 `text-accent` / 审核中 `text-muted` 斜体），右侧区块数与更新时间（注释层）。hover 抬升到 `shadow-raised`。
- **空状态**：不要虚线框。用一张「示例主页」的缩小渲染（同工作区 A 的做法）斜放在右侧，左侧 display 标题「创建你的第一个主页」+ 一句说明 + accent 主按钮。这是用户第一眼，必须像产品不像后台。
- **模板选择弹窗**：卡片选中态 `border-accent bg-accent-soft`（不用蓝）；每张卡右上的主题色点保留但改为 20px 圆 + hairline 描边；弹窗底部动作条 `border-t border-hairline`，「继续」accent 圆角。第 2 步的 slug 输入框前缀固定显示 `yilink.app/p/`（注释层色）。
- **数据页**：三张汇总卡数字用 `text-display`；柱状图用 accent（已是）；空状态同上不要虚线。
- **设置页**：按总纪律对齐；「下载 JSON」改次动作样式（白底 hairline 边）——它不是页面主动作。

**文件**：`src/app/studio/**`、`src/components/studio/pages-dashboard.tsx`、`analytics-trend.ts`、i18n `Studio` / `Navigation`。**不要碰** `page-editor.tsx`、`block-editor.tsx`（那是工作区 C）。

## 工作区 C · 编辑器

**现状**：顶栏 10 个控件四种颜色（蓝 pill、黄「一键整理」、绿状态点、黑「发布」）；预览装在粗黑边手机壳里；工具与内容争视线。

**艺术方向**：**工具退后，内容上前**。
- 顶栏压成一行、两端对齐：左 = 返回箭头 + 页名 + 状态（注释层）；中 = 布局三态 **分段控件**（一个 `bg-card-muted rounded-full` 槽，选中段 `bg-card shadow-card`，文字 ink；不再蓝底）；右 = 「分享」次动作 + 「保存」次动作 + **「发布」唯一主动作（accent）**。主题按钮并入左侧页名旁的小圆色点，点击展开。
- 「🎲 换个排法」「✨ 一键整理」：去掉 emoji（反面清单），改为细描边次动作，放在画布标题同一行右侧；「撤销/重做」做成一对图标按钮（用字符 ↶ ↷ 或简单 SVG，不引依赖）。
- **预览**：去掉黑手机壳。改为 hairline 细边 + 圆角 28px + `shadow-card` 的「纸」，宽 375，顶部一行注释层「实时预览 · 375px」。公开页渲染器本身不动。
- 表单卡：标签 `text-caption font-semibold text-ink`，输入框 `rounded-control border-hairline`；区块编辑卡之间用 hairline 分隔而非卡套卡。
- 状态提示（已保存 / 发布成功 / 审核中）：用 accent-soft 底的一行条，不用绿色点、不用黄底。
- 手机端：顶栏两行可以接受，但「编辑 / 预览」切换改为与布局三态同款分段控件。

**文件**：`src/components/studio/page-editor.tsx`、`block-editor.tsx`、`share-panel.tsx`、`theme-options.ts`、i18n `Studio.editor*`。**不要碰**公开页渲染器、布局引擎、API。现有单测与 E2E（`activation.spec.ts` 点「发布」按钮、`layout-baseline`）必须继续绿——按钮的可访问名称「发布」「保存」「新建主页」「继续」「创建并开始编辑」**不得改**。

## 工作区 D · 营销首页（含阶段 2 的转化骨架与模板画廊）

**现状**：体面但通用 SaaS 脸——黑边手机壳、三张编号卡、虚线按钮、五条承诺文字列表；全页唯一注册入口在首屏；定价区三张卡全不可点；手机端导航把「定价」藏了；信任承诺两处点名 Linktree（违反发布物料的合规红线）。

**艺术方向**：**首页 = 一张放大的公开页**。让访客第一眼就在看产品本身，而不是在看「关于产品的页面」。
- **Hero**：去掉黑手机壳。右侧改为一张真实公开页的「纸」（`PublicPageRenderer` 直出 `templates.json` 某模板，不用 iframe——iframe 带来了刷量与加载抖动两个历史问题），轻微旋转 -2°、`shadow-raised`，左上角压一张第二模板的小纸（缩放 0.5，旋转 4°），形成不对称的纸张叠放。左侧 display 标题放大到 56px（桌面），eyebrow 保留。主按钮文案改为如实的「申请公测 →」（注册需要邀请码，不能再写「免费开始」），次按钮「看一个真实主页」。
- **导航**：加「注册」次动作按钮（i18n 里 `Marketing.register` 键已存在但没用）；手机端不再隐藏「定价」。
- **第二屏 · 模板画廊**（新）：标题「从一个真实场景开始」，8 个模板各一张 375px 真实渲染（服务端 `PublicPageRenderer` 直出，缩放 0.6，横向可滚动的纸张条，每张下方注释层写 persona）。这是三份产品提案的唯一交集：发帖当天可贴、注册前可验证产品、又是可索引资产。不建 `/templates` 子路由，先放首页。
- **三个优势卡**：去掉 01/02/03 编号圆，改为每卡一张小图（用 `docs/assets/readme-*.png` 真机图裁切）+ 一行标题 + 两行说明。
- **定价区**：免费档按钮改为可点的「申请公测」链接；两档买断保持「即将开放」但改为次动作样式的不可点（不要虚线边）；「完整方案」角标用 accent-soft。
- **信任承诺**：去掉「Linktree 12% 抽成之鉴」「Linktree +67% 之鉴」中的品牌名（合规红线），改为「有同类产品抽成 12% 的先例」类表述。
- **页尾**：加终局 CTA 段：display 一句 + 「申请公测」主按钮。5000px 的长页读完不能只剩 GitHub 和举报邮箱。
- 整页继续用现有 `page.module.css` 变量体系，但变量值改为引用全局 token（`var(--accent)` 等），不再重复定义。

**文件**：`src/app/(marketing)/**`、i18n `Marketing`、`public/`（新增模板缩略资产可放此处）。**不要碰** `layout.tsx` 的 metadata、公开页、studio。

## 验收（本体执行）

1. `grep -rE "slate-|blue-|amber-|emerald-|green-|yellow-|gray-|zinc-" src/app src/components` 在各工作区文件内零命中。
2. 每工作区截图对照八条法则逐条过；任一反面清单项出现即退回。
3. `pnpm test`、`pnpm lint`、`pnpm typecheck`、`playwright test` 11/11 全绿。
4. 公开页 `layout-baseline` 9/9 零 diff——壳的改动不得泄漏到公开页。
