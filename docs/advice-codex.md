# 一链 YiLink 外部工程审计建议

> 审计日期：2026-08-06
> 范围：`docs/state-2026-08-06.md`、`docs/PRD.md`、`docs/architecture.md`，并抽查认证、发布/审核、公开渲染、统计、计费、Cloudflare/Docker 部署与 CI。
> 结论口径：以下判断针对已经公开运行的 `yilink.app`，不是对未来设计稿的评价。当前实现适合邀请制 beta，不具备无门槛多用户托管的安全基线。

## 一、上线后 90 天最可能出事的风险 Top 5

### 1. 审核是空壳，最先出事的会是钓鱼/灰产和共享域名信誉（滥用/合规，极高）

**证据：** 默认词库就是空数组，`LocalWordsModerationProvider` 只能返回 `pass` 或 `review`，根本没有返回 `block` 的路径（`packages/moderation/src/local-words.ts:3-13`）。发布接口却只拒绝 `block`，其余一律写成 `PUBLISHED`（`apps/web/src/app/api/v1/pages/[id]/publish/route.ts:44-72`）；测试甚至明确固化了“`review` 内容先发布、再等人审”的行为（`apps/web/src/app/api/v1/pages/[id]/publish/route.test.ts:121-141`）。与 PRD 承诺的云审核、URL 黑名单、落地页抓取和举报入口（`docs/PRD.md:96-99`）相比，公开页页脚实际只有 Powered by 文案（`apps/web/src/components/public/public-page.tsx:489-492`）。再叠加无需邮箱验证的公开注册（`apps/web/src/app/api/v1/auth/register/route.ts:20-49`）和免费账号可建 3 页（`packages/shared/src/plan.ts:3-6`），攻击成本接近零。

**90 天内的现实后果：** 一两个诈骗、成人或荐股页面就足以触发举报、搜索降权或平台域名拦截；此时受损的是所有正常用户，不是单个违规账号。所谓“信任分”目前只有后台可改字段（`apps/web/src/app/api/v1/admin/users/[id]/route.ts:11-45`），业务入口没有任何读取或限制，不能算风控。

**最小止血：** 立即关闭公开注册，改成邀请码/人工白名单；`review` 必须保持不可公开的 `REVIEW`/`DRAFT` 状态；在真正的内容安全 provider 和 URL 域名策略接通前，新增页面及外链一律人工放行；公开页先放一个可工作的举报邮箱/表单，并确保管理员可一键隐藏。

### 2. 注册和登录没有限频，既能批量养号，也能打 CPU 和撞库（安全/成本，高）

**证据：** 首页直接暴露注册入口（`apps/web/src/app/(marketing)/page.tsx:9-14`）；项目同时保留 Server Action 和 REST 两套注册写入口（`apps/web/src/app/(auth)/actions.ts:25-54`、`apps/web/src/app/api/v1/auth/register/route.ts:20-49`），两者都没有限频、验证码、邀请校验或邮箱确认。密码登录对已存在账号直接执行 bcrypt compare（`apps/web/src/lib/auth.ts:15-31`），密码规则也只有最短 8 位（`apps/web/src/lib/auth-validation.ts:5-8`）。部署文档已经承认 bcrypt 会超过 Workers 免费档 CPU 预算（`docs/deploy/cloudflare.md:8-10`），但代码没有任何成本熔断。自部署默认值还允许在未传 env 时使用可预测的 `AUTH_SECRET`（`docker/docker-compose.yml:6-10`）。

**90 天内的现实后果：** 机器人可以批量注册养号、枚举已注册邮箱、针对已知邮箱做撞库，并用密码哈希消耗 Workers CPU。内容审核即使补上，也会被账号洪水拖垮；使用默认 Compose 命令但漏配 env 的部署者则共享公开可猜的会话密钥。

