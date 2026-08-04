# link-in-bio 品类调研：市场价值、商业化与中国机会评估

> 调研日期：2026-08-04 ｜ 调研方式：公开网络信源（2024-2026 优先）
> 背景：委托方考虑做一个「中国版 Linktree」并最终开源。本报告回答六个问题：Linktree 现状、全球品类格局、已验证商业模式、中国创作者经济、中国真实需求判断、风险清单。
>
> **信度标注约定**：文中数据分三档——【确证】多个可信信源交叉验证或官方披露；【估计】第三方机构估算（如 Sacra、GetLatka、行业报告）；【推断】本报告基于公开数据的推算，会给出推算过程。查不到的数据明确写「未找到」，不编造。

---

## TL;DR（一页结论）

- Linktree 是一个「**大流量、小收入**」的生意：约 7000 万用户，年收入估计仅 6000 万-1 亿美元，估值 13 亿美元（2022 年定格后再无新融资），经历两轮裁员（17% + 27%），付费转化率推算约 1% 量级。
- 品类的钱不在「链接聚合/展示层」，在「变现层」：Stan Store（8 万创作者、3500 万美元 ARR）和 Whop（年化 1.42 亿美元）的人均收入是 Linktree 的数百倍。纯 link-in-bio 工具全球 SaaS 收入盘子估计只有 2-3 亿美元/年。
- 中国存在结构性障碍：主流平台简介区放不了 URL、小红书 2025 年施行「最严导流细则」（封号级处罚）、微信对第三方域名封禁常态化、黑产滥用导致链接服务域名极易被封。国内已有 Link3.cc、WeLink、KKLink 等多个模仿者，无一跑出。
- 真实需求存在于三个细分：**出海创作者/跨境卖家**（在海外平台运营的中国人，天然的 Linktree 用户）、**商务名片/合作对接页**（media kit）、**开发者/极客个人主页**。
- 分析师结论：在中国「大生意」逻辑不成立；**纯开源项目 + 面向出海人群的小而美托管服务**是唯一说得通的姿势。开源自部署恰好绕开中国特殊性（域名分散、无平台单点依赖）。详见文末。

---

## 一、Linktree 公司现状

### 1.1 基本盘

