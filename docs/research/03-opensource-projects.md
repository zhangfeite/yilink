# 开源 Link-in-Bio（Linktree 替代）项目调研与基座选型

- **调研日期**：2026-08-04（文中 star 数、活跃度均为当日通过 GitHub REST API / 仓库页面查得的快照）
- **调研方法**：GitHub topic `linktree-alternative` / `link-in-bio` 按 star 排序全量扫描 + 逐仓库 API 核实（star / license / pushed_at / archived）+ 针对已知项目（LinkStack、LittleLink、Linkin、Singlelink、BioDrop、OpenBio、Zenith）逐一验证现状 + 中文/Gitee 定向检索
- **背景**：做"中国版 Linktree"，产品自身将开源，并可能提供云托管收费服务 → license 兼容性是硬约束

---

## TL;DR

1. 赛道内**没有**"栈现代 + 活跃 + 宽松许可 + 平台完整"四者兼得的基座。功能最完整的 LinkStack 是 **AGPL + PHP/Laravel**；许可最自由的高质量代码（BioDrop，MIT）**已于 2024-08 归档死亡**；其余 MIT 项目要么是静态单页、要么是单人小项目。
2. 未发现有影响力的中国大陆原生同类开源项目（详见 §3.10），"中国版"的本地化差异（微信生态、国内平台按钮、备案、小程序）在所有现有项目中都是空白——这部分无论选谁都要自己写。
3. **推荐路线 (c) 混合**：自研核心（自有代码用 MIT 或 Apache-2.0，保留 open-core 空间），把 BioDrop / littlelink / librelinks 等 MIT 资产当"代码矿"搬运复用，把 LinkStack 仅当功能基准与竞品参照（**其 AGPL 代码一行不进仓库**）。详见 §5。

---

## 1. 候选项目对比总表

星数与活跃度截至 **2026-08-04**；"活跃度"以仓库 pushed_at / 最近发版为准。

