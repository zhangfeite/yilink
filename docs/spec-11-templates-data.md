# Spec-11：8 个场景模板数据（文案骨架）

> 工人：Kimi K3（中文文案主场）｜验收：Claude 本体（zod 程序化校验 + 文案人审）
> 唯一交付文件：`apps/web/src/templates/templates.json`（纯 JSON 数组，无注释无 markdown 围栏）。上位：[template-system.md](design/template-system.md) §二/§三、[design-direction.md](design/design-direction.md)。

## 1. 八个模板（id 固定）

`illustrator-commission 插画师·约稿 / photographer-booking 摄影师·约拍 / podcaster-card 播客主·节目名片 / indie-developer 独立开发者·产品页 / creator-allinone 全网同名博主·总名片 / consultant-booking 咨询顾问·预约 / shop-owner 小店主·导购页 / overseas-creator 出海创作者·Link in bio`

默认主题按 template-system §三 的表格；layout：摄影/插画/博主/小店 GRID，其余 LIST。

## 2. 每个模板的字段（schema 见 packages/shared/src/template.ts，逐字段核对）

```json
{
  "id": "…", "nameZh": "…", "persona": "…", "scene": ["…"],
  "defaultTheme": "…", "layout": "LIST|GRID",
  "cta": { "type": "wechat|link", "label": "≤12字", "value": "…" } 或 null,
  "identity": { "title": "示例昵称(中文人名)", "role": "≤24字职业副题", "bio": "10-120字简介" },
  "blocks": [ { "type": "LINK|SOCIAL|TEXT|IMAGE|WECHAT|QR|DIVIDER", "size": "SM|MD|LG", "config": {…} } ]
}
```

区块 config 按类型：LINK`{title,desc?,url,sectionTitle?}`；SOCIAL`{items:[{platform,url}]}`（platform 用 icons 注册表 id：wechat/xiaohongshu/bilibili/weibo/zhihu/github/douyin/kuaishou/juejin/jike/xiaoyuzhou/tiktok/instagram/youtube/x 等）；TEXT`{markdown}`；WECHAT`{wechatId,qrImageUrl?}`；IMAGE`{url,alt?}`（url 用 `https://images.unsplash.com/...` 真实可访问图）。

## 3. 硬性要求

1. **占位文案即写作示范**：教用户怎么介绍自己（参考基准：摄影师「拍人像，也拍活动与婚礼纪实。常驻杭州，全国可飞…」的具体感），禁止「这里是简介」式废话；每个 LINK 的 desc 都要有真实感（价目/档期/交付周期等场景词）
2. **转化唯一性**：cta.type=wechat 的模板**不得**再放 WECHAT 区块；出海模板 cta 用 link 型（如 "Follow me"→自定 URL），SOCIAL 以海外平台为主
3. 每模板 4-7 个区块，至少含 1 个 LINK 组 + 1 个 SOCIAL；播客模板要有「代表单集」类 LINK；url 一律 `https://example.com/...` 占位（IMAGE 除外）
4. 昵称 8 人各不相同、贴人设（如插画师沿用「林小满」、摄影师「陈野」、开发者「阿枫」，其余自拟）

## 4. 自查

输出前用 JSON.parse 自检；对照 §2 字段清单逐模板核对一遍；确认无 markdown 围栏。