| 维度 | 数据 | 信度与来源 |
|---|---|---|
| 成立 | 2016 年，澳大利亚墨尔本；Alex Zaccaria、Anthony Zaccaria、Nick Humphreys 三人创立，首版「6 小时做出来」，上线当晚 3000 用户 | 【确证】[Wikipedia](https://en.wikipedia.org/wiki/Linktree) |
| 注册用户 | 2018.12：100 万 → 2019 末：300 万 → 2020.10：800 万 → 2021.3：1600 万 → 2023.6：3500 万+ → **2024.5：5000 万（当年新增近 1000 万）** → **2025：7000 万** | 【确证】[Wikipedia](https://en.wikipedia.org/wiki/Linktree)、[TechCrunch 2024.5](https://techcrunch.com/2024/05/22/linktree-surpasses-50m-users-rolls-out-beta-social-commerce-program/)、[CEO 2025.9 访谈](https://www.curbcuts.co/blog/2025-9-24-linktree-chief-executive-alex-zaccaria-talks-new-features-empowering-creators-more-in-interview) |
| 融资 | Series A 1070 万美元（2020.10，AirTree/Insight）；Series B 4500 万美元（2021.3，Index/Coatue）；Series C 1.1 亿美元（2022.3）；累计 1.657 亿美元 | 【确证】[TechCrunch](https://techcrunch.com/2022/03/16/linktree-link-in-bio-series-c-valuation/)、[Sacra](https://sacra.com/c/linktree/)。注：Wikipedia 页面写「1.52 亿 @17 亿估值」为澳元口径，美元口径为 1.1 亿 @13 亿 |
| 估值 | **13 亿美元**（2022.3 Series C），此后至今（2026.8）无新一轮公开融资 | 【确证】[TechCrunch](https://techcrunch.com/2022/03/16/linktree-link-in-bio-series-c-valuation/)、[PitchBook](https://pitchbook.com/profiles/company/442244-80) |

### 1.2 营收与盈利

- 营收：2022 年约 **2500 万美元**；2023 年约 **3700 万美元**（+49%）【估计】[Sacra](https://sacra.com/c/linktree/)、[Contrary Research](https://research.contrary.com/company/linktree)
- 2025 年 ARR 估计 **6160 万美元**【估计】[GetLatka](https://getlatka.com/companies/linktr.ee)；另有第三方称「超过 1 亿美元」【估计，可信度较低】[Everything PR](https://everything-pr.com/stan-store-and-beacons-the-link-in-bio-platforms-that-became-creator-storefronts)。合理区间取 **6000 万-1 亿美元**。
- 盈利：创始人 2020 年自述早期「从第一天起现金流为正」（[StartupNation](https://startupnation.com/start-your-business/bootstrapped-global-linktree/)）；但融资扩张期 **2022 年亏损约 5000 万美元**【估计】[Contrary Research](https://research.contrary.com/company/linktree)。当前是否盈利：**未找到公开数据**。
- 关键推算【推断】：2022 年 2500 万美元收入 ÷ 3500 万用户 = **每用户年收入不足 1 美元**（Contrary 原话「几乎所有效率指标都远低于基准」）。按付费档 ARPU 60-90 美元/年折算，付费用户约 30-40 万，**免费转付费率约 1% 量级**。官方从未披露付费率——未找到确切数字。
- 估值含义：13 亿美元估值 ÷ 3700 万美元营收（2023）≈ 35 倍 PS，属于 2021-2022 泡沫期定价；此后未再融资、未传出上市，合理解读为**估值悬置**。

### 1.3 裁员与收缩

- 2022 年 8 月裁员 **17%**【确证】[Startup Daily](https://www.startupdaily.net/topic/people/linktree-is-the-latest-tech-startup-to-cut-jobs-shedding-17-of-its-global-workforce/)
- 2023 年 6 月再裁 **27%**，主要裁撤澳新岗位，战略重心转向美国市场【确证】[Forbes Australia](https://www.forbes.com.au/news/investing/necessary-linktree-sacks-27-of-its-workforce/)、[Business News Australia](https://www.businessnewsaustralia.com/articles/linktree-sacks-27pc-of-staff--acquires-bento-amid-us-push.html)

### 1.4 2023-2026 重要动态（时间线）

| 时间 | 事件 | 来源 |
|---|---|---|
| 2021.8 | 收购音乐智能链接服务 Odesli | [Wikipedia](https://en.wikipedia.org/wiki/Linktree) |
| 2023.6 | 收购 Bento（卡片网格风格个人主页，金额未披露），同期裁员 27% | [Crunchbase](https://www.crunchbase.com/acquisition/linktree-acquires-creatorspace--b7f6d871)、[BNA](https://www.businessnewsaustralia.com/articles/linktree-sacks-27pc-of-staff--acquires-bento-amid-us-push.html) |
| 2024.5 | 用户破 5000 万；社交电商（联盟带货）计划扩大 beta | [TechCrunch](https://techcrunch.com/2024/05/22/linktree-surpasses-50m-users-rolls-out-beta-social-commerce-program/) |
| 2025.1 | 与 Button 合作，AI 动态商品链接提升带货转化 | [GlobeNewswire](https://www.globenewswire.com/news-release/2025/01/15/3010171/0/en/Button-Integrates-Into-Linktree-to-Support-Social-Commerce-for-Creators.html) |
| 2025.4 | 发布 **Sponsored Links**：品牌按 CPA 付费买创作者主页广告位（首批 Hulu、Sam's Club、Harry's），计划扩展 CPC/CPM——本质是把 7000 万张主页变成广告网络 | [Sacra](https://sacra.com/c/linktree/)、[eMarketer](https://www.emarketer.com/content/linktree-expanding-brand-integrations-with-sponsored-links-on-creator-profiles) |
| 2025 | 与 Kajabi 合作上线**卖课**；美国全量开放 **Shops**（Target/Amazon/Lululemon 等联盟商品佣金）；Rewards 激励计划 | [Yahoo Finance](https://finance.yahoo.com/news/linktree-rolls-suite-monetization-features-130000327.html)、[Lindsey Gamble](https://www.lindseygamble.com/blog/linktree-unlocks-new-monetization-opportunities-for-creators-courses-digital-products-shops-sponsored-links-rewards) |
| 2025.9 | CEO 访谈：7000 万用户，定位「创作者、小微企业与品牌的一站式平台」 | [Curb Cuts](https://www.curbcuts.co/blog/2025-9-24-linktree-chief-executive-alex-zaccaria-talks-new-features-empowering-creators-more-in-interview) |
| 2025.12 宣布 | **Bento 将于 2026.2.13 关停**，用户迁移至 Linktree（收购两年半后整合完毕） | [AlternativeTo News](https://alternativeto.net/news/2025/12/bento-to-shut-down-in-2026-as-linktree-takes-over-and-offers-migration-path/) |

**解读**：Linktree 2024-2026 的所有动作指向同一件事——纯订阅收不上钱，必须叠加「电商佣金 + 广告位 + 课程分成」把展示页变成交易入口。这印证了本报告第三章的核心结论：**展示层不值钱，变现层才值钱**。

> 历史风险注脚：2018 年 6 月 Instagram 曾以「垃圾链接」为由短暂封禁 Linktree 全域链接，后因用户抗议解封（[Wikipedia](https://en.wikipedia.org/wiki/Linktree)）。品类的平台依赖风险从第一天就存在。

---

## 二、link-in-bio 品类全球格局

### 2.1 市场规模：两种口径

- **报告口径**【估计，低信度】：某行业报告称 2025 年北美 link-in-bio 平台市场 6.97 亿美元、占全球 38.7%，即全球约 **18 亿美元**（[Dataintelo](https://dataintelo.com/report/link-in-bio-platform-market)）。此类小机构报告方法论不透明，仅作参考上限。
- **自下而上口径**【推断】：把头部玩家收入相加——Linktree 0.6-1 亿 + Stan 0.35 亿 + Beacons（未披露，按融资体量估数千万以内）+ Lnk.bio/Taplink/Milkshake 等长尾（合计估数千万）≈ **纯 link-in-bio SaaS 全球年收入约 2-3 亿美元**。若把 Whop 这类社群变现平台算进来才能过 5 亿。**这是一个用户量以亿计、收入以亿（美元）计的品类——流量巨大，钱很薄。**
- 用户面数据【估计】：约 **3100 万 Instagram 用户**使用某种 link-in-bio 工具；市面上有 **62 家**同类公司（[influencers.club 基于 1 亿 IG 账号的分析](https://influencers.club/blog/state-of-the-link-in-bio-market/)）。

### 2.2 主要玩家盘点

| 玩家 | 体量 | 模式 | 状态 | 来源 |
|---|---|---|---|---|
| **Linktree** | 7000 万用户；在使用 link-in-bio 的 IG 账号中份额约 80% | 订阅 + 佣金 + 广告 | 绝对龙头，估值悬置 | [influencers.club](https://influencers.club/blog/state-of-the-link-in-bio-market/) |
| **Stan Store** | 8 万+ 付费创作者；ARR 3500 万美元（2025，+24%，增速从 765%→93%→24% 急剧放缓）；ARPU 约 437 美元/年 | 高价订阅（$29-99/月）+ 0 交易佣金，定位「创作者商店」 | 品类内人效最高 | [Sacra](https://sacra.com/c/stan/)、[Forerunner](https://www.forerunnerventures.com/perspectives/how-stan-scaled-to-33m-in-arr-within-two-years-while-building-in-public) |
| **Whop**（邻接品类） | 年化收入 1.42 亿美元（2025.10，+255%）| 数字产品/社群交易市场抽成 | 增长最快 | [Everything PR](https://everything-pr.com/stan-store-and-beacons-the-link-in-bio-platforms-that-became-creator-storefronts) |
| **Beacons** | 融资 2980 万美元（YC、a16z）；IG 份额约 2.4% | 免费档抽 9% 交易费；订阅 $10/$30/$90，AI 全家桶 | 二线，收入未披露 | [Tracxn](https://tracxn.com/d/companies/beacons-ai/__n5rH6sDqPeGYtK7yR9FgLKWhdb88yZOC2WB1Qp56GGM)、[Beacons 定价](https://beacons.ai/i/pricing) |
| **Lnk.bio** | 150 万+ 用户、215 国 | **一次性买断**：$9.99/$24.99 终身，2016 年至今没涨价 | 小团队自举，活得好 | [Lnk.bio](https://lnk.bio/) |
| **Milkshake** | IG 份额约 3.7% | 免费 + 轻订阅 | 被 Envato 出售给 Codlebee 后近乎停更 | [Autoposting 评测](https://autoposting.ai/blog/milkshake-review) |
| **Snipfeed** | 曾融资 550 万美元 | 创作者数字商品 | **2024.4 被 Planoly 收购**，停止独立运营 | [PRNewswire](https://www.prnewswire.com/news-releases/planoly-announces-acquisition-of-snipfeed-product-empowering-creators-to-build-businesses-on-social-media-302122798.html) |
| **Komi** | 未披露 | 面向头部艺人/名人 + 经纪团队，定制报价 | 利基存活 | [Creator Hero](https://www.creator-hero.com/blog/komi-alternatives-features-pricing-and-reviews-comparison) |
| **Koji** | 曾 15 万创作者、融资 3600 万美元、抽成 5-15%（2022 数据） | 小程序市场 | 已停止运营（2024 年前后；本次调研未单独核实关停细节） | [Contrary](https://research.contrary.com/company/linktree) |
| **Carrd** | IG 份额约 0.7% | 通用单页建站被当 bio 页用，超低价订阅 | 独立开发者标杆 | [influencers.club](https://influencers.club/blog/state-of-the-link-in-bio-market/) |
| 平台自带 | Later 的 Linkin.bio（1.6%）、Squarespace 的 Bio.site（1.3%）、Shopify 的 Linkpop | 大厂把它做成**免费附赠功能** | 「feature not product」化 | [influencers.club](https://influencers.club/blog/state-of-the-link-in-bio-market/) |

**用户画像**（influencers.club，基于 1 亿 IG 账号）：77% 的 link-in-bio 用户粉丝数低于 5000；53% 是创作者、46% 是企业/商家；64% 为女性；49% 在美国。→ 品类的基本盘是**长尾小微创作者**，不是头部网红。

### 2.3 品类趋势（2024-2026）

1. **从「聚合」到「变现」**：纯链接聚合增长见顶（Linktree 用户还在涨但收入增速平平），钱流向帮创作者直接收钱的产品（Stan、Whop 增速数倍于品类）。
2. **整合期**：Snipfeed 被收、Bento 被收后关停、Koji 关停、Milkshake 停滞——62 家玩家的长尾正在出清。
3. **广告化**：Linktree Sponsored Links 把主页流量证券化，是订阅之外的第二增长曲线实验（2025.4 上线，效果未验证）。
4. **AI 化**：Beacons 全面转向「AI 创作者全家桶」定位。

### 2.4 与创作者经济大盘的关系

- 全球创作者经济规模：Goldman Sachs 口径 2023 年约 **2500 亿美元**，2027 年预计 **4800 亿美元**；全球约 5000 万创作者，数量年增 10-20%（[Goldman Sachs](https://www.goldmansachs.com/insights/articles/the-creator-economy-could-approach-half-a-trillion-dollars-by-2027)）。2026 年第三方口径估计 3100-3230 亿美元（[SQ Magazine](https://sqmagazine.co.uk/creator-economy-statistics/)）。
- 对照结论【推断】：link-in-bio 工具收入（2-3 亿美元）只占创作者经济的约 **0.1%**。它是创作者经济的「基础设施毛细血管」——渗透率高、单价低，价值捕获能力弱。品类真正的想象力从来不是工具费，而是**站在流量分发路径上之后的二次变现**（佣金/广告），Linktree 2025 年的转型就是明证。

---

## 三、已被验证的商业模式盘点

### 3.1 模式对照表

| 模式 | 代表 | 价格带 | 验证结论 |
|---|---|---|---|
| **免费增值订阅** | Linktree（免费/$5/$9/$24 月）、Beacons（$10/$30/$90）、Taplink | 月费 $5-24 | **半验证**：能做出几千万美元收入，但付费率约 1% 量级【推断，见 1.2】，2022 年亏损 5000 万美元，靠两轮裁员回血。低 ARPU + 高流失是结构性缺陷 |
| **高价订阅 + 帮创作者收钱** | Stan Store（$29-99/月，0 佣金） | 月费 $29-99 | **已验证**：ARPU 437 美元/年是 Linktree 的 400 倍+；但天花板显现（2025 增速跌到 24%），因为「愿意为卖货付高月费」的创作者远少于「想要个主页」的 |
| **交易抽成** | Beacons 免费档抽 9%、Whop 市场抽成、Koji 抽 5-15% | 佣金 5-15% | **已验证（Whop 1.42 亿美元年化）/ 部分失败（Koji 关停）**：抽成模式成立的前提是平台真的带来交易，纯工具没有交易量可抽 |
| **广告位/CPA 联盟** | Linktree Sponsored Links、Shops | CPA 分成 | **验证中**（2025.4 上线），逻辑成立但规模未知 |
| **一次性买断** | Lnk.bio（$9.99/$24.99 终身） | 终身 $10-25 | **已验证（小生意）**：150 万用户养活小团队，十年不涨价。撑不起风投故事，但作为独立开发者/开源项目的商业化路径非常健康 |
| **企业版/白标/名人定制** | Komi、Linktree 企业档 | 定制报价 | **利基验证**：服务经纪公司和名人团队，单客价值高、市场窄 |
| **被收购退出** | Snipfeed→Planoly（2024）、Bento→Linktree（2023） | — | 品类整合期的常见结局，收购价均未披露（推测不高） |

### 3.2 谁赚到钱了，为什么

- **赚到钱的**：Stan/Whop——它们卖的不是「主页」而是「收银台」，创作者对「帮我赚钱的工具」付费意愿是对「帮我展示的工具」的几十倍。Lnk.bio——极致成本控制 + 买断制，赚小而确定的钱。
- **没赚到钱的**：Linktree 模式（收入可观但盈利存疑，估值倒挂）；Koji（抽成但没交易）；Milkshake（免费用户多、无变现抓手）；大量长尾克隆（62 家里绝大多数）。
- **底层规律**【推断】：这个品类获客靠免费 + 页面自带 logo 病毒传播（每张免费主页都是广告），但**免费用户几乎无法转化**（77% 是 5000 粉以下的小账号，本来就没收入）。付费动机只有两个真实来源：① 虚荣/品牌（去 logo、自定义域名）→ 低价低频；② 赚钱工具（收款、卖货）→ 高价但用户群窄。**展示是入口，交易是生意。**

---

## 四、中国创作者经济

### 4.1 规模与创作者数量

| 指标 | 数据 | 信度与来源 |
|---|---|---|
| 网络视频用户 | 10.6 亿，网民渗透率 97.1%（2024） | 【确证】[新榜《2024 内容创作者生态报告》发布稿](https://news.qq.com/rain/a/20241107A05BFF00) |
| 网络直播用户 | 8.3 亿（2024 底），主播账号累计 1.8 亿 | 【估计】[报告大厅汇编](https://m.chinabgao.com/freereport/101876.html)（二手汇编，量级可信） |
| **职业主播（以直播为主业）** | **1508 万人**（截至 2023.12） | 【确证】中国演出行业协会《网络主播新职业发展报告》，[中新网](https://www.chinanews.com.cn/cj/2024/03-27/10188073.shtml)、[人民网](http://finance.people.com.cn/n1/2024/1111/c1004-40358809.html) |
| 万粉以上创作者 | 近 1500 万（2024，+5%，增速放缓） | 【估计】[克劳锐《2024 KOL 发展年报》](https://www.10100.com/article/33899841) |
| 活跃创作者增速 | 2024.6 同比 +62%；视频号活跃创作者约为去年同期 3 倍 | 【估计】[新榜](https://news.qq.com/rain/a/20241107A05BFF00) |
| 创作者经济总规模 | 有报告称「2025 年 1.8 万亿元人民币、+42%」 | 【估计，低信度】[格隆汇转载行业报告](https://m.gelonghui.com/p/1932416)，口径不明，仅供参考。另：2025 年全国规上文化企业营收 15.2 万亿元，其中内容创作生产 3.5 万亿元（+13.5%）（[新浪财经](https://finance.sina.com.cn/tech/roll/2026-05-16/doc-inhxzzus5940006.shtml)，国家统计局口径，范围远大于「创作者经济」） |
| 全职/兼职比例 | **未找到**全网口径的可靠数据（新榜/克劳锐报告摘要均未披露）。仅有间接信号：直播行业 2025 年人才缺口预计 1941.5 万人（[网经社](https://www.100ec.cn/detail--6643903.html)） | — |

**内卷信号**（新榜，同上）：2018 年做到千万粉平均用时 54 天，2023 年延长到 **601 天**；头部前 1 万账号平均涨粉量同比下滑 3.8%；抖音 500 强创作者月更数是大盘的 2.7 倍。→ 公域涨粉红利消失，创作者被迫多平台铺量 + 私域沉淀，这是对「个人流量枢纽页」需求的宏观土壤。

### 4.2 多平台运营与「全网同名」

- 新榜连续三年报告的核心结论：**全平台矩阵运营（公众号/视频号/抖音/小红书/B站/快手六大平台）已成为创作者的主流策略**，「全域运营布局可以全面放大影响力」（[新榜](https://news.qq.com/rain/a/20241107A05BFF00)、[2023 报告](https://newrank.cn/report/detail/412)）。
- 「全网同名」已是中文创作者的标准操作（视频结尾口播「全网同名」代替放链接——因为**放不了链接**）。
- **未找到**「创作者平均运营 N 个平台」的精确统计。定性判断【推断】：矩阵化程度高于海外（海外创作者集中 1-2 个主平台），因为中国单平台生命周期风险高（限流、规则突变），这在逻辑上放大了「一处汇总所有阵地」的需求——但该需求目前由「口播全网同名 + 微信私域」而非链接页满足。

### 4.3 私域流量：中国特色的「link in bio 替代物」

- 2025 年私域运营逻辑从「流量收割」转向「用户资产沉淀」；小红书首次超越抖音成为企业私域投入首选平台（[2025 私域流量趋势报告转载](https://blog.csdn.net/weixin_43492150/article/details/146884975)，二手信源）。
- 微信生态承接了私域终点：2024 年微信小店 GMV 为 2023 年的 1.92 倍、订单量 2.25 倍；小程序电商年交易额 1.8 万亿元；小程序 MAU 9.49 亿（[微信公开课 PRO 数据](https://news.qq.com/rain/a/20250516A055MC00)、[QuestMobile 转引](https://zhuanlan.zhihu.com/p/11802684819)）。
- **含义**：海外的转化路径是「社交平台 bio → 链接页 → 外部商店/邮件列表」；中国的转化路径是「公域内容 → 口播/暗号/包裹卡 → 加微信 → 微信内小程序/小店成交」。**中国的"link in bio"功能位被「加微信」这个动作吃掉了**，而平台正在全力打击这个动作之外的一切导流。

### 4.4 中国个人用户对工具付费的意愿

- **WPS（正面标杆）**：2024 年国内个人付费用户 **4170 万**（+17.5%），WPS 个人业务收入 32.83 亿元（国内 31 亿）→ 人均约 **74-79 元/年**（[深圳新闻网引金山办公年报](https://www.sznews.com/news/content/mb/2025-03/20/content_31493532.htm)）。证明：中国个人愿意为**高频刚需**工具付费，但锚定价位是**百元/年以内**（对照 Linktree Pro 约 $108/年 = 780 元/年）。
- **草料二维码（品类近亲）**：2011 年成立，800 万+ 注册用户、**数万家付费企业**，「绝大部分功能免费，付费主力是 B 端/G 端」（[新京报](https://m.bjnews.com.cn/detail/1744882260129198.html)、[知乎讨论](https://www.zhihu.com/question/631844604)）。草料做的其实就是「中国式聚合页」——把内容/表单/联系方式聚合到一个二维码后面。它的商业化答案是：**C 端免费做口碑，收钱靠 B 端**。这是对「中国版 Linktree 怎么收钱」最有参考价值的本土样本。
- 百度网盘等会员数据：**未找到**可靠的付费会员绝对数。
- 结论【推断】：中国 C 端工具付费成立的条件 = 刚需高频 + 低锚定价（¥50-150/年）+ 会员制习惯已被视频/网盘/办公教育。**「个人主页」在中国不是刚需高频场景**，C 端直接收费的先例基本没有；可行路径只有 B 端化（企业名片/营销页）或出海化（赚美元）。

---

## 五、核心判断：中国存在 link-in-bio 的真实需求吗？

### 5.1 中国市场的四个特殊性（事实层）

1. **简介区放不了链接**：抖音、快手、小红书、B 站等平台的个人简介不允许填写第三方 URL（企业号有限例外）；「不允许在简介里写 URL，极大限制了这类产品的发展空间」（[知乎：国内类 linktree 产品为什么发展得不是太好](https://www.zhihu.com/question/605614615)）。
2. **导流被平台明令打击**：小红书《交易导流违规管理细则》2025.3.12 施行，在主页/笔记/评论/私信/包裹等**全场景**禁止第三方联系方式、二维码、网址链接，处罚含限流、封号、清退（[发布稿](https://news.qq.com/rain/a/20241108A064R300)、[施行报道](https://news.qq.com/rain/a/20250301A074UE00)）。抖音对站外导流同样收紧。
3. **微信域名封禁常态化**：链接聚合服务天然被黑产滥用（跳转推广赌博/色情/APP），导致此类域名频繁被微信/QQ 浏览器封禁——「做链接服务的最怕域名被封」（[知乎](https://www.zhihu.com/question/605614615)）。这是运营层面的死穴。
4. **二维码文化**：中国的「link」是二维码。线下（名片/摊位/海报/包裹卡）和微信内（活码）场景由二维码承接，草料二维码 800 万用户证明这个需求真实存在且已被本土形态满足。
5. 补充：**互联互通只通到支付层**——2024.9 淘宝接入微信支付、京东接支付宝（[新浪财经](https://finance.sina.com.cn/jjxw/2024-09-27/doc-incqrmin7599764.shtml)），但内容外链在群聊/朋友圈/简介区仍受限（[知乎回顾](https://zhuanlan.zhihu.com/p/609984958)）。方向缓慢向好，速度不可依赖。
6. Linktree 本身在大陆访问不稳定、支付不可用（[搜狐](https://www.sohu.com/a/916795206_120822325)），国内市场对海外龙头天然隔离。

**国内已有玩家**：Link3.cc、WeLink、KKLink、ContactX、mlink 等（[横评](https://www.5acxy.com/blog/linktree-guo-nei-mian-fei-ti-dai-gong-ju-heng-ping.html)、[PartnerShare](https://www.partnershare.cn/information/link3-cc/3126)）。共同点：功能齐全、声量极小、无一家披露过有意义的用户/收入数据——**品类在中国已被反复尝试，从未跑通**（知乎上直接有「国内的类 linktree 产品为什么发展得不是太好」之问）。

### 5.2 Bull Case（看多理由）

1. **创作者基数与矩阵化是全球最大**：1500 万职业主播、1500 万万粉创作者、六平台矩阵成为标配（见第四章）。哪怕 1% 的人需要一张「全网总名片」，也是 15 万级用户盘。
2. **「全网同名」本身就是未被满足的需求的证据**：创作者被迫用口播代替链接，说明汇总需求真实存在，只是被平台压制。承接场景在平台墙外：**搜索引擎、B 站/公众号（可放链接）、线下二维码、简历/商务合作**。
3. **出海人群是被验证的付费细分**：TikTok/IG/YouTube 上的中国创作者、跨境卖家、独立开发者本来就在用 Linktree，且 Linktree 在国内访问/支付不便（[搜狐](https://www.sohu.com/a/916795206_120822325)）——「对中国用户友好的 Linktree」有真空：支持微信/支付宝收款展示、中文模板、国内可访问镜像。这群人赚美元、付费意愿按美元锚定。
4. **商务对接是硬场景**：广告主找达人要报价单/数据卡（media kit）、MCN 递案、自由职业者接单——这是「个人主页」在中国唯一天然带商业动机的场景，可对标海外 Komi 的 talent 路线。
5. **私域中转页是灰色刚需**：公域到微信的惊险一跳需要落地页/活码工具，市场已在付费（草料数万家付费企业）。合规做法是服务持证商家的自有阵地（官网/短信/包裹卡→主页→企微）。
6. **微信生态在缓慢开放**：支付互通（2024）、微信小店崛起，若外链管制进一步松动，先卡位者受益。
7. **开源恰好化解本土死穴**：自部署 = 每人自己的域名，不存在「一个域名被封全站陪葬」的单点风险；无平台依赖、无中心化审核责任。海外已有 LinkStack、LittleLink（约 2900 stars）等开源先例（[LinkStack](https://linkstack.org/)、[GitHub topics](https://github.com/topics/linktree-alternative)），但**没有中文生态位产品**（中国平台图标、微信/支付宝适配、二维码优先设计、ICP 备案指引）。

### 5.3 Bear Case（看空理由）

1. **没有入口就没有一切**：link-in-bio 的存在前提是「bio 里能放 link」。中国最大的流量场（抖音/小红书/微信）恰恰不允许。产品做得再好，用户没有地方展示它——这不是执行问题，是**品类前提在中国不成立**。
2. **平台闭环吃掉了需求**：海外创作者需要把粉丝导出去变现（Shopify/Gumroad/Patreon 都在站外）；中国平台把带货、打赏、知识付费全部做进了站内（抖音小店、小红书店铺、视频号小店），导流出去既无必要又高风险（封号）。
3. **十年反复验证失败**：Link3.cc/WeLink/KKLink 等已存在多年，无一跑出。市场不是没人试过，是试过的都没起来。
4. **付费上限极低**：品类全球付费率约 1%【推断】；中国 C 端工具锚定价 ¥100/年以内（WPS ARPU 约 79 元）；两者相乘，100 万注册用户 × 1% × ¥100 = **年收入 100 万元**——连一个小团队都养不活。
5. **运营死穴**：托管版域名必被黑产盯上 → 被微信封 → 正常用户流失 → 换域名 → 再被封。国内做链接跳转服务的合规与风控成本远超想象（内容审核义务、实名、ICP 备案/许可证）。
6. **监管风险**：聚合页含导流/收款即涉「互联网信息服务」，UGC 外链是内容安全高危区；一次黑产事件可能导致整个服务被处置。
7. **大厂零成本进入**：微信「名片」、抖音主页本身就是超级 profile；平台若想做，顺手就能做（海外 Squarespace/Later/Shopify 已经把它做成免费附赠功能）。唯一的安慰是：**大厂不会做「跨平台」聚合**（互相为敌），跨平台中立性只有第三方/开源能提供。

### 5.4 判断

**中国存在 link-in-bio 需求，但它是「利基真需求」而非「大众市场」**：
- 大众创作者的汇总需求被「全网同名 + 加微信」以零成本满足，且平台墙使产品无处展示——**To C 大盘不成立**。
- 真需求集中在三个可付费细分：**① 出海人群（最优先，付美元、无平台墙）；② 商务名片/media kit（对接场景带商业动机）；③ 开发者/极客自部署（开源生态位）**。
- 时间上不站在对立面：平台互通缓慢推进 + 创作者多平台化加深，品类前提在未来 3-5 年可能边际改善，开源项目是低成本卡位方式。

---

## 六、风险清单

| 风险 | 等级 | 说明与证据 |
|---|---|---|
| **平台封杀/域名封禁** | ★★★★★ | 海外先例：Instagram 2018 封禁 Linktree（[Wikipedia](https://en.wikipedia.org/wiki/Linktree)）；国内常态：微信封禁跳转域名、小红书 2025 导流细则封号处罚（[腾讯新闻](https://news.qq.com/rain/a/20250301A074UE00)）。托管版的域名存活是运营生死线 |
| **黑产滥用连坐** | ★★★★★ | 链接聚合是黑产跳转的天然工具，导致域名被浏览器/微信拉黑，正常用户陪葬（[知乎](https://www.zhihu.com/question/605614615)）。需要实名 + 审核 + 风控，成本高企 |
| **监管合规** | ★★★★ | ICP 备案/经营性许可、UGC 内容安全责任、涉收款则涉支付合规。个人开发者托管他人页面 = 承担他人内容的连带责任 |
| **进入门槛低、同质化** | ★★★★ | 全球 62 家竞品；周末即可克隆一个；开源世界已有 LinkStack/LittleLink。护城河只能来自生态位（模板/图标/集成/社区）而非代码 |
| **大厂降维** | ★★★ | 海外已发生（Squarespace/Later/Shopify 免费附赠）；国内平台自带主页。但「跨平台中立聚合」大厂做不了，第三方独占 |
| **付费意愿** | ★★★★ | 品类付费率约 1%【推断】+ 中国 C 端百元/年锚定（WPS ARPU 约 79 元/年）→ To C 收入天花板极低 |
| **品类天花板** | ★★★ | 展示层无网络效应、切换成本趋零（Contrary 对 Linktree 的评价：low switching costs, minimal network effects, unproven monetization——[Contrary](https://research.contrary.com/company/linktree)）。龙头 13 亿美元估值 4 年无人接盘即是品类定价 |

---

## 分析师结论

**这事作为「生意」在中国不值得做，作为「开源项目 + 小而美变现」值得做。**

论证链条：全球龙头 Linktree 用 7000 万用户只换来约 6000 万美元年收入和一个悬置四年的估值，证明**展示层是流量生意不是收入生意**；品类里真正赚钱的 Stan/Whop 赚的是「帮创作者收钱」的钱，而这个变现层在中国已被平台闭环（抖音小店/微信小店）垄断，第三方没有位置。再叠加中国三堵墙——简介区无链接入口、导流封号、域名封禁——**To C 大众市场的前提在中国不成立，「中国版 Linktree」作为风投生意是伪命题**（十年来 Link3.cc 等模仿者无一跑出是市场给出的答案）。

但委托方的意图恰好不是风投生意。**开源是这个品类在中国唯一能赢的姿势**：自部署天然免疫域名连坐和平台单点封禁；无托管则无内容连带责任；而「中文互联网的开源个人主页」存在真实生态位空缺——海外 LinkStack/LittleLink 均无中文平台生态（微信/抖音/小红书图标、二维码优先、加微引导、ICP 指引），国内闭源模仿者又都半死不活。做成「中文开源个人主页标准」，用户来自三个真细分：出海创作者（在用 Linktree 但访问/支付不便的中国人）、商务名片/media kit 场景、开发者极客。

**具体建议**：① 定位纯开源（MIT/AGPL），目标是 GitHub 中文区标杆项目，不是收入；② 若做商业化，收入来源按优先级为：面向出海人群的托管版收美元（对标 Lnk.bio 买断制 $10-25 终身，规避订阅摩擦）→ 模板/主题市场 → 绝不做国内 C 端订阅；③ 托管版国内部署必须准备多域名轮换 + 实名 + 内容风控预算，或干脆只做海外托管（Vercel/Cloudflare），国内只给自部署文档；④ 把「二维码/活码」做成一等公民而非附属功能——这是与海外所有开源方案差异化的关键，也是中国场景的真实入口。预期管理：这是一个「千 star 项目 + 每月几千美元」量级的机会，不是一个公司。

---

*报告完。数据截至 2026-08-04；主要缺口：Linktree 官方付费率、中国创作者全职/兼职比例、国内同类产品用户数——均无公开数据，文中已标注。*
