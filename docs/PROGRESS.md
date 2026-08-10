# 进度存档（2026-08-10 暂停点）

> 下次开工先读这份。上一个提交：`c2106f3 feat: P2 模板 BENTO variant 实装 + 视觉修复`
> 工作区干净、全部已推送 GitHub；本地无未完成的后台任务。

## 一句话现状

产品已上线 https://yilink.app（邀请制公测），BENTO 自由布局 P0→P2 全部完成并合入，
基线 9/9 零 diff、236 测试全绿。剩余是发布动作与两个未通电的外部依赖。

## 已完成（近期）

| 批次 | 内容 |
|---|---|
| Wave 5 | 邀请制注册、审核实体化（真词库+URL 黑名单+REVIEW 状态机）、统计防伪、数据运维闭环、门面真实化+定价+分发面板；已部署生产并回归 |
| BENTO P0 | 布局引擎纯函数（41 测试）、nullable 列零回填、block id churn 修复、原子 /layout 端点、8 模板×3 视口基线快照 |
| BENTO P1 | 公开页 BentoFlow 渲染（零框架 JS）、编辑器（桌面拖拽/移动点选/🎲 换个排法/✨ 一键整理/护栏）、真机全流程验证 |
| BENTO P2 | 8 模板 BENTO 坐标注入、建页走原子端点、三处视觉修复、admin restore 支持 REVIEW |

## 下次开工的候选（按建议优先级）

1. **发布动作**（物料已备好在 `docs/launch-posts.md`）：V2EX 邀请制公测帖 → 掘金长文 → 即刻。
   邀请码在 `~/.config/yilink/invite-codes.txt`（20 个，600 权限）。
2. **把 P2 成果部署到生产**：`cd apps/web && pnpm cf:deploy`（**注意：生产 D1 已含 bento 列，无需再迁移**；
   凭证用法见下方「环境备忘」）。部署后建议重跑一次生产冒烟。
3. **BENTO 剩余打磨**：另外 7 个模板的真机视觉逐个过（本次只肉眼验收了摄影师模板）；
   移动端点选面板的真机手感；P3 效率功能（多选/对齐/布局历史）。
4. LemonSqueezy 开户后填 env 通电收款；公众号 AppID 配好后微信转发卡片满血。

## 需要用户操作的外部依赖（未完成）

- **LemonSqueezy 开户**：建两个买断商品（$12 / $25），拿 checkout URL ×2、webhook secret、variant ID ×2。
  当前定价区显示「即将开放」。
- **国内可备案域名**：yilink.app 不可备案（已核实），国内链路未验证。

## 环境备忘（避免重复踩坑）

- Node：wrangler/playwright 需 Node 22 → `PATH=~/.nvm/versions/node/v22.23.2/bin:$PATH`
- Cloudflare 凭证：`CLOUDFLARE_API_TOKEN=$(grep '^CLOUDFLARE_API_TOKEN=' ~/Projects/buffett-archive/.env | tail -1 | cut -d= -f2-)`
- 本地 dev 走 wrangler 本地 D1（不是 SQLite 文件）；e2e 用 `YILINK_FORCE_SQLITE=1` 隔离
- schema 变更后：`pnpm --filter @yilink/web db:migrate` + 对本地/远端 D1 各执行一次 migration SQL
- 改 env 不生效时先删 `.next` 缓存
- 给 codex 派重活必须：`-c model_reasoning_effort=medium` + spec 内写死「分段落盘 + 进度信标」（否则会挂死）

## 测试与验收基线

- `pnpm test` → 236 测试（moderation 16 / icons 16 / shared 41 / web 163）
- `cd apps/web && pnpm exec playwright test layout-baseline.spec.ts` → 9/9，**这是存量页面零 diff 的凭据，改布局后必跑**
