# Spec-02b：主题体系 v2（返工，取代 spec-02 视觉产出）

> 工人：Kimi K3｜验收：Claude 本体（对标参考页逐条视觉评审）｜上位文档：**[design-direction.md](design/design-direction.md)（必读，八条法则+反面清单直接构成验收项）** + [architecture.md](architecture.md) §6
> 返工原因：v1 被产品负责人否决——「很丑，没有任何高级感」。v1 的问题不是 token 错，是版式语言错（Linktree 克隆脸）。v2 换版式骨架，token schema 升级。

## 1. 交付物（覆写原文件）

1. `docs/design/themes.json` —— 8 套主题，schema 见 §2（v2 结构，覆盖旧文件）
2. `docs/design/theme-preview.html` —— 预览页整体重做，页面结构见 §3（这是本次返工的主战场）
3. `docs/design/grid-spec.md` —— 增补 v2 排版骨架参数（display 字号层级、卡片海拔、贴纸阵列节奏），对比度表按新 palette 重算

## 2. themes.json schema v2

```json
{
  "id": "同 v1 的 8 个固定 id",
  "nameZh": "…", "nameEn": "…",
  "neutral": { "pageBg": "#hex", "card": "#hex", "text": "#hex", "subtext": "#hex", "hairline": "#hex" },
  "accent": "#hex", "accentOn": "#hex",
  "background": { "type": "solid|gradient", "value": "作用于 pageBg 的 CSS" },
  "texture": "none|noise|paper",
  "elevation": { "cardShadow": "CSS box-shadow 值（暗色主题给 hairline 方案）" },
  "typography": { "display": {"size": 36, "weight": 800, "tracking": "-0.02em"}, "section": {"size": 17, "weight": 700}, "body": {"size": 15, "weight": 400}, "caption": {"size": 12, "weight": 400} },
  "radius": { "card": "px", "sticker": "50%", "avatar": "px|50%" },
  "grid": { "gap": "px" }
}
```

约束：浅色 6 套 + 深色 2 套（ink-dark、neon-gradient→改造为「夜蓝深卡」方向，名字保留）；accent 在 card 上、text 在 card 上、accentOn 在 accent 上均 ≥ 4.5:1；8 个 accent 互相拉开色相。

## 3. 预览页结构（严格按此重做，示例数据仍为林小满）

移动 375px 基准、桌面限宽 480px 居中，页面自上而下：

1. **身份卡**（不对称构图）：左侧大字昵称（display 层级、最多两行截断）+ 下方一行浅灰职业副题；右上头像 72-88px 错位悬置（可微出卡缘）；卡底部正文简介 2-3 行。
2. **主链接组卡**：可选 accent 色节标题「作品与约稿」+ 2 张链接卡（白纸卡面 + 左侧 52px 圆角缩略图占位 + 近黑标题 + 中灰描述 + 右缘 → 字符）。
3. **平台贴纸卡**：节标题「全网同名」+ 真实品牌图标风格的圆形贴纸 4-3 阵列（预览中用内联 SVG 画 7 个简化品牌形：微信绿气泡、B站小电视轮廓、抖音音符、小红书方标、微博眼睛、GitHub 猫轮廓、播客天线——识别度优先，不必像素级还原）+ 12px 注释「点击图标即可跳转对应平台」。
4. **微信卡**：细描边小圆线性图标 + 微信号文本 + accent 描边「复制」小按钮 + 12px 注释「点击复制微信号」。
5. **吸底转化条**：左半 accent 12% 淡底「累计访问 12,408」，右半 accent 实底白字「+ 加微信合作」，仅上缘圆角，常驻。
6. **页脚**：「Powered by 一链 YiLink」12px 浅灰。

顶部控制条保留：8 主题切换 +（列表/网格）切换——**网格模式**只作用于第 2 组（链接卡变 MD/LG 磁贴，卡面仍是白纸+内容色法则）；主题按钮补 aria-label（v1 遗留问题）。

## 4. 硬性要求（继承 v1 全部 + 新增）

- 零外部依赖、断网可开、系统字体栈、JSON 可 parse、id 顺序不变
- **design-direction.md §四反面清单六条 = 一票否决项**
- 阴影必须弥散低透明；贴纸直径 ≥52px；引导语全部 12px 浅灰
- 不使用小宇宙品牌蓝 `#4C5BD4±邻域` 作为任一主题 accent；不复刻其图形资产

## 5. 验收流程（本次升级）

1. 程序化：schema/对比度/外部依赖（同 v1 脚本）
2. **视觉评审（新增，Claude 本体执行）**：浏览器 375px 逐主题截图，对照 design-direction.md 八条法则逐条打分；任一反面清单项出现即打回；与参考页并排对比问一个问题——「放在一起像不像同一个档次的产品」
3. 最多返工 2 轮（铁律 2 的评审轮次上限），仍不达标则 Claude 本体接管手改
