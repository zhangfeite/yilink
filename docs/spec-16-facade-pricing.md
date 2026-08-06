# Spec-16：门面真实化、定价通电与发布分发面板

> 工人：Codex（gpt-5.6-sol）｜验收：Claude 本体（浏览器视觉评审，对标 [design-direction.md](design/design-direction.md) 八条法则——营销页也不许克隆脸/花哨堆砌）｜依据：[iteration-plan-wave5.md](iteration-plan-wave5.md) B8/B9/C10、[advice-kimi.md](advice-kimi.md) 缺口 2/3
> 工区：**只许改** `apps/web/src/app/(marketing)/**`、`apps/web/src/components/marketing/**`（新建）、`apps/web/src/components/studio/page-editor.tsx` 与 `share-panel.tsx`（仅发布成功联动）、`packages/shared/src/plan.ts`、`apps/web/src/app/studio/settings/page.tsx`（仅配额/公平使用文案）、`README.md`（结构与占位图槽）、i18n 词条、`apps/web/.env.example` + 测试。禁止动 prisma/依赖锁；不 git commit。

## 1. 营销首页真实化（一页四段，遵循设计法则）

1. **Hero**：大字 slogan（现有 tagline 保留）+ 副题 + 双 CTA（「免费开始」→/register、「看一个真实主页」→/p/demo-photographer 新标签）+ 右侧**手机框内嵌 iframe** 实时加载 `/p/demo-illustrator`（同源、懒加载、375 宽视口缩放——用真页面当首屏视觉，零截图资产）
2. **特性三列**：场景模板 5 分钟出页 / 微信内可打开+二维码海报 / 开源可自部署数据自主（各配一句实话文案，i18n）
3. **定价区**：三档卡片——免费（3 页）/ 基础买断 $12（10 页）/ 完整买断 $25（**50 页**）；显著位「一次买断，终身使用，永不涨价；老用户永远保价」+ 信任承诺五条（PRD §5 原文）+ 公平使用一句（「配额与合理使用限制见文档，防滥用不防真实使用」）；购买按钮读 `LEMONSQUEEZY_CHECKOUT_URL_*` env，未配置则显示「即将开放」占位
4. **页脚**：GitHub（env `NEXT_PUBLIC_GITHUB_URL`，默认 `https://github.com/zhangfeite/yilink`——顺手修复现有断链）、部署文档、举报邮箱

## 2. 套餐配额落地

- `plan.ts`：`PRO: { pages: Infinity }` → `{ pages: 50 }`；导出 `PLAN_QUOTA_NOTE_ZH`（公平使用一句话）供设置页/定价区共用
- 设置页配额区同步显示新上限与公平使用注

## 3. 发布成功 → 分发面板

- 编辑器发布成功后**自动打开分享面板**，面板顶部加一行祝贺态文案（「已发布！现在把它发出去」）+ 主页链接展示；面板增加「复制小红书简介文案」「复制朋友圈文案」两个一键文案按钮（模板句式内置，含短链）
- 仅发布动作触发自动弹出；手动「分享」入口保留

## 4. README 门面

- 顶部结构调整：slogan 下放 3 个图槽（`docs/assets/readme-{editor,page,wechat}.png`，本 spec 只建目录与引用，截图由验收方生产采集后补）+ 「在线体验」链接（yilink.app + demo 页）+ 徽章行（license/CI）

## 5. 测试与验收

- vitest ≥6：plan 配额新值与越限行为；分发面板发布联动（状态断言）；文案按钮内容
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿（判定行不过管道）；`git status --short` 贴报告；视觉终审由验收方浏览器执行
