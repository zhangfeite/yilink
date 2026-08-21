# 发布事实校准清单（2026-08-14）

> 逐条把 `docs/launch-posts.md` 的对外承诺对到代码证据上。
> 校准方法：每条都在仓库里找到实现位置，或确认其不存在。**发帖前必须清零全部 ❌ 与 ⚠️。**
>
> 为什么要做这件事：发帖是一次性的注意力。若首批用户到达后发现「说的和做的不一样」，
> 那一次曝光就被用来发现承诺不一致，而不是验证产品需求——这是最贵的一种浪费。

## ❌ 过度承诺（说了但用户拿不到）

| # | 物料原话 | 代码事实 | 处置 |
|---|---|---|---|
| 1 | 「公开页访问与链接点击统计，**近 30 天报表**」（V2EX §核心能力） | API `/api/v1/pages/[id]/stats` 完整可用（`getRecentPageStats`，30 天日粒度 + 实时当日），但**前端零调用方**；`/studio/data` 页写死「统计面板将在后续版本开放」（`i18n/zh-CN.json:330`） | 二选一：**接上 UI**（推荐，后端已完备，成本低）或从文案删除该承诺 |
| 2 | 「数据**一键导出** JSON，随时打包走人」（V2EX §核心能力 + 掘金文案） | API `/api/v1/me/export` 可用且带 `Content-Disposition`，但 studio 全站**无任何入口**（grep 零命中） | 加一个按钮即可，属信任承诺核心，**必须做** |
| 3 | 「注册需要邀请码……是安全考虑：审核和限频得先经得起真实流量」（V2EX §邀请码怎么领） | 邀请码 = `INVITE_CODES` 环境变量白名单（`lib/invite.ts`），**无 Invite 表、无核销、无次数上限**。任一码可无限复用；而文案又说要发给「前 50 位回复」+ GitHub issue 任意索取 | **一个码泄漏 = 开放注册**，安全理由自相矛盾。需真核销（见下方 P0-2） |
| 4 | 「前 **50 位**回复的 v 友我私信发码」 | `~/.config/yilink/invite-codes.txt` 只有 **20 个**码 | 数量对齐，或改为可核销邀请后按需生成 |

## ⚠️ 反向漂移（做了但没说 / 说反了）

| # | 物料原话 | 代码事实 | 处置 |
|---|---|---|---|
| 5 | 「自定义域名、活码、**自由网格编辑器**都在 roadmap 里没做」（V2EX §还没做的） | **BENTO 自由布局已完整上线**：编辑器（桌面拖拽/移动点选/换排法/一键整理/护栏）、公开页零 JS 渲染、8 模板坐标、视觉评审、布局基线 9/9 | 这是产品**最大的差异化卖点**，被自家文案否认了。必须改写并前置 |
| 6 | 「8 套主题 × **网格/列表双布局**」 | 实为三种布局（LIST / GRID / BENTO 自由布局） | 同上 |
| 7 | 「统计只有访问/点击两个维度」 | 实际已有 PV/UV/点击 + 按区块 + 按来源渠道（`DailyStat.byBlock` / `byRef`） | 低估了，可如实上调 |

## ✅ 已核实属实

| 承诺 | 证据 |
|---|---|
| 8 个场景模板 × 8 套主题 | `templates.json` 8 个 / `themes.json` 8 套 |
| 二维码下载 | `/api/v1/pages/[id]/qr` PNG+SVG，尺寸夹取 |
| 浏览器端生成分享海报、不经过服务器 | `share-panel.tsx` 为 `'use client'`，`lib/poster.ts` 走 canvas |
| 内容审核：违禁词库 + URL 黑名单 + 状态机 + 改后重审 | `packages/moderation` + publish/PATCH/blocks/layout 四个写入口均过审 |
| iPhone 安全区适配 | `public-page.module.css` 两处 `env(safe-area-inset-*)` |
| 防安卓强制反色 | 元素级 `colorScheme` 跟随主题（`public-page.tsx:101`、`p/[slug]/page.tsx:173`） |
| Docker 一键自部署（SQLite 单容器） | `docker/Dockerfile` + `docs/deploy/docker.md` |
| Cloudflare Workers + D1 托管、迁移零改造 | 已上线运行中 |
| 不收抽成、免费版 3 页 | `PLAN_LIMITS.FREE.pages = 3`，与首页文案一致 |
| LemonSqueezy 未通电（已如实披露） | 代码就绪、env 未配 |
| yilink.app 不可备案（已如实披露） | 已核实 |

## ⚠️ 需在文案中补充披露的限制

| # | 事实 | 为什么要说 |
|---|---|---|
| 8 | **微信转发分享卡片分两层**：og 标签层已生效（公开页 og:title/description/image 齐全）；JS-SDK 增强层需 `WECHAT_JSSDK_APP_ID/SECRET`，**生产未配置**（`wechatJssdkEnabled()` 返回 false） | 文案说「转发分享卡片」易被理解为 JS-SDK 满血形态 |
| 9 | 公开页 og:image 目前指向 **unsplash 外链**（演示页数据），非自有资产 | 微信内可能加载失败，且演示页不代表真实用户页的表现 |

## ❌ 发布链路自身的硬伤（与物料无关，但直接吃掉发帖流量）

| # | 问题 | 证据 | 后果 |
|---|---|---|---|
| 10 | **首页零 og 标签** | `curl https://yilink.app/` 的 `<head>` 只有 `<title>` 与 `<meta name=description>` | 发到即刻/微信/推特的链接卡片**空白无图** |
| 11 | **`sitemap.xml` 404**，`robots.txt` 是 Cloudflare 默认模板（无 Sitemap 指令） | 线上实测 | 搜索引擎无索引地图 |
| 12 | **注册页邀请码必填，零说明去哪拿** | `/register` 表单三字段，无帮助文案 | 首页「免费开始」对公开访客是死路 |
| 13 | **注册成功后跳登录页要求二次输入** | `app/(auth)/actions.ts:59` `redirect('/login?registered=1')` | 邀请制样本本就稀少，白白损失激活率 |
| 14 | **E2E 未覆盖黄金路径** | `e2e/` 仅 `auth.spec.ts` + `layout-baseline.spec.ts` | 建页→发布→公开访问这条最关键链路无回归守护 |

---

## 结论

发帖不必等两周，但**至少要先清掉 ❌ 与发布链路硬伤**。
其中 1、2、10、12、13 都是半天到一天量级的小活，5 是纯文案改写却价值最高——
它把产品最强的一张牌从「没做」改成「做了」。
