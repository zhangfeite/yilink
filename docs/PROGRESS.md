# 进度存档（2026-08-23）

> 下次开工先读这份。工作区干净、全部已推送 GitHub；本地无未完成的后台任务。

## 一句话现状

产品已上线 https://yilink.app（邀请制公测）。2026-08-23 完成**壳设计系统重做**（spec-18：营销页/登录注册/
工作台/编辑器全部与公开页同源，唯一 accent、两层海拔、大字立面；`src/app` + `src/components` 违禁色零命中）
与**公测激活基础设施**（spec-19：激活里程碑 + 渠道归因、邀请码可核销、反馈组件、生产巡检），均已部署。
阶段 0 的邀请码说明 + `?invite=` 预填 + 如实 CTA 也随本轮上线。E2E 11/11、单测 183+78。
**现在真的只剩发帖。**

## 安全审计结论（2026-08-14 自查，修复已上线）

已修：HIDDEN→unpublish→publish 洗白路径（409 闭合）；登录/注册进程内滑窗限流；
全站安全响应头（nosniff/Referrer-Policy/HSTS/frame-ancestors，公开页 'self' 供首页
iframe 预览）；avatarUrl 协议闸（schema+渲染双层）；CRON 常数时间比较；
图标 meta 轻量入口（字形不再传染进非编辑器客户端 bundle）。

已核对无问题：全部路由所有权/角色校验、webhook HMAC 验签与幂等、/api/e 防伪层次、
SafeMarkdown 与区块 URL 协议闸、revalidateTag 覆盖、D1 事务形态、CSRF（SameSite=Lax）。

**已知残留（按风险排序）**：
1. 进程内限流在 Workers 上按 isolate 计数，真机 11 连发未触发 429（isolate 轮换）。
   生产级防线要在 Cloudflare 控制台配 WAF Rate Limiting 规则（对 `/api/v1/auth/*` 与
   `/api/auth/callback/credentials`，如 10 req/min/IP）——控制台操作，需用户执行。
2. 建页数量上限存在读-写竞态（并发建页可少量超限），公测规模无实际影响。
3. 事件端点 /api/e 每次落一读一写 D1，极端刷量下的成本上限依赖 Cloudflare 限频。

## 已完成（近期）

| 批次 | 内容 |
|---|---|
| Wave 5 | 邀请制注册、审核实体化（真词库+URL 黑名单+REVIEW 状态机）、统计防伪、数据运维闭环、门面真实化+定价+分发面板；已部署生产并回归 |
| BENTO P0 | 布局引擎纯函数（41 测试）、nullable 列零回填、block id churn 修复、原子 /layout 端点、8 模板×3 视口基线快照 |
| BENTO P1 | 公开页 BentoFlow 渲染（零框架 JS）、编辑器（桌面拖拽/移动点选/🎲 换个排法/✨ 一键整理/护栏）、真机全流程验证 |
| BENTO P2 | 8 模板 BENTO 坐标注入、建页走原子端点、admin restore 支持 REVIEW |
| BENTO P2 视觉评审 | 8 模板逐个真机过；6 类渲染缺陷修复 + 坐标/文案按实测重排；新增合身体检脚本；详见 `docs/design/bento-templates.md` §五 |

## 迭代路线（2026-08-19 裁决，依据 docs/launch-fact-check.md + 三角度提案 + Codex 独立判断）

**阶段 0 · 发帖前（≤1 天）**
- ~~注册页邀请码零说明 → 加「去哪拿」说明 + `?invite=` URL 预填 + 首页「免费开始」改为如实的「申请公测」~~ ✅ 已上线（08-23）
- 用 `node apps/web/scripts/invites.mjs create --channel v2ex --count 30` 生成可核销邀请码（明文只打印一次），替代环境变量白名单
- Cloudflare 控制台配 WAF 限流（用户操作；代码层限流在 Workers 上按 isolate 计数，不够）
- **只发 V2EX**，留 24–48h 观察窗再发下一渠道（否则分不清哪个渠道有效）。文案用 `docs/launch-posts-v2.md`

**阶段 1 · 有用户的第一周（按真实阻断排序，预留 2 天修 bug 容量）**
- ~~激活漏斗 / 邀请码核销 / 反馈组件 / 生产巡检~~ ✅ 基础设施已上线（08-23）。待接：`FeedbackLink` 组件接进工作台；`recordShared` 在分享面板接入
- 按渠道分批发帖，`/admin` 的「激活」区块看 注册→建页→发布 的转化与耗时

**阶段 2 · 第 2–3 周（有信号再做）**
- ~~模板画廊 / 首页转化骨架~~ ✅ 已随壳重做上线（画廊放首页第二屏，未建 `/templates` 子路由）
- 叙事从「又一个聚合主页」收窄为「一页成交页」（纯文案层，不建新模块）——仍待做
- 壳的剩余打磨：编辑器移动端真机手感；「开源可自部署」特性卡换新壳截图

**阶段 3 · LemonSqueezy 通电后**：收款上线 → 预约/表单区块作为第一个增值点

**明确不做（直到有信号）**：自定义域名、活码、Media kit、统计地域/设备/时段、多页面、AI 生成、团队版、
BENTO 多选/对齐/历史、图片上传（带存储与审核成本，收款未通电前不装）。

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
- **绝不把本地 SQLite 的 SQL 导出直接灌进 D1**：Prisma 原生 SQLite 引擎把 DateTime 存成 integer 毫秒，
  D1 适配器存 ISO 文本。混入 integer 行后，任何 select 到 DateTime 列、扫到这些行的查询都会整条抛
  转换错（2026-08-19 线上三张 demo 页让 sitemap 空了多日）。种子数据走应用 API 或 Prisma+D1 适配器写入；
  已混入的用 `strftime('%Y-%m-%dT%H:%M:%fZ', col/1000.0, 'unixepoch')` + `WHERE typeof(col)='integer'` 修。
- **不要用 `.catch(() => [])` 吞数据层错误**：上面那个问题就是被它藏住的。至少 console.error，让 wrangler tail 看得见。
- schema 变更后：`pnpm --filter @yilink/web db:migrate` + 对本地/远端 D1 各执行一次 migration SQL
- 给 codex 派重活必须：`-c model_reasoning_effort=medium` + spec 内写死「分段落盘 + 进度信标」（否则会挂死）

## 测试与验收基线

- `pnpm test` → 261 测试（moderation 16 / icons 21 / shared 41 / web 183）
- `node apps/web/scripts/ui-audit.mjs` → 壳全界面截图，**改壳后必跑并看图**；违禁色：`grep -rlE "(slate|blue|amber|emerald|green|yellow|gray|zinc)-[0-9]" src/app src/components | grep -v 'test\|components/public'` 必须为空
- `cd apps/web && pnpm exec playwright test` → 11/11；其中 `activation.spec.ts` 是黄金路径（注册→建页→发布→公开页），**改建页/发布/认证后必跑**
- `cd apps/web && pnpm exec playwright test layout-baseline.spec.ts` → 9/9，**存量页面零 diff 的凭据，改布局后必跑**
- `cd apps/web && node scripts/bento-preview.mjs` 建 8 个预览页 → `node scripts/bento-fit-check.mjs`
  体检合身度（溢出 / 截断 / 空洞），**改模板坐标或文案后必跑**