**最小止血：** 在 Cloudflare 边缘先对 `/register`、注册 Action、Credentials 登录做 IP + 邮箱双维度限频；删掉一套注册入口；上线邮箱验证前保持邀请制；生产启动时检测占位/短 `AUTH_SECRET` 并直接失败，而不是带病启动。登录失败统一文案，注册重复邮箱响应也不要充当账号目录。

### 3. 匿名统计接口可被伪造，既污染客户报表又按请求烧 D1（滥用/成本，高）

**证据：** 公开页把 pageId 放进 DOM，内联脚本据此向 `/api/e` 发匿名 beacon（`apps/web/src/components/public/public-page.tsx:463-467`、`apps/web/src/components/public/interaction-script.ts:1`）。接口先查一次 Page、再为每个事件写一行 ClickEvent（`apps/web/src/app/api/e/route.ts:26-47`），但 `blockId` 只验证为任意字符串，并不验证它属于该页（`apps/web/src/lib/stats.ts:30-36`）。限频是当前进程的一张 `Map`（`apps/web/src/lib/stats.ts:38-46,121-135`），在多 Worker isolate 下不共享且重启即清空；取 IP 时还优先信任 `x-forwarded-for`（`apps/web/src/lib/stats.ts:105-113`）。现有测试只证明“一个进程、一个伪造头最多写 60 行/分钟”（`apps/web/src/app/api/e/route.test.ts:98-110`），并没有证明生产抗刷。

**90 天内的现实后果：** 单个 IP 按当前上限仍可写 86,400 条/天；多 IP、伪造代理头或多 isolate 会继续放大。攻击者既可把某创作者的浏览/点击刷成假数据，也可制造大量随机 blockId，让原始表、聚合 JSON、D1 写次数和账单一起增长。

**最小止血：** 先在边缘做真正共享的限频和每页/全站每日写入预算，超额时只丢统计、绝不能拖垮主页；校验 blockId 确属 pageId；优先使用受信代理注入的 IP 头并删除客户端可控转发头；把 VIEW 采样或按“IP 哈希 + 页面 + 时间窗”去重，避免“一次浏览一次 D1 写入”。

### 4. “只存聚合数据”与事实相反，删除、留存和告知都没有闭环（隐私/合规，高）

**证据：** PRD 把“只存聚合数据”列为隐私底线（`docs/PRD.md:86-89`），实际模型却逐事件保存 pageId、blockId、时间桶、来源和日盐 ipHash（`apps/web/prisma/schema.prisma:217-227`），采集接口也逐条持久化。唯一的清理逻辑在自部署 Node 脚本中，且只删除 90 天前数据（`apps/web/scripts/rollup-daily.mjs:36-65`）；该脚本用普通 `PrismaClient` 连接本地 SQLite（`apps/web/scripts/rollup-daily.mjs:68-75`），生产 `wrangler.jsonc` 只有 D1/R2 绑定和变量、没有 scheduled trigger（`apps/web/wrangler.jsonc:14-37`），所以当前 Cloudflare 生产线没有可见的汇总/删除执行链。计费还把完整 webhook payload 原样写入 `Order.raw`（`apps/web/src/lib/billing.ts:175-184,265-274`）。用户导出只含 user/pages/blocks（`apps/web/src/app/api/v1/me/export/route.ts:6-44`），`/me` 也只有 GET/PATCH、没有注销或删除接口（`apps/web/src/app/api/v1/me/route.ts:14-58`）。

**90 天内的现实后果：** 数据库持续膨胀，隐私政策无法如实写出“收什么、留多久、如何删除”；用户提出访问/删除请求时，团队也无法完整响应。ipHash 虽非原始 IP，仍是可关联的访客标识，不能对外宣称成“纯聚合”。完整保留支付 webhook 还把不必要的第三方字段一起扩大了泄露面。

**最小止血：** 在生产 Worker 接上每日 rollup + prune，并把原始事件留存压到实现统计所需的最短窗口（建议先按 24 小时到 7 天设计，而不是默认 90 天）；支付只落账必要字段，停止长期保存完整 raw；上线准确的隐私/留存说明和人工可执行的删除 SOP，随后补全量导出与账号删除。做不到之前，不要再使用“只存聚合数据”的对外表述。

