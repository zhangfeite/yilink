# 项目文档

本页保留项目背景与决策材料索引。安装、配置和部署请从仓库根目录的 [README](../README.md) 开始。

## 文档索引

| 文档                                                  | 内容                                                     |
| ----------------------------------------------------- | -------------------------------------------------------- |
| [调研总结](research-summary.md)                       | 最终判断：该不该做、怎么做、基于什么做（一页读完）。     |
| [PRD v0.1](PRD.md)                                    | 产品定义、分期功能、技术方案、开源策略、商业化与里程碑。 |
| [市场与商业化](research/01-market-business.md)        | Linktree/品类经济学、中国创作者经济、bull & bear case。  |
| [竞品分析](research/02-competitors.md)                | Linktree 及 9 个海外竞品拆解、国内产品死活盘点。         |
| [开源项目调研](research/03-opensource-projects.md)    | 20+ GitHub 项目对比、license 分析、基座选型。            |
| [中国本地化与合规](research/04-china-localization.md) | 各平台外链政策、ICP/审核合规清单与设计启示。             |
| [Kimi 补充调研](research/kimi-supplement.md)          | 平台政策交叉验证与国产同类产品清单。                     |
| [架构说明](architecture.md)                           | 仓库结构、数据模型、接口与部署形态。                     |

## 核心结论

1. 「中国版 Linktree」当大生意做是伪命题；当开源项目加小而美变现做是真机会。
2. 中国没有「bio 里放 link」的土壤——产品锚点是私信里的名片、线下扫的码、简介里能口播的短域名。
3. GitHub 上无理想基座：自研核心（Next.js + TypeScript，Apache-2.0），定向吸收 BioDrop、littlelink、librelinks 等 MIT 资产；LinkStack（AGPL）只作功能基准。
4. 付费用户在出海人群（买断制收美元）；国内走自部署与未来 B 端。
