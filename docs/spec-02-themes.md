# Spec-02：主题体系与简化网格视觉规范

> 工人：Kimi K3（前端/UI 审美通道）｜验收：Claude 本体｜上位文档：[architecture.md](architecture.md) §6
> 目标：产出「一链 YiLink」首批 8 套主题的设计 token、简化网格视觉规范、以及一个零依赖的预览页。这是**设计交付物**（写入 docs/design/），不改动应用代码。

## 1. 交付物（三个文件）

1. `docs/design/themes.json` —— 8 套主题，严格符合 §2 的 schema
2. `docs/design/theme-preview.html` —— 自包含单文件预览页（禁止引用任何外部资源/CDN/网络字体），内嵌示例数据渲染全部 8 主题 × 2 布局（列表/网格），顶部提供主题切换器与布局切换器
3. `docs/design/grid-spec.md` —— 简化网格视觉规范文档

## 2. themes.json schema（每套主题一个对象）

```json
{
  "id": "kebab-case",
  "nameZh": "中文名",
  "nameEn": "English name",
  "palette": {
    "bg": "#hex", "surface": "#hex", "text": "#hex", "subtext": "#hex",
    "accent": "#hex", "buttonBg": "#hex", "buttonText": "#hex", "border": "#hex"
  },
  "background": { "type": "solid|gradient", "value": "CSS background 值" },
  "font": { "family": "仅系统字体栈", "headingWeight": 600 },
  "radius": { "card": "px", "button": "px", "avatar": "px 或 50%" },
  "buttonStyle": { "variant": "solid|outline|soft", "shadow": "none|sm|md" },
  "grid": { "gap": "px" }
}
```

## 3. 8 套主题清单（id 固定，风格按名发挥）

`minimal-light` 极简浅色（默认）、`ink-dark` 墨夜暗色、`cream-paper` 奶油纸感、`neon-gradient` 霓虹渐变、`bamboo-green` 竹青森系、`vermilion` 朱砂中式、`business-blue` 商务蓝、`dopamine` 多巴胺撞色。

## 4. 硬性要求

- 中文排版优先：字体栈只用系统字体（`-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif` 基础上按主题微调），标题/正文字号层级在预览页里可直接看
- 对比度：正文与背景 ≥ WCAG AA（4.5:1），按钮文字与按钮底 ≥ 4.5:1——在 grid-spec.md 里附每套主题的对比度自查表
- 暗色主题至少 2 套；`vermilion` 避免大红配大绿的廉价感，参考朱砂/宣纸/墨三色关系
- 预览示例数据用：头像占位（CSS 圆形+姓氏字）、昵称「林小满」、简介「插画师 / 约稿开放 / 全网同名」、6 个区块：2 个链接卡（作品集、约稿须知）、1 个社交图标行（模拟 5 个平台圆点）、1 个微信号复制块、1 张图片占位、1 个文本块
- 网格布局按 architecture.md §6：375px 基准 2 列；SM=1列紧凑、MD=1列双倍高、LG=跨 2 列；示例中每种尺寸都要出现

## 5. grid-spec.md 内容要求

列出：栅格参数（列数/gap/外边距）、三种尺寸的规格与适用区块类型建议、桌面端 480px 限宽策略、图片裁剪比例建议、以及 8 套主题的对比度自查表。

## 6. 验收标准

- themes.json 能被 `JSON.parse` 且 8 套齐全、字段无缺漏
- theme-preview.html 双击本地打开即渲染，无控制台报错，断网可用
- 逐主题肉眼验收：默认即好看（对标 Liinks），无低对比度文字
