# 一链 YiLink

> 开源的中文聚合主页 / link-in-bio 工具。
> 一个主页 = 一条链接 + 一个二维码 + 一张海报 +（未来）一个小程序卡片。

## 当前状态

**M2 后段**（2026-08-04）：产品闭环已跑通——注册 → 选场景模板建页 → 编辑器（实时预览/拖拽/主题/CTA）→ 发布 → 公开页 → 统计报表 → 审核后台，62 个单测 + 浏览器全流程验收通过。8 主题 × 8 场景模板 × 42 平台图标就位。剩余：计费（LemonSqueezy）、分享海报、部署文档与开源发布（wave 4）。

本地体验：`pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev`，示例页 `/p/demo-photographer`。

## 文档索引

| 文档 | 内容 |
|---|---|
| [调研总结](docs/research-summary.md) | 最终判断：该不该做、怎么做、基于什么做（一页读完） |
| [PRD v0.1](docs/PRD.md) | 产品定义、分期功能、技术方案、开源策略、商业化、里程碑 |
| [市场与商业化](docs/research/01-market-business.md) | Linktree/品类经济学、中国创作者经济、bull & bear case |
| [竞品分析](docs/research/02-competitors.md) | Linktree 及 9 个海外竞品拆解、国内产品死活盘点 |
| [开源项目调研](docs/research/03-opensource-projects.md) | 20+ GitHub 项目对比、license 分析、基座选型 |
| [中国本地化与合规](docs/research/04-china-localization.md) | 各平台外链政策、ICP/审核合规清单、设计启示 |
| [Kimi 补充调研](docs/research/kimi-supplement.md) | 平台政策交叉验证、国产同类产品清单 |

## 核心结论（TL;DR）

1. 「中国版 Linktree」当大生意做是伪命题；当**开源项目 + 小而美变现**做是真机会。
2. 中国没有「bio 里放 link」的土壤——产品锚点是**私信里的名片、线下扫的码、简介里能口播的短域名**。
3. GitHub 上无理想基座：自研核心（Next.js + TS，Apache-2.0），定向吸收 BioDrop / littlelink / librelinks 等 MIT 资产；LinkStack（AGPL）只作功能基准。
4. 付费用户在出海人群（买断制收美元）；国内走自部署 + 未来 B 端。
