# 一链 YiLink · 简化网格视觉规范（grid-spec v2）

> 配套：[spec-02b-themes-v2.md](../spec-02b-themes-v2.md)（v2 返工，取代 spec-02 视觉产出）｜ 上位约束：[design-direction.md](design-direction.md)（八条法则 + 反面清单）、[architecture.md](../architecture.md) §6
> 数据落点：`docs/design/themes.json`（8 套主题 v2 token）、`docs/design/theme-preview.html`（可视化验收）

---

## 1. 栅格参数

| 参数 | 值 | 说明 |
|---|---|---|
| 设计基准宽度 | 375px | 移动端第一场景（微信内） |
| 列数 | 2 列 | 等宽 `1fr × 2` |
| 列间距 / 行间距（gap） | 主题 token `grid.gap`，默认 12px（dopamine 14px） | 间距 token 由主题控制，不做全局硬编码 |
| 容器内边距 | 左右 16px，上 40px，下 56px | 375px 下有效内容宽 343px，单列宽 ≈ (343 − gap) / 2；下方为吸底转化条让位 |
| 容器外边距 | 水平 `auto`（居中） | 配合 §3 桌面端限宽 |
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
- 预览页网格模式只演示主链接组的 LG（跨 2 列横排）+ MD（竖排磁贴）两档；SM 档由渲染器（spec-05）实装。

## 3. 桌面端限宽策略

- 容器 `max-width: 480px`，水平居中，**保持手机版式**（对齐 Bento 观感，architecture.md §6-4）。
- 大于 480px 的视口不增加列数、不放大字号，仅两侧留白（或延续页面背景）。
- 主题背景（含渐变与质感纹理）铺满整个视口，卡片体系始终约束在 480px 栏内。

## 4. 图片裁剪比例建议

| 场景 | 建议比例 | 说明 |
|---|---|---|
| LINK 缩略图（thumbUrl） | 1:1（52px 显示） | 居中裁剪，主体勿贴边 |
| IMAGE · MD | 4:3 或 1:1 | 165×180 容器内 `object-fit: cover` |
| IMAGE · LG | 16:9 或 2:1 | 横幅主视觉，重点内容放中央 60% 安全区 |
| 头像 | 1:1 | 圆形（dopamine 为 22px 圆角方形），预留 8% 内安全边距 |
| 二维码 / 海报（spec-07） | 1:1 / 3:4 | 与主题 token 共用圆角与配色 |

## 5. v2 排版骨架参数（新增，八条法则的数值落地）

v2 的「高级感」来自固定骨架 + 三旋钮（accent / 底色温度 / 质感），以下骨架参数所有主题共享：

### 5.1 字号层级（typography token，四级台阶）

| 层级 | token | 值 | 用途 | 颜色 |
|---|---|---|---|---|
| display | `typography.display` | 36px / 800 / -0.02em / 行高 1.1（dopamine 38px） | 昵称海报大字，最多两行截断 | `text` 近黑 |
| section | `typography.section` | 17px / 700 | 可选分组节标题 | `accent`（唯一彩色文字位） |
| body | `typography.body` | 15px / 400 | 简介正文；链接卡标题同级加粗至 600 | `text` |
| caption | `typography.caption` | 12px / 400 | 全部引导语/注释/页脚 | `subtext` 浅灰居中 |

- 落差纪律：display → section → body → caption 之间字号、字重、灰度都必须有台阶；引导语永不升到正文级。
- 昵称宁可省略号截断也不缩小字号（`-webkit-line-clamp: 2`）。

### 5.2 卡片海拔（elevation token）

| 层 | 值 | 说明 |
|---|---|---|
| pageBg | 冷调淡彩 / 深墨 / 夜蓝渐变 | 「桌面」层 |
| card | 白 / 深卡 | 「纸」层，圆角 `radius.card`（12–22px） |
| cardShadow（浅色） | `0 8px 30px rgba(0,0,0,0.06)` 量级（可按主题染暖/冷调） | 只许弥散低透明，禁止生硬投影 |
| cardShadow（深色 ink-dark / neon-gradient） | `inset 0 0 0 1px rgba(255,255,255,0.05–0.07) + 外侧弥散` | hairline 内侧描边 + 表面提亮方案 |

