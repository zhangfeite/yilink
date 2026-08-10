# 图标来源与归属 / Icon attribution

本包收录的平台标识来自以下开源图标项目。**商标归各平台所有**；此处仅作指向该平台的
指代性使用（nominative use），不表示任何背书或关联关系。

| 来源 | 许可 | 用途 | 项目主页 |
|---|---|---|---|
| Simple Icons | CC0 1.0 | 绝大多数平台字形与品牌色 | https://simpleicons.org |
| Remix Icon | Apache-2.0 | Simple Icons 未收录或已下架的字形（见下表） | https://remixicon.com |
| TDesign Icons | MIT | 企业微信 | https://tdesign.tencent.com/design/icon |

## 取自 Remix Icon / TDesign 的字形

对应源文件在 `src/custom/<平台 id>.ts`，文件头记录了具体图标名与出处。

| 平台 id | 图标 | 说明 |
|---|---|---|
| `linkedin` | `ri:linkedin-fill` | Simple Icons 因商标原因已下架 |
| `amazon` | `ri:amazon-fill` | 同上 |
| `slack` | `ri:slack-fill` | 同上 |
| `codepen` | `ri:codepen-fill` | 同上 |
| `xbox` | `ri:xbox-fill` | 同上 |
| `medium` | `ri:medium-fill` | Simple Icons 那版是带底徽章 + 被画布裁掉一半的字标，整体染白后只剩白斑 |
| `wechat-channels` | `ri:wechat-channels-fill` | Simple Icons 未收录 |
| `email` | `ri:mail-fill` | 通用联系方式，非品牌标识 |
| `phone` | `ri:phone-fill` | 同上 |
| `website` | `ri:global-fill` | 同上 |
| `wecom` | `tdesign:logo-wecom-filled` | Simple Icons 未收录 |

## 没有图标的平台

以下平台在 Simple Icons / Remix Icon / TDesign 中均无收录，**不自行绘制**——
临摹出的近似标识既不准确，商标上也更成问题。它们渲染为「品牌色圆底 + 名称首字」的
字母贴纸，与真图标共用同一套圆形规格：

`wechat-official-account` `jd` `pinduoduo` `goofish` `dewu` `qq-music`
`xiaoyuzhou` `ximalaya` `jike` `sspai`

（Arcticons 收录了其中几个，但它是刻意风格化的细线图集，且为 CC BY-SA 4.0 传染性许可，
混入会同时破坏视觉一致性与许可的干净度，故不采用。）

## 品牌色的来源

- Simple Icons 提供的平台：直接采用其 `hex`，由上游核验。
- 其余平台：取自该平台**自有素材**——站点自声明的 `<meta name="theme-color">`，
  或官方 favicon / apple-touch-icon 的主色（量化取样，见提交记录）。
  `dewu`、`sspai`、`slack`、`codepen` 取不到可靠色值（站点反爬、或多色标单一采样不具代表性），
  留空走中性底色，不臆造。
