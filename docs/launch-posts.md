# 一链 YiLink 社区首发物料

> 2026-08-10 ｜ 对应 wave 5 收口动作（[iteration-plan-wave5.md](iteration-plan-wave5.md) §D）
> 事实基线：产品已上线 https://yilink.app ；仓库 github.com/zhangfeite/yilink（Apache-2.0）；当前为**邀请制公测**。
> 合规红线：全文不出现「Linktree」商标做对比宣传，统一用「link-in-bio」品类词；没有的数据不写（不提用户数、不提 star 数）；价格可提但购买入口一律写「即将开放」。
> 使用前检查：真机截图三张在 `docs/assets/`（`readme-editor.png` 编辑器 / `readme-page.png` 公开主页 / `readme-wechat.png` 微信内打开），发帖时按各平台规则上传或引用 README。

---

## 1. V2EX「分享创造」帖

**标题**：

> [开源] 一链 YiLink：可 Docker 自部署的中文 link-in-bio 聚合主页，针对微信内打开做了适配（邀请制公测，帖内发码）

**正文**：

把散落在各平台的自己装进一个页面：GitHub、掘金、公众号、B 站、小红书一次聚合，一个链接 + 一张二维码 + 一张分享海报发出去。起因很简单——国内同类工具要么停服要么丑，海外的在国内访问不稳，而「微信里能正常打开」「二维码/海报一等公民」这两件事没有任何开源项目做过，所以自己写了一个。

- 在线体验：https://yilink.app （演示主页：https://yilink.app/p/demo-photographer ）
- 仓库：https://github.com/zhangfeite/yilink （Apache-2.0，三张真机截图在 README 顶部）

**现在是什么状态**

邀请制公测。注册需要邀请码，不是饥饿营销，是安全考虑：多人 UGC 平台开放注册前，审核和限频得先经得起真实流量，我不想拿第一批用户的主页去验证。

**能力清单（都已上线，可现场验证）**

- 8 个场景模板 × 8 套主题 × 列表/网格双布局，5 分钟出页；
- 微信内打开适配：转发分享卡片、iPhone 安全区、防安卓强制反色（旧内核有兜底）；
- 二维码下载 + 浏览器端生成主题化分享海报，不经过服务器；
- 公开页访问与链接点击统计，近 30 天报表；
- 内容审核：真实违禁词库 + URL 域名黑名单 + 发布状态机——命中违禁直接拒绝发布，命中观察词进人工审核队列（页面不公开），已发布页面的每次修改都会重新过审；
- 数据一键导出 JSON，随时打包走人；
- Docker 一键自部署（SQLite，单容器）；海外托管官方路径是 Cloudflare Workers + D1，迁移零改造。

**定价**

免费版 3 个页面，够用不收钱；买断 $12 十页 / $25 五十页，一次付费终身使用，**永不涨价，老用户永远保价**。说实话的部分：收款方 LemonSqueezy 我还没完成开户，所以**购买入口现在显示「即将开放」**，价格先挂出来是因为我觉得第一天明码标价，比日后「养肥再收」诚实。

**邀请码怎么领**

- 本帖**前 50 位**回复的 v 友，我私信发码（回复里不用说邮箱，私信即可）；
- 不想排队的，去 GitHub 仓库开 issue 标题带「邀请码」三个字，同样发。

**未完成项（说在前面，免得浪费你的点击）**

1. **LemonSqueezy 未开户**：买断套餐的收款链路没通电，代码和 webhook 都就绪，差我这边开户；
2. **国内访问链路未验证**：yilink.app 域名不可备案（已核实），国内访问走的是 Cloudflare 默认链路，速度和稳定性我没有承诺的底气；可备案域名和备案流程都还没启动。介意这点的建议 Docker 自部署；
3. **模板和统计维度还少**：8 个模板、统计只有访问/点击两个维度加 30 天报表，自定义域名、活码、自由网格编辑器都在 roadmap 里没做。

求 star，更求拍砖。技术细节（微信适配那部分）我会另写一篇长文发掘金，这里不展开。

---

## 2. 掘金技术长文大纲

**标题**：《微信内置浏览器 H5 适配实战：UA 降级、防强制反色、color-mix 兜底与分享卡片》

**副标题/简介**：做一个「必须能在微信里正常打开」的 link-in-bio 产品时踩过的坑，全部来自真实上线项目（开源，Apache-2.0）。