### 5.3 贴纸阵列节奏

| 参数 | 值 |
|---|---|
| 贴纸直径 | 56px（硬性下限 52px） |
| 阵列 | 居中流式 4-3（容器 max-width 284px 自然折行） |
| 间距 | 行距 16px / 列距 18px |
| 形态 | 圆形贴纸（`radius.sticker: 50%`），品牌彩色由内容供给，白底贴纸加 hairline 描边 |
| 次级联系方式 | 细描边小圆（36px）+ accent 线性图标，与贴纸形成两种密度 |

### 5.4 不对称首卡

- 头像 72–88px（预览取 84px），`position: absolute` 右上悬置，向上微出卡缘（top: -18px），卡片 `margin-top` 让位。
- 昵称区 `padding-right` ≥ 104px 避让头像；文字一律居左，禁止居中。
- 简介位于卡底部，2–3 行截断。

### 5.5 吸底转化条

- `position: sticky; bottom: 0` 常驻，左右双拼各 50%：左 `accent 12%` 淡底 + accent 文字（社会证明），右 accent 实底 + accentOn 文字（唯一 CTA）。
- 圆角只做上缘（`radius.card`），下缘直角贴屏。

## 6. 主题 token 使用约定（v2 schema）

- `neutral{pageBg,card,text,subtext,hairline}`：卡面、正文、边框全部走固定中性体系；页面彩色只能来自内容与 accent。
- `accent` / `accentOn`：唯一品牌色 + 其上的文字色；accent 仅用于节标题、CTA、选中/按压态（链接卡按压时背景混入 4–8% accent）。
- `texture`：`none` / `noise`（≈5% 不透明度单色噪点）/ `paper`（低频纸纹，仅暖色主题 cream-paper、vermilion）。
- 字体：仅系统字体栈（`-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`）。
- 暗色主题 2 套：`ink-dark`（深墨 + 香槟金）、`neon-gradient`（夜蓝渐变底 + 深卡 + 冰青 accent，v2 已由霓虹紫改造为夜蓝深卡方向，id 与名字保留）。

## 7. 对比度自查表（WCAG AA，阈值 4.5:1，v2 palette 重算）

按 WCAG 相对亮度公式实测；考核组合为 spec-02b §2 三组硬性要求（accent/card、text/card、accentOn/accent），附 subtext/card 参考：

| 主题 | text / card | subtext / card | accent / card | accentOn / accent | 结论 |
|---|---|---|---|---|---|
| minimal-light | 18.10 | 5.75 | 17.07 | 17.07 | ✅ |
| ink-dark | 15.74 | 6.68 | 10.00 | 10.70 | ✅ |
| cream-paper | 12.14 | 5.67 | 5.67 | 5.81 | ✅ |
| neon-gradient | 14.62 | 6.56 | 10.66 | 10.97 | ✅ |
| bamboo-green | 13.50 | 5.40 | 5.03 | 5.03 | ✅ |
| vermilion | 14.64 | 5.70 | 5.66 | 5.49 | ✅ |
| business-blue | 16.03 | 6.06 | 5.19 | 5.19 | ✅ |
| dopamine | 17.20 | 6.49 | 4.91 | 4.91 | ✅ |

补充说明：

- neon-gradient 按深卡 `#171E3B` 计算；text/subtext 落在 pageBg 渐变最深端 `#0A0E1E` 时对比度更高。
- accent 色相分布：近黑墨（neutral）/ 金 44° / 棕 28° / 红 6° / 品红 334° / 冰青 188° / 绿 147° / 青蓝 215°，8 套互相拉开。
- business-blue accent `#1668DC`（色相 215°，高饱和青蓝）与小宇宙品牌蓝 `#4C5BD4`（色相 233°，低饱和长春花蓝）色相距 18°、饱和度与明度均显著不同，不属于其邻域。
- 链接卡描述（13px）与全部引导语（12px）使用 `subtext`，均 ≥ 4.5:1。