| 项目 | Stars | License | 技术栈 | 活跃度 | 一句话评价 |
|---|---|---|---|---|---|
| [BioDrop](https://github.com/EddieHubCommunity/BioDrop)（原 LinkFree, EddieHub） | 5,693 | MIT | Next.js + MongoDB | **已归档**（2024-08-07，服务 2024-06 关停） | 星最高、工程化最好，但项目已死；MIT 使其成为最有价值的"代码矿" |
| [LinkStack](https://github.com/LinkStackOrg/LinkStack)（原 LittleLink Custom） | 3,725 | **AGPL-3.0** | PHP 8.2 / Laravel + Blade，SQLite/MySQL | 活跃（push 2026-07-21；v4.8.6 发布于 2026-02-17） | 功能最完整的多用户自托管平台；代价是 AGPL + PHP 传统栈 |
| [littlelink](https://github.com/sethcottle/littlelink) | 3,044 | MIT | 纯 HTML/CSS（无框架无后端） | 活跃（push 2026-07-29） | 100+ 品牌按钮样式库 + 单页模板，不是平台；MIT 资产价值高 |
| [littlelink-server](https://github.com/timothystewart6/littlelink-server) | 1,146 | MIT | Next.js + TS + Docker | 活跃（push 2026-08-02） | littlelink 的容器化单用户版，环境变量配置，60+ 按钮、多语言、健康检查 |
| [LinkFree](https://github.com/MichaelBarney/LinkFree)（MichaelBarney，最初代） | 692 | Apache-2.0 | 静态 HTML/CSS | 低活跃（push 2026-04） | 最早的开源 Linktree 之一，fork 式静态页，仅历史价值 |
| [Singlelink](https://github.com/singlelink-co/Singlelink)（曾计划改名 Neutron） | 585 | GPL-3.0 | Next.js + GraphQL(Apollo) + MySQL | **实质停更**（最后 push 2023-03-07） | README 仍自称"维护中"，但已 3 年多无提交；Neutron 重构未完成即弃坑 |
| [johnggli/linktree](https://github.com/johnggli/linktree) | 518 | MIT | HTML/CSS | 停更（2024-06） | 个人静态模板，非平台 |
| [oneurl](https://github.com/KartikLabhshetwar/oneurl) | 427 | BSD-3-Clause | TS / Next.js | 一般（push 2026-01-24） | 新兴单人项目，规模小 |
| [Linkees](https://github.com/heysagnik/Linkees) | 391 | **无 License** | React / TS | push 2026-07 | 未声明许可证 = 法律上默认保留所有权利，**不可作为基座** |
| [openbio](https://github.com/vanxh/openbio) | 362 | **AGPL-3.0** | Next.js T3 栈（tRPC/Prisma） | 低活跃（push 2026-04-06） | 栈最现代，但单人项目 + AGPL，热度一般 |
| [librelinks](https://github.com/urdadx/librelinks) | 197 | MIT | Next.js 13 + Prisma + MongoDB | 低活跃（push 2026-04-21） | MIT 多用户平台雏形，自带主题与浏览/点击/地域统计，可参考数据模型 |
| [linkyee](https://github.com/ZhgChgLi/linkyee) | 166 | MIT | 静态 + GitHub Actions/Pages | 活跃（push 2026-08） | 繁体中文文档（作者 ZhgChgLi，大中华区/台湾），纯静态 fork 部署模式 |
| [LinkPage](https://github.com/rhnvrm/linkpage) | 136 | BSD-2-Clause | Go + SQLite | 一般（push 2026-04） | Go 单二进制自托管，带管理后台与点击统计，小而精 |
| [Linkin](https://github.com/RizkyRajitha/linkin) | 84 | MIT | Next.js (JS) + Postgres | **停更**（最后 push 2024-06-10） | 任务点名核实的那个 Next.js 项目：规模小（84★）且已停更，不足以做基座 |
| [imsyy/home](https://github.com/imsyy/home) | 4,586 | MIT | Vue | 低活跃（push 2025-05-29） | 中文"个人主页"模板，相邻品类（单人展示页，非多用户 link-in-bio 平台） |

长尾补充（均为小项目，仅备查）：`keksiqc/shako`（101★，GPL-3.0，TS，活跃）、`Manak-hash/LinkBreeze`（82★，MIT，TS，自带隐私优先统计，活跃）、`rishi-raj-jain/itsmy.fyi`（202★，AGPL）、`realvjy/nxt-lnk`（378★，MIT，Next.js 个人模板）、`chriskthomas/linkfree-generator`（168★，Apache-2.0，PHP 生成器）、`paoloronco/OrbitPage`（56★，MIT，活跃）。

**关于 "Zenith"**：按 "Zenith + linktree / bio link / self-hosted" 多组关键词检索，未能定位到任何有影响力的同名 link-in-bio 开源项目（同名的知名项目是一个 Rust 系统监控工具）。判断为小众项目已消失或改名，**查不到，不作评估**。

---

## 2. 重点项目详评

### 2.1 LinkStack —— 唯一"产品级完整"的活跃基座（但是 AGPL + PHP）

- **仓库**：https://github.com/LinkStackOrg/LinkStack ｜ 3,725★ ｜ AGPL-3.0 ｜ push 2026-07-21，最新版 v4.8.6（2026-02-17）
- **前身**：LittleLink Custom（littlelink 的动态化 fork），2022 年改名 LinkStack
- **技术栈**：PHP 8.2 + Laravel + Blade 模板；默认 SQLite、可切 MySQL；官方 Docker 镜像（`linkstackorg/linkstack`，配套 linkstack-docker 仓库 513★）
- **功能**（自托管 Linktree 替代里最全）：多用户注册 + 管理后台（管理员管理全站用户/链接）、主题系统 + 社区主题市场（linkstack-themes 仓库，后台可直接上传主题）、页面浏览与每链接点击统计、短链 QR 码（可下载 PNG/SVG，扫码与点击分开归因）、vCard、一键在线更新器、自定义 CSS/背景/按钮形状
- **i18n**：有多语言机制（Laravel lang），但**官方中文语言包情况未能在本次调研中确认**（docs 未检索到 zh-CN 说明，组织下也无独立翻译仓库），按"需要自己补翻译"预估
- **维护者**：核心是 Julian Prieber 一人主导 + 社区贡献，**单点维护风险真实存在**
- **二次开发判断**：Laravel 单体，改造门槛低（PHP 开发者多、宝塔/虚拟主机都能跑，对国内"自部署人群"反而友好）；但前端是 Blade 服务端模板 + 主题 zip 的思路，**非组件化**，要做微信 H5 精细适配、现代交互编辑器、小程序 API 化时等于把前端重写；且 AGPL 决定了整个衍生产品必须 AGPL（见 §4）

### 2.2 BioDrop（原 EddieHub LinkFree）—— 已死亡的最大 MIT 代码矿

- **仓库**：https://github.com/EddieHubCommunity/BioDrop ｜ 5,693★ ｜ MIT ｜ **2024-08-07 归档，只读**
- 历程：LinkFree（2021）→ 2023-08 更名 BioDrop（biodrop.io）→ 2024-06-10 服务关停、数据库删除 → 2024-08 仓库归档。注意组织名是 `EddieHubCommunity`（用 `EddieHub/BioDrop` 查 API 会 404）
- **技术栈**：Next.js + MongoDB + Tailwind，工程化在同类里最好（测试、Storybook、E2E、贡献者流程）
- **判断**：直接 fork 复活不划算（依赖两年未升级、社区已散、品牌无延续价值）；但 **MIT 许可 + 多用户平台全套实现**（Profile/链接/里程碑/统计的数据模型、组件库、测试）是自研时最值得搬运的参考代码，合法且零传染

### 2.3 littlelink / littlelink-server —— MIT 静态资产与容器化单用户版

- littlelink（3,044★，MIT，纯 HTML/CSS，Seth Cottle 维护，活跃）：本体只是"一个人一个静态页"，**不是平台**；真正的价值是维护了 100+ 海外品牌按钮的配色/图标/CSS 规范。注意：全是海外平台（GitHub/X/YouTube…），**微信/抖音/小红书/B站等国内平台按钮基本空白**，直接复用价值有限，但其按钮体系的组织方式值得抄
- littlelink-server（1,146★，MIT，Next.js+TS，push 2026-08-02，活跃）：Docker + 环境变量配置的单用户版，带多语言（LANG 环境变量）、analytics 集成、健康检查；适合参考其容器化与配置化思路，不适合做多租户 SaaS 基座

### 2.4 Singlelink / Neutron —— 确认死亡

585★，GPL-3.0，Next.js + GraphQL + MySQL。README 至今写着"co-founder Jim Bisenius 业余维护中"，但 API 显示**最后 push 为 2023-03-07**，3 年多零提交；当年高调的 Neutron 重构（neutron.so）未完成即弃坑。结论：**排除**，且其经历（个人激情项目 → 商业化失败 → 弃坑）正是选基座要规避的典型风险。

### 2.5 Linkin（RizkyRajitha）—— 核实完毕：小且停更

84★，MIT，Next.js(JS)+Postgres，单用户 + 简单后台，最后 push 2024-06-10。demo（linkindemo.vercel.app）尚在。体量与活跃度均不足以作基座，**排除**。

### 2.6 openbio（vanxh）—— 栈最现代的 AGPL 单人项目

362★，AGPL-3.0，Next.js + tRPC + Prisma（T3 栈），homepage openbio.app，push 2026-04-06，单人维护、热度一般。栈虽合口味，但"AGPL + 单人 + 低热度"三连，作基座风险大于收益；其 tRPC 项目结构可作自研参考（注意：**参考架构思路可以，抄代码会引入 AGPL**）。

### 2.7 librelinks —— MIT 平台雏形，参考价值大于基座价值

197★，MIT，Next.js 13 + Prisma + MongoDB，多用户、主题、内建浏览/点击/国家/设备统计，有 Dockerfile；单人维护（urdadx），push 2026-04。体量小不足以直接当基座，但它是**少数 MIT 且多用户带统计**的实现，数据模型和统计埋点设计可直接借鉴/搬运。

### 2.8 其他值得一提

- **LinkPage（rhnvrm/linkpage）**：Go + SQLite 单二进制，带后台、拖拽排序、点击统计，BSD-2。如果后端走 Go，这是最干净的参考实现
- **Linkees**：391★ 但无 LICENSE 文件——未授权即"保留所有权利"，任何复用都有法律风险，仅可看设计
- **MichaelBarney/LinkFree**：Apache-2.0 初代项目，静态 fork 模式，历史参考

### 2.9 GitHub topic 扫描结论

topic `linktree-alternative` / `link-in-bio` 按 star 降序前 30 名已全部过目（列表见 §1 总表与长尾）。300★ 以上且活跃且是"平台"（多用户+后台）的，只有 LinkStack 一个；MIT 阵营全部是静态页、单用户或小体量项目。这个格局本身就是结论的一部分。

### 2.10 中国开发者 / 中文项目专项核查

- 定向检索（GitHub 中文关键词"链接聚合/链接树"、site:gitee.com、知乎相关问题）**未发现有影响力的中国大陆原生 link-in-bio 开源平台**；Gitee 上仅有零星个人主页模板与 GitHub 项目的镜像
- 最接近的中文项目：**linkyee**（166★，MIT，作者 ZhgChgLi 来自大中华区/台湾，繁中+英文文档，纯静态 GitHub Pages + Actions 部署，带 AI 主题生成等玩法）——面向开发者 fork 自用，不是多用户平台
- 相邻品类（不是 link-in-bio，勿混淆）：imsyy/home（4,586★，MIT，Vue，"个人主页"模板）、WebStack 等导航站——说明国内开源社区的需求长期被"个人主页/导航页"吸收，而**多用户 bio link 平台是空白**
- 国内同类商业产品（花名册类、如故类等）均为闭源 SaaS
- **含义**：(1) "中国版 Linktree"的开源赛道没有现成轮子，也没有直接竞争的开源项目，先发有卡位价值；(2) 微信生态适配、国内平台按钮库这些核心本地化工作，没有任何现有项目替我们做过

---

## 3. License 分析：对"我们自己开源 + 提供云托管收费"意味着什么

前提认知：GPL 的 copyleft 由"分发（distribution）"触发，纯 SaaS 不分发二进制/源码，因此 **GPL 有 SaaS 漏洞**；AGPL 第 13 条专门堵这个漏洞——**通过网络提供服务即视同分发**，必须向网络用户提供修改版完整源码。

| 基座许可证 | 云托管收费 | 必须开源我们的修改吗 | 能否保留闭源云端增值模块 | 换证/双许可空间 | 国内生态接受度 |
|---|---|---|---|---|---|
| MIT（littlelink、BioDrop、librelinks） | 无限制 | 否（自愿开源，license 自选） | 可以 | 完全自由（代码归我们） | 最高 |
| Apache-2.0（含专利授权） | 无限制 | 否 | 可以 | 完全自由 | 高（大厂偏好） |
| GPL-3.0（Singlelink） | SaaS 本身不触发义务 | 若"分发"才须 GPL 开源（如客户私有化交付、小程序代码包上传亦可能构成分发） | 同一程序的衍生部分不行 | 无 | 中 |
| AGPL-3.0（LinkStack、openbio） | 可以收费，但**修改版必须向所有网络用户提供源码** | **是，整个衍生程序必须 AGPL** | 同进程/衍生范围内不行，须刻意做服务边界隔离 | 无（版权不归我们，永远锁死 AGPL） | **低**（多家国内大厂内部明令禁止 AGPL 依赖） |

结合"我们本来就打算开源"逐条推演：

1. **AGPL 不是不能接受，但会没收未来的选择权。** 既然产品要开源，"被迫开源"表面无痛；真正的代价在后面：(a) 云托管版的计费、风控、内容审核、运营后台若与主程序构成同一衍生作品，也必须 AGPL 开源——内容审核规则库开源在国内属于自找麻烦，想闭源就必须从架构上拆成独立服务，永远背着这个设计约束；(b) 许可证永久锁死，无法双许可、无法给企业客户出商业授权（这是 open-core 变现的重要一条路）；(c) 国内公司普遍避用 AGPL 软件与依赖，影响被集成、被贡献、被投资尽调的评价。
2. **AGPL 的反面价值**：防云厂商白嫖（别人拿你的开源版直接做竞品托管服务，必须回馈源码）。这是 Dub 等项目主动选 AGPL 的原因。但这个保护**只有当版权归我们时才可运用自如**（我们自研后可以自己选 AGPL 并保留 CLA/双许可权利；基于 LinkStack 则只是被动接受且无双许可权）。
3. **MIT/Apache 基座（或自研）是唯一保留全部选项的路径**：开源社区版用什么证、云端增值是否闭源、将来要不要对商业竞品收紧——都由我们决定。
4. 无论选谁：保留上游版权声明与 LICENSE 是底线义务；"Linktree"是他人商标，产品命名须独立；若复用 littlelink 的品牌按钮资源，注意其中第三方品牌图标本身的商标使用规范。

---

## 4. 结论与建议

### 4.1 三条路线对比

| 维度 | (a) 基于 LinkStack 二开 | (b) 完全从零自研 | (c) 混合：自研骨架 + MIT 资产复用 |
|---|---|---|---|
| 首版上线速度 | 快（数周出 demo） | 慢 | 中（比从零快 30–50%） |
| 中国本地化改造量 | 大（Blade 前端重写、按钮库重建、i18n 自补、微信 JS-SDK 注入） | 全部自建但无历史包袱 | 全部自建但无历史包袱 |
| License 自由度 | 锁死 AGPL，无双许可/闭源模块空间 | 完全自由 | 完全自由（只吸收 MIT/Apache/BSD 代码） |
| 技术栈与国内社区匹配 | PHP/Laravel：部署人群友好，贡献者池老化 | 自选（JS/TS 全栈或 Vue+Go，均匹配） | 同左 |
| 小程序/API-first 演进 | 差（服务端模板单体，需大改） | 好（起手即 API-first） | 好 |
| 维护风险 | 上游单人维护 + fork 后合并上游成本高 | 全自担 | 全自担（但复用的是死项目/静态资产，无上游耦合） |
| 综合 | 适合"快速验证"，不适合终局 | 稳但慢 | **推荐** |

### 4.2 推荐：路线 (c) —— 自研核心 + 定向吸收 MIT 资产，LinkStack 只当基准不当基座

论证要点：

1. **License 是一票否决项**。可选基座里唯一"平台完整且活跃"的 LinkStack 是 AGPL：接了它，产品许可证、云端商业模块、双许可空间全部锁死，且国内接受度差——与"自身开源 + 云托管收费"的商业设计冲突最大。MIT 阵营里又没有活着的完整平台。所以"理想基座"不存在，混合是最优解。
2. **"中国版"的核心工作量在任何基座里都是零积累**：微信内 H5 适配（JS-SDK 分享卡片、内置浏览器兼容、打开外链引导）、国内平台按钮体系（微信/公众号/视频号/抖音/快手/小红书/B站/微博/知乎/淘宝/京东……全部要自建设计规范）、手机号登录、二维码（页面码/渠道码/名片码）、ICP+公安备案与国内云部署文档、未来小程序。既然差异化部分横竖要自己写，基座省下的只是"通用 CRUD + 主题渲染"，这部分恰好可以从 MIT 代码矿里搬。
3. **具体复用清单**：
   - **BioDrop（MIT，5.7k★）**：多用户平台的数据模型（用户/链接/统计）、Next.js 组件组织、测试与 E2E 工程实践——最大的一块"免费拼图"
   - **librelinks（MIT）**：主题系统与浏览/点击/地域/设备统计的轻量实现
   - **littlelink（MIT）**：品牌按钮的 CSS 规范组织方式（体系照抄，按钮内容换成国内平台）
   - **littlelink-server（MIT）**：Docker 化与环境变量配置化的思路
   - **LinkPage（BSD-2，Go）**：若后端选 Go 的参考实现
   - **LinkStack（AGPL）**：只作功能基准清单与竞品体验参照（多用户后台、主题市场、QR、vCard、一键升级）；**代码一行不得进入我们的仓库**，团队需明确红线
4. **技术栈建议**（供下一步技术方案细化）：TS 全栈，Next.js 或 Nuxt3 做 SSR 的 C 端页（微信内分享卡片与 SEO 必须 SSR）+ API-first 后端（NestJS/Go 皆可）+ MySQL/Postgres + Redis + Docker Compose 一键自部署（兼顾国内自托管人群，配宝塔教程）。若看重国内贡献者池与后续 uni-app 小程序协同，Vue 系（Nuxt3）匹配度略高；团队 React 背景则 Next.js + Taro。
5. **自有许可证建议**：主仓库 **Apache-2.0**（比 MIT 多专利保护，利于商用与被大厂采用）；要求贡献者签 CLA，保留将来对云端专有模块闭源（open-core）或对特定竞争场景调整策略的权利。若担心云厂商白嫖，可评估"社区版 Apache-2.0 + 云端模块闭源"的经典 open-core，而不是整体 AGPL。
6. **可选的过渡动作**：市场验证期可以先原样部署一个 LinkStack 实例内测需求（使用未修改的 AGPL 软件提供服务不产生额外开源义务），验证的是需求而不是技术，随后用自研版替换。
7. **风险与缓解**：自研路线最大风险是低估工程量→用 §4.2.3 的复用清单和 LinkStack 功能基准控制范围，首版只做「个人页 + 链接管理 + 主题 + 基础统计 + 二维码 + 微信分享适配」；其次是搬运 MIT 代码时的合规→在 NOTICE/THIRD-PARTY 文件中保留原版权声明即可，成本极低。

---

## 附录：本次调研的核实失败项（如实记录）

- **Zenith**：多组关键词未检索到对应的 link-in-bio 开源项目，无法评估
- **LinkStack 官方中文语言包**：存在 i18n 机制，但 zh-CN 覆盖情况未检索到权威说明，未确认
- **LinkStack 统计的细粒度**（来源/设备/国家维度是否在自托管版全量提供）：官方确认的是页面浏览 + 每链接点击 + QR 扫码归因，更细维度描述来自周边页面，以实测为准
- **Gitee**：站内检索未发现同类平台型项目，不排除有极小众项目未被搜索引擎索引