### 5. 没有经过演练的恢复链路，误删或迁移事故发生时健康检查仍会报绿（数据丢失/可用性，中高）

**证据：** Cloudflare 部署文档只有建库、执行全量 DDL/手工增量 SQL 和部署步骤（`docs/deploy/cloudflare.md:12-32,47-54`），没有生产备份、RPO/RTO、恢复或回滚演练；D1 schema 也没有由应用维护的迁移账本。健康接口无条件返回 `{ok:true}`，完全不读数据库（`apps/web/src/app/api/health/route.ts:3-7`）。页面删除是立即 hard delete（`apps/web/src/app/api/v1/pages/[id]/route.ts:90-110`），Page/Block 关系又配置了级联删除（`apps/web/prisma/schema.prisma:156-200`），没有回收站。自部署文档给出的备份方式是在应用运行时直接 tar SQLite volume（`docs/deploy/docker.md:76-85`），也没有一致性校验和定期恢复测试。

**90 天内的现实后果：** 一次错误 SQL、错误页面 ID、D1 schema 手工操作或损坏的热备份，就可能造成不可逆数据损失；与此同时容器/Worker 健康检查仍是 200，团队会晚到用户投诉时才发现。平台自带恢复能力即便存在，也不等于本项目已经知道如何在压力下恢复。

**最小止血：** 每次生产 schema 变更前生成独立备份，并建立至少每日的异地/异账号副本；在 staging 实际做一次“空库恢复并校验用户/页面/订单数”的演练，记录 RPO/RTO；页面删除先进入 30 天软删除；把 readiness 检查改为轻量 DB 读，并为 SQLite 使用一致性备份方案或短暂停写后备份。

## 二、工程债 Top 5（按“不还的代价”从高到低）

1. **风控/部署开关是“道具代码”，代价是把未上线能力误判为已上线。** `Setting`、`trustLevel`、`ModerationProvider` 都有模型或后台界面，但 `MULTI_USER` 没有任何运行时读取，`.env.example` 也没有这个变量；注册永远开放，信任分不参与配额或发布，审核 provider 只有空词库（`apps/web/prisma/schema.prisma:271-274`、`apps/web/src/app/api/v1/auth/register/route.ts:20-49`、`packages/moderation/src/local-words.ts:3-13`）。不还的代价不是代码难看，而是域名、合规和运营事故。
2. **发布内容没有状态机和原子版本，代价是缓存旧、数据库新、审核记录又是另一版。** 编辑器对已发布页面仍直接调用 PATCH + blocks PUT + Server Action 三次保存（`apps/web/src/components/studio/page-editor.tsx:216-260`）；三条写路径都不判断发布状态、不重新审核、不失效公开页缓存（`apps/web/src/app/api/v1/pages/[id]/route.ts:59-87`、`apps/web/src/app/api/v1/pages/[id]/blocks/route.ts:33-62`、`apps/web/src/app/studio/actions.ts:17-37`），而公开页使用无 TTL 的 tag cache（`apps/web/src/app/p/[slug]/page.tsx:67-73`）。不还会同时制造“保存后不生效”和“先发正常内容、后换恶意内容绕审核”两类事故。
3. **后台任务和运维能力没有生产形态，代价是统计、留存与成本控制一起失效。** rollup 只是本地脚本，Cloudflare 没有调度入口；健康检查不碰 DB，也没有写入速率、审核积压、D1 容量或 webhook 失败告警。流量起来后，团队会先看到账单或投诉，而不是告警。
4. **测试与生产拓扑不一致，代价是“114 个测试”制造虚假安全感。** CI 只跑 lint/typecheck/unit/Next build，没有运行仓库已有的 `pnpm e2e`，也没有 `cf:build` 或 D1/R2 缓存烟测（`.github/workflows/ci.yml:29-43`）；Vitest 和 Playwright 都固定走本地 SQLite（`apps/web/vitest.config.ts:4-17`、`apps/web/playwright.config.ts:18-27`），测试初始化还用 `prisma db push --accept-data-loss` 而非真实 migration（`apps/web/vitest.global-setup.ts:3-11`）。不还会让 D1 adapter、缓存失效和迁移问题持续漏到生产。
5. **数据库/存储“可切换”只是架构愿望，代价是增长后被迫停机重写。** 架构声称 SQLite/PostgreSQL 可平滑切换（`docs/architecture.md:45-55`），实际 Prisma datasource 固定 SQLite（`apps/web/prisma/schema.prisma:8-11`），部署文档也承认仅改 URL 无法切 PostgreSQL（`docs/deploy/docker.md:87-96`）；架构中的 `StorageProvider` 同样没有实现，图片只是任意外链 URL。短期不必立刻迁库，但必须停止对外承诺“平滑切换”，并先定义真实的数据迁移、对象存储和回滚边界，否则用户量上来后改造成本最高。