**目标读者**：做 H5/活动页/移动端 Web 的前端；吃「微信 H5 适配」「微信浏览器 兼容」类搜索长尾。

### 章节结构与每章要点

**第 0 章 为什么微信内置浏览器是一个独立的适配目标**
- 它不是「手机浏览器」的子集：X5/WebKit 双内核并存、版本碎片化、强制反色、JS-SDK 特权接口，四个变量叠加；
- 本文全部案例来自一个真实上线的开源项目，每个坑附最小复现与修法，代码可直接看仓库。

**第 1 章 UA 探测与降级策略：不要相信特性，要相信能力**
- 微信 UA 的识别要点（MicroMessenger 字段、内核版本号位置），以及为什么「判断微信」本身不该是分支逻辑的主体；
- 能力检测优先于 UA 检测：用 CSS `@supports` 和 JS 运行时探测做降级，UA 只用于「已知 bug 名单」的精准规避；
- 给出项目的降级分层表：现代内核全量特性 → 旧 X5 降级集 → 兜底渲染，每层砍掉什么、保留什么。

**第 2 章 防安卓强制反色：主题色保卫战**
- 问题：部分安卓机型/深色模式下微信内核会强制反转页面颜色，精心设计的主页变成底片；
- `color-scheme` 的正确声明方式（meta + CSS 双写），为什么只写 `dark light` 反而引入新 bug；
- 关键技巧：用 `color-mix()` 表达主题色派生，以及它对旧内核不生效时的兜底——为每个派生色预计算静态值，用 `@supports` 分层覆盖；
- 附项目里的「防反色检查清单」：背景图、阴影、半透明遮罩各自怎么处理。

**第 3 章 viewport-fit 与安全区：iPhone 刘海下的公开页**
- `viewport-fit=cover` 与 `env(safe-area-inset-*)` 的正确组合，最常见的错误（padding 加错了层、fixed 底部按钮被 Home 指示条挡住）；
- 微信内顶部标题栏/底部工具栏与网页安全区的叠加关系；
- 公开页这种「全屏沉浸式」布局和「表单页」布局各自的安全区方案。

**第 4 章 分享卡片：og 兜底与 JS-SDK 增强的两层架构**
- 微信转发卡片的数据来源：没接 JS-SDK 时靠 og meta，接了才能自定义标题/缩略图/链接；
- 为什么架构上要永远保证 og 兜底可用：AppID 配置缺失、签名过期、非公众号环境都要能降级成不丑的卡片；
- og 图的生成策略：服务端 SSR 注入 vs 静态生成，公开页这种 UGC 场景怎么选；
- JS-SDK 插槽设计：配置项后注入，页面代码不感知，配置缺失时零报错静默降级。

**第 5 章 SSR 首屏预算：微信里白屏 3 秒等于流失**
- 微信内打开的场景特殊性：用户从聊天/朋友圈点进来，耐心比浏览器更短；
- 首屏预算拆解：HTML 体积、关键 CSS 内联、图片懒加载边界，每一项的具体数值目标；
- 公开页 SSR 渲染路径与缓存策略（revalidate 与机审状态机的配合）；
- 用真机数据说话：微信内首屏可交互时间的测量方法与结果。

**第 6 章 工程化沉淀：把适配变成不变量**
- 把「微信内不崩」写进 CI：Playwright 模拟微信 UA 与视口的 E2E 用例；
- 哪些坑测试防不住，只能靠真机实测清单（附清单模板）。

**结尾（自然带产品）**
- 以上全部代码在 github.com/zhangfeite/yilink（Apache-2.0），公开页渲染与分享卡片部分可直接抄；
- 产品本体是开源的中文 link-in-bio 工具一链 YiLink（yilink.app），正在邀请制公测，Docker 可自部署；觉得文章有用，欢迎 star 和拍砖。

**配图计划**：每章配 1 张「翻车前/修复后」对比截图或代码片段；第 3、4 章用 `docs/assets/readme-wechat.png` 做效果示例。

---

## 3. 即刻短帖（≤300 字）

