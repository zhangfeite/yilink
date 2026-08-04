# 一链 YiLink · 简化网格视觉规范（grid-spec）

> 配套：[spec-02-themes.md](../spec-02-themes.md) ｜ 上位约束：[architecture.md](../architecture.md) §6
> 数据落点：`docs/design/themes.json`（8 套主题 token）、`docs/design/theme-preview.html`（可视化验收）

---

## 1. 栅格参数

| 参数 | 值 | 说明 |
|---|---|---|
| 设计基准宽度 | 375px | 移动端第一场景（微信内） |
| 列数 | 2 列 | 等宽 `1fr × 2` |
| 列间距 / 行间距（gap） | 主题 token `grid.gap`，默认 12px（dopamine 14px） | 间距 token 由主题控制，不做全局硬编码 |
| 容器内边距 | 左右 16px，上 32px，下 40px | 375px 下有效内容宽 343px，单列宽 ≈ (343 − gap) / 2 |
| 容器外边距 | 水平 `auto`（居中） | 配合 §4 桌面端限宽 |
| 网格流 | `grid-auto-flow: dense` | SM 块自动填补空隙，减少视觉空洞 |
| 行高基准 | `grid-auto-rows: 84px` | SM 行高 = 84px；MD/LG 高度 = 84 × 2 + gap |

## 2. 区块尺寸规格（SM / MD / LG）

| 尺寸 | 网格占位 | 375px 下实际尺寸 | 适用区块类型建议 |
|---|---|---|---|
| **SM** | 1 列 × 1 行 | ≈ 165 × 84px | SOCIAL（图标行）、WECHAT（微信号复制）、DIVIDER、单句 TEXT |
| **MD** | 1 列 × 2 行 | ≈ 165 × 180px | LINK（标准链接卡）、IMAGE（方图/竖图）、短 TEXT、QR |
| **LG** | 跨 2 列 × 2 行 | ≈ 343 × 180px | 主打 LINK（作品集/店铺等 hero 链接）、IMAGE（横幅图）、公告类 TEXT |

- LIST 布局忽略尺寸字段，全部区块通栏堆叠（`Block.size` 仅作用于 GRID 布局，与 Prisma 注释一致）。
- 建议每页 LG 区块 ≤ 2 个，保持节奏；SM 块成对出现最稳（同行补齐）。
- 预览页示例数据已覆盖三种尺寸：LG=作品集链接、MD=约稿须知/图片/文本、SM=社交图标行/微信号。

## 3. 桌面端限宽策略

- 容器 `max-width: 480px`，水平居中，**保持手机版式**（对齐 Bento 观感，architecture.md §6-4）。
- 大于 480px 的视口不增加列数、不放大字号，仅两侧留白（或延续页面背景）。
- 主题背景（含渐变）铺满整个视口，卡片体系始终约束在 480px 栏内。

## 4. 图片裁剪比例建议

| 场景 | 建议比例 | 说明 |
|---|---|---|
| LINK 缩略图（thumbUrl） | 1:1（44–56px 显示） | 居中裁剪，主体勿贴边 |
| IMAGE · MD | 4:3 或 1:1 | 165×180 容器内 `object-fit: cover` |
| IMAGE · LG | 16:9 或 2:1 | 横幅主视觉，重点内容放中央 60% 安全区 |
| 头像 | 1:1 | 圆形（dopamine 为 18px 圆角方形），预留 8% 内安全边距 |
| 二维码 / 海报（spec-07） | 1:1 / 3:4 | 与主题 token 共用圆角与配色 |

## 5. 主题 token 使用约定

- 字体：仅系统字体栈（`-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`），vermilion 追加 `Songti SC/serif` 兜底；标题字重由 `font.headingWeight` 控制（600/700），预览页中标题 22px / 卡片标题 15px / 正文 14px / 辅助 12px。
- 按钮三变体：`solid`（buttonBg 实底）、`outline`（1.5px accent 描边 + accent 文字）、`soft`（accent 12% 混合 surface 底 + accent 文字）；阴影 `none/sm/md`。
- 圆角：`radius.card`（区块卡）、`radius.button`（链接卡/按钮）、`radius.avatar`（头像，50% 或 px）。
- 暗色主题 2 套：`ink-dark`、`neon-gradient`（深紫渐变底）。
- vermilion 配色关系：宣纸底 `#F6F1E7` + 墨字 `#2B2420` + 朱砂点缀 `#B23B2E`，朱砂仅用于按钮与强调，不与绿色系并置。

## 6. 对比度自查表（WCAG AA，阈值 4.5:1）

按 WCAG 相对亮度公式实测（neon-gradient 取其渐变最深端 `#0B0A1F` 计算，为最差情况）：

| 主题 | text / bg | subtext / bg | subtext / surface | buttonText / buttonBg | 结论 |
|---|---|---|---|---|---|
| minimal-light | 18.10 | 5.10 | 4.71 | 18.10 | ✅ |
| ink-dark | 17.50 | 7.42 | 6.68 | 10.70 | ✅ |
| cream-paper | 11.45 | 5.35 | 4.89 | 11.45 | ✅ |
| neon-gradient | 17.48 | 8.02 | 7.10 | 12.38 | ✅ |
| bamboo-green | 12.36 | 4.94 | 5.40 | 5.03 | ✅ |
| vermilion | 13.56 | 5.28 | 5.70 | 5.49 | ✅ |
| business-blue | 14.92 | 5.64 | 6.06 | 5.12 | ✅ |
| dopamine | 16.00 | 6.04 | 6.49 | 5.70 | ✅ |

补充说明：

- outline 变体（bamboo-green）的 accent 文字 / bg = 4.61、accent / surface = 5.03，均 ≥ 4.5 ✅。
- soft 变体（cream-paper）的 accent 文字 / surface = 4.89 ≥ 4.5 ✅。
- `dopamine` 的 accent `#FF4D8D` 定位为**纯装饰色**（头像底、图标描边、分隔符），不承载正文文字；其上叠加文字一律使用 `text` 深色，故不纳入 AA 考核。
- 链接卡内辅助行（`small`）以 72% 不透明度渲染，其基底组合（solid 变体 buttonText/buttonBg）本身 ≥ 5.0，透明度折减后仍满足大号辅助文字 3:1 的要求。