## 三、下一迭代只有两周：工程任务清单（按 ROI 排序）

1. **Day 1 关公开注册，统一为单一邀请制入口，并在边缘给注册/登录/`/api/e` 加共享限频与总量熔断**——这是最小改动、最大幅度降低攻击面和账单风险的动作。
2. **建立 `DRAFT → REVIEW → PUBLISHED` 发布状态机，已发布内容的任何修改都生成待审版本而不是原地改线上记录**——一次解决审核绕过、缓存不一致和无法追溯三件事。
3. **接通一个真实内容审核 provider，补 URL 域名规则、`review` 不发布、页脚举报和管理员紧急隐藏回归测试**——共享域名能否活过 90 天取决于这条链，不取决于主题数量。
4. **重做统计止血层：校验 page/block 关系、可信 IP 解析、每页预算、去重/采样，并为 Cloudflare 增加每日 rollup/prune**——同时修复报表可信度、D1 成本和隐私留存。
5. **完成生产备份与恢复演练：迁移前备份、每日副本、30 天软删除、DB readiness 与 staging 恢复校验**——没有恢复演练的备份不能计入可用性基线。
6. **发布真实隐私/留存说明，停止保存完整支付 raw，并补全量导出与可执行的账号删除 SOP**——先让承诺与实际一致，再谈国内线或规模化获客。
7. **让 CI 跑 Playwright E2E、`cf:build` 和最小 D1/cache/migration smoke，并增加“review 不上线、发布后修改必须待审、限频跨实例”不变量测试**——防止本轮止血在下一次快速迭代中被悄悄回滚。

## 四、我认为 PRD 里应该砍掉的一条

**砍掉“$12/$25 一次买断终身托管”，尤其是 PRO 无限主页；买断只能对应软件许可/高级主题，不能承诺无限期承担云资源、审核、支持和合规成本。** PRD 把海外托管定为 `$12 / $25 终身`（`docs/PRD.md:205-214`），代码又把 PRO 页面数设为 `Infinity`（`packages/shared/src/plan.ts:3-7`），设置页继续承诺“功能只增不减”（`apps/web/src/app/studio/settings/page.tsx:153-190`）。但当前每次匿名访问/点击都会产生数据库操作，审核和域名风控也是永久的可变成本。这个定价不是“克制”，而是在卖一项没有成本上限的永久负债。

建议保留“自部署版/软件能力一次买断”，托管版改成年付、预付额度或至少明确页面数、事件数、带宽与公平使用上限；若商业上坚持一次付费，就必须有服务期限和续期价格。否则最优质的长期用户和最恶意的滥用者都会成为负毛利客户。

## 三行总结

1. 先关公开注册、让 `review` 不上线；现在最危险的不是功能少，而是审核空壳却对外开放。
2. 两周只做发布状态机、成本熔断、留存删除和恢复演练；营销页、计费开通和 V1.x 新功能全部后置。
3. 终身无限托管必须从 PRD 删除；开源可以买断，持续消耗云资源与人工责任的服务不能假装没有续期成本。