> Bento 关停的公告出来时，评论区最多的一句话是「我的页面怎么办」。这类工具关停时，用户能带走的东西往往少得可怜。
>
> 所以写了一个：一链 YiLink，开源的中文 link-in-bio 工具。
>
> 先说好看的：8 套主题 × 网格/列表双布局，默认就不丑，微信里点开有适配过的分享卡片和安全区。再说踏实的：数据一键导出 JSON，Docker 一条命令部署在自己服务器上——这次谁关停都带不走我的主页。
>
> 已上线 yilink.app，Apache-2.0 全开源。现在是邀请制公测，想要邀请码的评论区扣 1，我私信你。免费版 3 页够用，想支持的 $12 买断十页，永不涨价。
>
> [配图：readme-page.png 网格主题成品页 + readme-wechat.png 微信内打开效果]

（正文约 240 字，配图 2 张。）

---

## 4. GitHub Release v0.1.0 说明（英文）

**Tag**: `v0.1.0` ｜ **Title**: `v0.1.0 — First public release (invite-only beta)`

```markdown
## YiLink v0.1.0

YiLink (一链) is an open-source, self-hostable link-in-bio and digital business-card
app built for Chinese creators and teams. One page aggregates all your platforms,
with QR codes and share posters as first-class citizens. Apache-2.0.

Live hosted instance: https://yilink.app (invite-only beta)
Demo page: https://yilink.app/p/demo-photographer

### Highlights

- **8 scene templates × 8 themes × 2 layouts** (list / grid) — publish a polished
  page in minutes, no design skills required.
- **WeChat in-app browser adaptation** — share cards (Open Graph fallback +
  JS-SDK slot), iPhone safe-area handling, and protection against forced dark-mode
  color inversion on older Android kernels, with `color-mix()` fallbacks.
- **QR codes & share posters** — downloadable QR codes and themed posters
  generated entirely in the browser; nothing is sent to a server.
- **Analytics** — page-view and link-click tracking with a 30-day report.
  Views are deduplicated per visitor-hash per page per hour; visitor hashes are
  daily-salted and raw events are pruned after 30 days.
- **Content moderation** — a real wordlist (gambling / adult / financial-scam /
  contraband / sensitive base sets, with full-width, separator and zero-width
  evasion handling), a URL domain blocklist, and a publish state machine: blocked
  content is rejected outright, flagged content enters manual review (page stays
  private), and every edit to a published page is re-moderated.
- **Data portability** — one-click JSON export of all your data, anytime.
- **Two deployment paths** — Docker Compose with SQLite (single container), or
  Cloudflare Workers + D1 for managed hosting (same SQL dialect, zero-migration).
- **Quality baseline** — unit tests, Playwright E2E, and CI including Docker build.

### Quick start (Docker)

```bash
cp docker/.env.example docker/.env
# Edit docker/.env: set a strong AUTH_SECRET and your AUTH_URL
docker compose --project-name yilink --env-file docker/.env -f docker/docker-compose.yml up -d --build
```

The app runs at http://localhost:3000. See `docs/deploy/docker.md` for full
setup, upgrade and backup procedures, and `docs/deploy/cloudflare.md` for the
Workers + D1 path. Source-mode setup (Node.js 20+, pnpm) is documented in the
README.

### Pricing on the hosted instance

Free tier includes 3 pages. One-time lifetime licenses: **$12 for 10 pages**,
**$25 for 50 pages** — pay once, use forever, price will never increase, and
early buyers are grandfathered forever. Note: checkout is **not live yet**
("coming soon"); the payment integration (LemonSqueezy webhooks) is code-complete
and pending account setup. Self-hosting is, of course, free and unlimited.

### Known limitations

- **Invite-only beta**: registration on the hosted instance requires an invite
  code. Reply to the V2EX launch post or open a GitHub issue with "邀请码" in
  the title to get one. Self-hosted instances are open by default.
- **Checkout not yet live** (see above) — paid tiers cannot be purchased yet.
- **Mainland China access is unverified**: yilink.app cannot obtain an ICP
  filing (verified), so mainland visitors use the default Cloudflare route with
  no latency/reliability guarantees. A filing-ready domain is planned but not
  started. Self-hosting avoids this entirely.
- **Template and analytics depth is still limited**: 8 templates; analytics
  covers views/clicks with a 30-day report only. Custom domains, dynamic QR
  codes, a free-form grid editor, and richer stats are on the roadmap.
- The marketing homepage and admin tooling are functional but minimal.

### Contributing

See `CONTRIBUTING.md` for local development, checks, and review process.
Issues and PRs welcome — especially real-device WeChat browser findings.
```
