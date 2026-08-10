# 进度存档（2026-08-10）

> 下次开工先读这份。工作区干净、全部已推送 GitHub；本地无未完成的后台任务。

## 一句话现状

产品已上线 https://yilink.app（邀请制公测），BENTO 自由布局 P0→P2 全部完成并合入，
8 个模板真机视觉评审已过（合身零溢出、护栏零违规），基线 9/9、236 测试全绿。
剩余是发布动作与两个未通电的外部依赖。

## 已完成（近期）

| 批次 | 内容 |
|---|---|
| Wave 5 | 邀请制注册、审核实体化（真词库+URL 黑名单+REVIEW 状态机）、统计防伪、数据运维闭环、门面真实化+定价+分发面板；已部署生产并回归 |
| BENTO P0 | 布局引擎纯函数（41 测试）、nullable 列零回填、block id churn 修复、原子 /layout 端点、8 模板×3 视口基线快照 |
| BENTO P1 | 公开页 BentoFlow 渲染（零框架 JS）、编辑器（桌面拖拽/移动点选/🎲 换个排法/✨ 一键整理/护栏）、真机全流程验证 |
| BENTO P2 | 8 模板 BENTO 坐标注入、建页走原子端点、admin restore 支持 REVIEW |
| BENTO P2 视觉评审 | 8 模板逐个真机过；6 类渲染缺陷修复 + 坐标/文案按实测重排；新增合身体检脚本；详见 `docs/design/bento-templates.md` §五 |

## 下次开工的候选（按建议优先级）

1. **发布动作**（物料已备好在 `docs/launch-posts.md`）：V2EX 邀请制公测帖 → 掘金长文 → 即刻。
   邀请码在 `~/.config/yilink/invite-codes.txt`（20 个，600 权限）。
2. **补齐 pending 平台图标**：小宇宙 / 喜马拉雅 / 即刻 / QQ音乐 / 京东 等在 `packages/icons` 里
   仍是 `source: "pending"`，渲染成灰底文字占位。播客模板受影响最明显（三个平台里两个是占位）。
   注册表由 `scripts/generate.ts` 从 `docs/design/platform-icons-verified.json` 生成，不要直接改 generated。
3. **BENTO 剩余打磨**：移动端点选面板的真机手感；P3 效率功能（多选/对齐/布局历史）。
4. LemonSqueezy 开户后填 env 通电收款；公众号 AppID 配好后微信转发卡片满血。

## 需要用户操作的外部依赖（未完成）

- **LemonSqueezy 开户**：建两个买断商品（$12 / $25），拿 checkout URL ×2、webhook secret、variant ID ×2。
  当前定价区显示「即将开放」。
- **国内可备案域名**：yilink.app 不可备案（已核实），国内链路未验证。

## 环境备忘（避免重复踩坑）

- Node：wrangler/playwright 需 Node 22 → `PATH=~/.nvm/versions/node/v22.23.2/bin:$PATH`
- Cloudflare 凭证：`CLOUDFLARE_API_TOKEN=$(grep '^CLOUDFLARE_API_TOKEN=' ~/Projects/buffett-archive/.env | tail -1 | cut -d= -f2-)`
- 本地 dev 走 wrangler 本地 D1（不是 SQLite 文件）；e2e 用 `YILINK_FORCE_SQLITE=1` 隔离
- **直接改本地 D1 不会让 `unstable_cache` 失效**：页面会继续吐旧数据。只删 `.next/cache` 不够，
  要删**整个 `.next`** 再重启 dev。判断是不是缓存：把某个值改成显眼的异常值看页面跟不跟随。
- **跑 e2e 前先停掉自己的 dev server**：playwright 配了 `reuseExistingServer`，会复用连着 wrangler D1
  的那个进程，导致 e2e 种子数据全都查不到、9 条全挂（看起来像代码坏了，其实是连错库）。
- **生产同理，而且重新部署也不会失效**：R2 增量缓存跨部署存活。绕过应用直接改远端 D1 后，
  要往 `yilink-tag-cache` 的 `revalidations` 表插一条失效记录，tag 形如 `<BUILD_ID>/page:<slug>`
  （`BUILD_ID` 取 `apps/web/.next/BUILD_ID`，每次构建都变，所以旧记录对新构建无效）：
  ```
  INSERT INTO revalidations (tag, revalidatedAt, stale, expire)
  VALUES ('<BUILD_ID>/page:<slug>', <毫秒时间戳>, <同>, <同>);
  ```
  正常路径应当走应用自身的接口（发布 / 审核放行都会调 `revalidateTag`），只有在手工改库时才需要这招。
- macOS 没有 `setsid`；要让 dev server 活过后台任务，用 `nohup … & disown`
- schema 变更后：`pnpm --filter @yilink/web db:migrate` + 对本地/远端 D1 各执行一次 migration SQL
- 给 codex 派重活必须：`-c model_reasoning_effort=medium` + spec 内写死「分段落盘 + 进度信标」（否则会挂死）

## 测试与验收基线

- `pnpm test` → 236 测试（moderation 16 / icons 16 / shared 41 / web 163）
- `cd apps/web && pnpm exec playwright test layout-baseline.spec.ts` → 9/9，**存量页面零 diff 的凭据，改布局后必跑**
- `cd apps/web && node scripts/bento-preview.mjs` 建 8 个预览页 → `node scripts/bento-fit-check.mjs`
  体检合身度（溢出 / 截断 / 空洞），**改模板坐标或文案后必跑**
