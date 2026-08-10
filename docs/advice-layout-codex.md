# 「自由布局编辑」技术方案（Codex 外部技术顾问意见）

> 结论日期：2026-08-10  
> 推荐形态：**d——保留现有 LIST/GRID，新增受约束的 BENTO v1；BENTO 是方案 b 的移动端安全子集，不做方案 c 的绝对定位画布。**

## 0. 先校准现状：规范描述与生产代码并不完全相同

方案必须兼容的是用户现在看到的 HTML/CSS，而不是只兼容文档中的理想模型。逐文件核对后，有六个会直接影响设计的事实。

1. Prisma 的活动模型确实只有 `Page.layout: LIST | GRID`，以及 `Block.position / size / isVisible / config`；`size` 没有二维坐标语义（`apps/web/prisma/schema.prisma:154-205`）。共享 Zod 目前只校验七种区块的 `type + config`，也没有布局数据（`packages/shared/src/blocks.ts:1-66`）。
2. 编辑器当前是一个线性数组：`arrayMove` 改数组顺序，`verticalListSortingStrategy` 只做纵向排序；`PointerSensor` 的启动距离是 6px，并已有键盘 sensor（`page-editor.tsx:107-110,211-220,757-778`）。区块尺寸仍是 SM/MD/LG 三个按钮（`block-editor.tsx:331-350`）。这不是二维编辑器。
3. 右侧 375px 预览确实复用 `PublicPageRenderer`（`page-editor.tsx:787-805`），移动编辑器则已经有“编辑/预览”两个 tab（`page-editor.tsx:597-610`）。这两个结构可以保留。
4. **实际公开页的 GRID 只网格化连续的 LINK 区块。** `ContentFlow` 先把连续 LINK 合成 `LinkGroup`，其他类型仍直接进入纵向 `.contentFlow`（`public-page.tsx:395-425`）；`sizeClass` 也只在 `LinkBlock` 上使用（`public-page.tsx:129-133,175`）。因此 IMAGE/TEXT/SOCIAL/WECHAT/QR/DIVIDER 的 `size` 当前不会改变公开页占位。
5. 实际 CSS 与 `grid-spec.md` 还有第二层差异：`.linkCards[data-layout='grid']` 只有两列，没有 `grid-auto-flow: dense` 和 `grid-auto-rows: 84px`；LG 只跨列，MD/SM 分别是 `min-height: 148px/76px`（`public-page.module.css:158-168,264-299`），并非规范所写的 LG=2×2、MD=1×2、SM=1×1。**不能在自由布局上线时顺手“修正”旧 GRID，否则存量页面会变形。**
6. 公开路由在服务端按 `position` 查询可见区块（`app/p/[slug]/page.tsx:26-46`），`PublicPageRenderer` 本身没有 `'use client'`；布局之外唯一常驻内联交互脚本目前源码为 2,113 bytes，用于统计、复制和 toast。页面容器为 `max-width: 480px`，375px 时左右各 16px（`public-page.module.css:44-52`）。这些条件使“服务端算好矩形、CSS Grid 直接画”可行。

另一个应顺手处理的现有问题是：保存区块时 API 会 `deleteMany + createMany`（`api/v1/pages/[id]/blocks/route.ts:72-88`），编辑器又没有用 API 返回值更新 block id（`page-editor.tsx:259-283`）。所以每次保存都会换掉公开 `data-block-id`，打断按区块的点击归因。自由布局会提高保存频率，MVP 应把 id 稳定化，而不是继续放大这个问题。

## 1. 形态选型

### 1.1 a/b/c/d 在三重约束下的判断

| 形态                                         | SSR 零框架 JS                                                                | 375px 移动端                                                               | 存量兼容                         | 工程代价                                   | 判断                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------ | -------------------------------------------- |
| a. 增强网格：更多尺寸/列数，仍靠顺序和 dense | 很好，纯 CSS 即可                                                            | 较好，但列数一多就出现不可读的窄卡；仍不能明确放到“左上第几格”             | 若原地改 GRID 很差；新开模式则好 | 低到中                                     | 可作为交互预设，单独采用不足以满足“位置自由” |
| b. 真正自由网格：显式 col/row/span           | 很好；坐标可直接 SSR 成 CSS Grid                                             | 中等；只有吸附、无重叠、有限列数时才可用                                   | 原地替换 GRID 很差；新开分支可控 | 中到高，需要占位、碰撞、压紧和 resize 引擎 | 技术上正确，但必须裁掉失控部分               |
| c. 自由画布：绝对 x/y/w/h、层叠              | 静态矩形能 SSR，但动态文本、系统字体、图片比例和无障碍顺序很难在零 JS 下稳定 | 很差；375→320/480 时缩放会连字体和触控区一起变形，双套布局又使编辑成本翻倍 | 很差                             | 高，长期维护最高                           | 否决                                         |
| d. 组合：旧模式不动 + 新的受约束 BENTO       | 很好；公开页仍只有 HTML+CSS                                                  | 最好；以 375 为唯一布局源，桌面只扩宽容器                                  | 最好；旧数据不回填、不换解释器   | 中                                         | **推荐**                                     |

方案 a 的最大问题不是“功能少”，而是它继续让 `dense` 代替用户决定位置。用户把卡片拖到左侧后，新增/隐藏另一块可能触发自动回填，视觉位置并不稳定。方案 c 则把内容型网页误当成海报软件：一段 Markdown 或一个带二维码的微信块高度会变化，像素坐标无法同时保证不遮挡、可访问和响应式。

### 1.2 推荐的 BENTO v1

BENTO v1 采用一个 **4 微列 × 微行** 的占位网格：

- 375px 页面内容宽为 343px；默认 gap=12px 时，每微列为 `(343 - 3×12) / 4 = 76.75px`。
- 普通内容最小跨 2 微列，得到 `76.75×2 + 12 = 165.5px`，恰好对应现有 2 列规范中的半宽；跨 4 列就是 343px 通栏。
- 行用微轨表达。默认主题令行轨为 12px，则 `h=4` 是 `4×12 + 3×12 = 84px`，`h=8` 是 180px，可承接 `grid-spec.md` 的 SM/MD 节奏。dopamine 的 gap=14px 时，由服务端主题函数算出 10.5px 行轨，使 `h=4` 仍为 84px、`h=8` 为 182px。
- 每个区块存 `{x,y,w,h}` 网格整数；禁止像素坐标、负数、重叠、z-index、旋转和越界。拖动发生碰撞时由确定性算法向下推挤并再向上压紧，不允许留下任意大空洞。
- 所有内容 Block 都能移动；尺寸自由度按类型设下限。身份首卡、页脚和吸底 CTA 不是 Block，MVP 继续锁定，以守住设计方向中的固定骨架和转化唯一性。

这不是“两套响应式布局”。`x/y/w/h` 以 375px 为唯一源，320～480px 都使用同一组网格坐标，只让列宽随容器变化。项目当前桌面本来就限定在 480px（`grid-spec.md` §3），为桌面另存一套布局没有产品收益，却会制造两套内容顺序、两套溢出错误和两倍编辑负担。只有未来公开页真的取消 480px 限宽时，才讨论可选的 `wide` placement。

## 2. 推荐数据模型

### 2.1 不给 `Layout` enum 增加 BENTO

最稳妥的模型不是把 `Layout` 改成 `LIST | GRID | BENTO`，而是保留 `layout` 作为旧解释器和天然回滚视图，再用 nullable 版本字段开启新解释器：

```prisma
model Page {
  // ...现有字段不变
  layout       Layout @default(LIST) // 仍只有 LIST/GRID；也是 BENTO 的降级视图
  bentoVersion Int?                  // null=完全走旧渲染；1=BENTO v1
  blocks       Block[]
}

enum Layout {
  LIST
  GRID
}

model Block {
  id          String    @id @default(cuid())
  pageId      String
  page        Page      @relation(fields: [pageId], references: [id], onDelete: Cascade)
  type        BlockType
  position    Int                       // 继续作为 DOM/键盘/降级阅读顺序
  size        BlockSize @default(MD)    // 继续作为旧 LIST/GRID 的影子尺寸
  placement   Json?                     // BENTO v1: {x,y,w,h}；旧页为 SQL NULL
  isVisible   Boolean   @default(true)
  config      Json
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([pageId, position])
}
```

对应 SQLite/D1 增量只有两个 nullable 列：

```sql
ALTER TABLE "Page" ADD COLUMN "bentoVersion" INTEGER;
ALTER TABLE "Block" ADD COLUMN "placement" JSONB;
```

这样设计有三个具体好处。

- 老数据自然是 `bentoVersion = NULL / placement = NULL`，没有回填窗口，也没有枚举值切换造成的旧 Prisma Client 解析风险。
- 老版本应用即使在 BENTO 页面存在时回滚上线，也只会忽略新增列，继续按合法的 LIST/GRID 渲染，不会 500。
- `bentoVersion` 是整页解释版本；未来若坐标含义变化可迁到 2，不必给每个 placement 冗余存一份 `v`。

`placement` 采用 JSON 而不是四个数据库列，因为它不参与筛选/排序查询，页面最多 50 块，而且后续版本可能扩字段。代价是数据库无法检查越界和重叠，所以 API 必须以共享 Zod + 纯函数布局引擎作为写入门卫。

### 2.2 Zod schema 与整页约束

建议把下列 schema 和 `normalizeBentoLayout` 放进 `packages/shared`，供 Studio、API 和服务端公开渲染共同使用。以下片段刻意保留现有 `blockSchema`，只与布局元数据做 intersection：

```ts
import { z } from 'zod';
import { blockSchema } from './blocks';

export const BENTO_COLUMNS = 4;
export const BENTO_MAX_ROWS = 600; // 默认 gap 下约 14.4k px，足够容纳 50 个标准块

export const bentoPlacementSchema = z
  .object({
    x: z
      .number()
      .int()
      .min(0)
      .max(BENTO_COLUMNS - 1),
    y: z
      .number()
      .int()
      .min(0)
      .max(BENTO_MAX_ROWS - 1),
    w: z.number().int().min(1).max(BENTO_COLUMNS),
    h: z.number().int().min(1).max(24),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.x + p.w > BENTO_COLUMNS) {
      ctx.addIssue({ code: 'custom', message: '区块超出右边界', path: ['w'] });
    }
    if (p.y + p.h > BENTO_MAX_ROWS) {
      ctx.addIssue({ code: 'custom', message: '页面超过最大网格高度', path: ['h'] });
    }
  });

const blockLayoutMetaSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  size: z.enum(['SM', 'MD', 'LG']),
  isVisible: z.boolean(),
  placement: bentoPlacementSchema.nullable().optional(),
});

export const blockLayoutItemSchema = blockSchema.and(blockLayoutMetaSchema);
type Placement = z.infer<typeof bentoPlacementSchema>;

function overlaps(a: Placement, b: Placement) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const minRows = {
  LINK: 4,
  SOCIAL: 8,
  TEXT: 4,
  IMAGE: 4,
  WECHAT: 4,
  QR: 8,
  DIVIDER: 1,
} as const;

export const pageLayoutReplaceSchema = z
  .object({
    layout: z.enum(['LIST', 'GRID']), // 旧模式/降级模式
    bentoVersion: z.literal(1).nullable(),
    blocks: z.array(blockLayoutItemSchema).max(50),
  })
  .strict()
  .superRefine((page, ctx) => {
    if (page.bentoVersion === null) return;

    const placed: Array<{ index: number; p: Placement }> = [];
    page.blocks.forEach((block, index) => {
      const p = block.placement;
      if (!p) {
        ctx.addIssue({
          code: 'custom',
          message: 'BENTO 区块缺少 placement',
          path: ['blocks', index, 'placement'],
        });
        return;
      }
      if (p.h < minRows[block.type] || (block.type !== 'IMAGE' && p.w < 2)) {
        ctx.addIssue({
          code: 'custom',
          message: '小于该区块类型的安全尺寸',
          path: ['blocks', index, 'placement'],
        });
      }
      if (block.type === 'DIVIDER' && (p.x !== 0 || p.w !== 4 || p.h !== 1)) {
        ctx.addIssue({
          code: 'custom',
          message: '分隔线必须通栏且高为 1',
          path: ['blocks', index, 'placement'],
        });
      }
      const collision = placed.find((other) => overlaps(other.p, p));
      if (collision) {
        ctx.addIssue({
          code: 'custom',
          message: `与区块 ${collision.index} 重叠`,
          path: ['blocks', index, 'placement'],
        });
      }
      placed.push({ index, p });
    });
  });
```

上面只是通用下限；还要在同一个共享策略函数里加入内容相关约束，例如 SOCIAL 按图标数量计算最小高度、带 `qrImageUrl` 的 WECHAT 至少通栏高版、QR 必须能完整显示二维码。TEXT/LINK 可裁掉说明文字，但不能裁掉主链接、复制按钮等可操作控件。公开页不使用块内滚动条。

### 2.3 `position`、`size` 与 placement 的一致性

每次 BENTO 保存时，服务端先调用同一份 `normalizeBentoLayout`，再执行三步：

1. 依 `(y, x, 原 position)` 排序，重写连续 `position=0..n-1`，使 DOM、屏幕阅读器、Tab 键和视觉顺序一致；不要靠 CSS `order` 或 `grid-auto-flow:dense` 偷换阅读顺序。
2. placement 是权威布局；同时派生旧 `size` 影子值，例如半宽紧凑→SM、半宽标准→MD、通栏标准→LG。它只服务旧版降级，不反向覆盖 placement。
3. API 返回服务端 canonical blocks，编辑器必须 `setBlocks(result.blocks)`，接收压紧后的坐标与真实数据库 id。

布局与 blocks 必须一次事务保存。当前编辑器先 PATCH 页面、再 PUT blocks（`page-editor.tsx:239-274`），可能短暂产生“已开启 BENTO、但区块还没有 placement”的公开页。建议把 blocks API 的新版请求改为上面的 `{layout,bentoVersion,blocks}`，在 D1 支持的数组 `$transaction` 中同时更新 Page 与 Block；旧的数组请求可暂时作为兼容分支。

同时把现有 `deleteMany + createMany` 改成按归属校验后的 update/create/delete diff：已有 id 原地 update，新建的 `draft-*` 让服务端生成 id，缺席的旧 id 删除。否则每次移动一次卡片并保存，历史点击所引用的 block id 都会失效。

### 2.4 存量 LIST/GRID 与 8 个模板的无损迁移

这里必须区分“数据库无损迁移”和“用户主动改版”。前者可以做到逐像素不变，后者本来就是一次设计变更。

- **数据库上线不做任何数据 UPDATE。** 所有存量页保持 `bentoVersion=NULL`，公开渲染继续进入现有 `ContentFlow(layout)`；不要借机修复旧 GRID 与 `grid-spec` 的差异。
- 当前 8 个模板恰好是 4 个 GRID（插画、摄影、博主、小店）和 4 个 LIST（播客、独立开发者、咨询、出海）。`sceneTemplateSchema` 只需增加可选的 `bentoVersion/placement`；现有 JSON 不增加字段，`createPageFromTemplate` 继续创建完全相同的页面。
- 新 BENTO 模板必须满足“`bentoVersion=1` 时每块 placement 必填”的整页 refine。首发不要原地修改这 8 个模板；后续经视觉评审后再增加 BENTO variant，避免模板使用率统计和现有落地页截图静默变形。
- 用户点击“转换为自由布局”时只在客户端生成候选 placement，并先展示 375/320 预览；取消则零写入。LIST 候选默认全部通栏，GRID 候选仅把连续 LINK 的 SM/MD/LG 映射到半宽/半宽/通栏，非 LINK 仍先通栏，因为这才符合当前真实渲染。确认后才写 `bentoVersion=1`。
- 首次转换保存只新增 `bentoVersion/placement`，不改原 `Page.layout / Block.position / Block.size`，此时清空 `bentoVersion` 可精确回到原页。用户随后真正移动或缩放并保存时，才同步新的 position/影子 size；此后的降级仍保留全部内容和阅读顺序，但不承诺复原改版前的构图。

自动把旧 GRID 解释成文档所写的 2×N 网格并不“无损”：例如模板中的 IMAGE LG 当前仍是自然高度通栏图，迁成固定 2×2 会立刻裁图；这正是本方案拒绝批量 backfill 的原因。

模板 schema 的增量应保持 optional，并做跨字段校验，而不是给旧模板补假坐标：

```ts
const templateBlockSchema = z
  .object({
    type: z.enum(['LINK', 'SOCIAL', 'TEXT', 'IMAGE', 'WECHAT', 'QR', 'DIVIDER']),
    size: z.enum(['SM', 'MD', 'LG']).default('MD'),
    config: z.record(z.string(), z.unknown()),
    placement: bentoPlacementSchema.optional(),
  })
  .superRefine((block, ctx) => {
    // 保留当前 template.ts 对每类 config 的校验，不能被布局增量替掉。
    const result = blockConfigSchemas[block.type].safeParse(block.config);
    if (!result.success)
      ctx.addIssue({
        code: 'custom',
        message: `config 不符合 ${block.type} schema`,
        path: ['config'],
      });
  });

const sceneTemplateSchema = z
  .object({
    // ...现有 id/name/persona/theme/cta/identity 不变
    layout: z.enum(['LIST', 'GRID']), // 也是降级模式
    bentoVersion: z.literal(1).optional(),
    blocks: z.array(templateBlockSchema).min(2).max(12),
  })
  .superRefine((template, ctx) => {
    if (template.bentoVersion !== 1) return;
    template.blocks.forEach((block, index) => {
      if (!block.placement)
        ctx.addIssue({
          code: 'custom',
          message: 'BENTO 模板区块缺少 placement',
          path: ['blocks', index, 'placement'],
        });
    });
  });
```

## 3. 编辑器交互与技术选型

### 3.1 dnd-kit 现有能力够不够

结论是：**现有依赖足够做拖动输入层，不足以单独充当布局系统；MVP 不需要再引入 react-grid-layout、react-rnd 或 interact.js。**

项目已安装 `@dnd-kit/core 6.3.1`、`sortable 10.0.0`、`utilities 3.2.2`。本地类型中已有 `useDraggable/useDroppable`、`DragOverlay`、测量策略、modifier 类型、键盘 sensor，以及 sortable 的 rect strategy。需要替换的是当前的 `verticalListSortingStrategy`，不是替换整套依赖。

dnd-kit 不负责以下能力，需新增一个无 React 的 `packages/shared/src/layout/bento.ts`：

- 像素 delta → `{x,y}` 吸附；
- 矩形越界/碰撞检测；
- push-down、first-fit、vertical compact；
- resize 后的最小尺寸与类型策略；
- 隐藏块/CTA 去重后的重新压紧；
- canonical reading order 和 legacy size 派生。

resize 不应伪装成 sortable。桌面端用 Pointer Events 的右/下/右下 44px 可见把手，移动时只更新本地 ghost，pointer up 后交给共享引擎提交。边界 modifier 可以用 core 自定义函数完成；如团队希望复用现成的 `restrictToParentElement`，只需可选增加很小的 `@dnd-kit/modifiers`，它不是 MVP 前置条件。

不推荐重型现成网格库的原因不是公开页会直接带上它们——它们可以只进 Studio——而是其 responsive breakpoint、compact 和 collision 语义会成为第二套真相。这里还要支持旧 GRID、CTA 隐藏 WECHAT、服务端防御性压紧和 DOM 顺序，同一份纯函数更容易保证编辑器与 SSR 一致。

### 3.2 组件拆分

建议将当前大组件拆为三层：

- `PublicBlockView`：纯展示、无 hook，承接七种 block markup；LIST/GRID 的现有 `ContentFlow` 不改语义。
- `BentoFlow`：服务端可调用的 placement→CSS wrapper，只负责公开页。
- `BentoCanvas`：Studio client component，复用 `PublicBlockView`，外面叠加选择框、drop zones、resize handles 和 `DragOverlay`。

不要把 dnd-kit、ResizeObserver 或编辑选中状态放进 `components/public/` 的公开渲染入口。当前编辑预览还会连同 `PublicPageRenderer` 一起渲染内联统计脚本；可顺手拆成“纯页面视图 + 仅公开路由追加 InteractionScript”，避免预览污染统计。

### 3.3 桌面手势

- 单击选中；双击或 Enter 打开左侧原有内容表单。
- 从卡片专用拖动把手拖到任意合法网格槽；显示目标 ghost、占位和被推挤结果，非法目标用红色边界而不是 drop 后静默跳走。
- 拖右边、下边、右下角把手改变 `w/h`，始终按微网格吸附。LINK/TEXT 等最窄 2 列，DIVIDER 只可移动不可任意缩放。
- 键盘：方向键移动一格，Shift+方向键调整尺寸，Esc 取消本次操作；读屏 announcement 要播报“第几列、第几行、宽几列、高几行”。另保留“上移/下移/左移/右移”和尺寸 preset 按钮作为无拖拽兜底。
- 本地保存 20 步 command history，至少覆盖 move/resize/hide/delete；自由拖动没有撤销会显著降低试错意愿。

### 3.4 移动端手势

窄屏不要照搬桌面边缘 resize。

- 保留当前“编辑/预览”tab；在“布局”子页显示真实宽度、可滚动的 BENTO canvas，点卡片后从底部 sheet 编辑。
- 使用独立 MouseSensor 与 TouchSensor。触摸只允许从 44px 拖动把手启动，建议长按约 180ms、容差 8px；普通卡片区域仍负责页面滚动，避免当前 PointerSensor distance=6 在滚动时误拖。
- 移动位置：长按把手拖至高亮槽；同时提供四方向按钮。移动尺寸：底部 sheet 使用“窄图/半宽、通栏”和“紧凑/标准/高版”安全 preset，不在 MVP 提供捏合缩放。
- 拖动期间禁止该把手的原生滚动（`touch-action: none`），但不要给整个 canvas 禁滚。越界时自动滚动只作用于编辑容器。
- 内容编辑与布局编辑分离：点正文不是拖动，避免 LINK 输入、Markdown 选择、复制微信号等手势冲突。

### 3.5 默认即好看的护栏

| 护栏       | MVP 行为                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 吸附与边界 | 4 列整数网格；所有操作 clamp 到容器内                                                                             |
| 重叠与空洞 | 禁止 overlap/z-index；碰撞向下推，保存前向上压紧                                                                  |
| 类型尺寸   | LINK/TEXT/SOCIAL/WECHAT/QR 最窄半幅；二维码和操作按钮不可被裁；DIVIDER 固定通栏                                   |
| 内容溢出   | Studio 用 `scrollHeight/clientHeight` 做即时提示；主操作溢出则禁止发布，说明文字使用 line-clamp；不出现块内滚动条 |
| 视觉纪律   | 仍由主题统一 card/accent/shadow/radius；不开放单块背景色、字体、旋转和阴影                                        |
| 构图骨架   | identity、CTA、footer 锁定；默认新块走按类型 first-fit 推荐尺寸；LG/hero 超过 2 个给软警告                        |
| 转化唯一性 | 继续执行 CTA=wechat 时隐藏 WECHAT 的现有规则；压紧发生在过滤之后，不能留下洞                                      |
| 可访问顺序 | 每次保存同步 `position`；CSS 不使用 dense 改变视觉顺序                                                            |

## 4. 公开页渲染实现

### 4.1 保留旧分支，新增服务端 BENTO 分支

公开查询给 Page 多取 `bentoVersion`，给 Block 多取 `placement`。渲染入口只做显式分支：

```tsx
const contentBlocks =
  cta?.type === 'wechat' ? page.blocks.filter((block) => block.type !== 'WECHAT') : page.blocks;

const content =
  page.bentoVersion === 1 ? (
    <BentoFlow blocks={resolveVisibleBentoLayout(contentBlocks)} uaClass={uaClass} />
  ) : (
    <ContentFlow blocks={contentBlocks} layout={page.layout} uaClass={uaClass} />
  );
```

`resolveVisibleBentoLayout` 是服务端纯函数。公开查询已经过滤 `isVisible=false`，CTA 又可能过滤 WECHAT（当前 `public-page.tsx:472-473`），所以它必须在两次过滤之后重新 compact；否则显式 y 会留下空洞。若数据库里有非法/缺失 placement，函数应按 `position` first-fit 到通栏安全布局并记录错误，而不是让公开页重叠或 500。

BENTO 中不要沿用“连续 LINK 自动合成 LinkGroup”的隐式结构；任意混排后这个 group 已没有稳定边界。LIST/GRID 原样保留 LinkGroup，BENTO 则让每个 LINK 成为独立 tile，整个网格用一个 `<section aria-label="页面内容">` 包裹。若产品以后需要多个可命名分组，应显式增加 SECTION 语义，而不是继续从相邻类型猜分组。

### 4.2 CSS Grid 与 SSR style

服务端只给每块输出四个 CSS 变量，不输出布局 JSON，也不做浏览器测量：

```tsx
type BentoStyle = React.CSSProperties & Record<`--b-${string}`, string | number>;

function BentoItem({ block, placement }: ResolvedBlock) {
  const style: BentoStyle = {
    '--b-col': placement.x + 1,
    '--b-row': placement.y + 1,
    '--b-w': placement.w,
    '--b-h': placement.h,
  };

  return (
    <div className={styles.bentoItem} style={style}>
      <PublicBlockView block={block} mode="bento" />
    </div>
  );
}
```

```css
.bentoGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: var(--bento-row-unit, 12px);
  gap: var(--gap);
  align-items: stretch;
}

.bentoItem {
  grid-column: var(--b-col) / span var(--b-w);
  grid-row: var(--b-row) / span var(--b-h);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.bentoItem > * {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.bentoItem .contentImage {
  height: 100%;
  object-fit: cover;
}
```

`themeStyle()` 可从现有 `theme.grid.gap` 的 px 值在服务端派生 `--bento-row-unit`；解析失败就回退 12px。BENTO 不使用 CSS `grid-auto-flow:dense`，因为位置已显式解决，且 dense 可能让视觉顺序越过 DOM 顺序。

各 block view 需补 BENTO 的填充样式：图片 `object-fit:cover`，文字按高度档 line-clamp，SOCIAL 根据有效高度换行，QR 保持正方形且不能裁码，WECHAT 的 copy button 始终可见。不要使用绝对定位把内容硬塞进 tile；只有外层 grid placement 是定位系统。

### 4.3 守住零框架 JS 与首屏预算

- `BentoFlow` 和 `PublicBlockView` 都保持 server-compatible，不加 `'use client'`；公开路由不得 import dnd-kit、布局编辑 store、ResizeObserver 或 react-grid-layout。
- 布局计算在查询后、SSR 前完成，结果直接是 HTML style + CSS module。公开页不需要 hydration、`window.innerWidth`、masonry 脚本或 `ResizeObserver`。
- 现有 `PUBLIC_INTERACTION_SCRIPT` 为 2,113 bytes 源码，布局功能对它的增量应为 **0 bytes**，继续低于简报的 5KB 上限。
- 每块四个短 CSS 变量即使按上限 50 块也只是约数 KB HTML；不把完整 placement 数组重复塞进 `<script>` 或 data attribute。
- 保留系统字体、图片 lazy loading、480px 限宽和现有主题 token。CSS module 的 BENTO gzip 增量建议设 CI 门槛 ≤2KB；公开路由的 client chunk 列表应与改造前做快照对比，布局改造不得新增 chunk。
- 首屏验收至少覆盖 320、375、480px；320 是比设计基准更严格的中文换行测试，480 验证桌面不出现第三列或另一套布局。

## 5. 实施拆解、风险与回滚

### 5.1 P0：兼容基线（先做，不能夹带视觉修复）

1. 为 8 个现有模板按其默认主题建立 320/375/480px Playwright 截图；另给连续 LINK 被非 LINK 打断的情况加结构测试。
2. 记录公开路由 HTML、CSS 和 client chunks；断言 interaction script ≤5KB。
3. 给 `normalizeBentoLayout` 写 bounds、overlap、push、compact、幂等性、确定性、隐藏块和 CTA/WECHAT 过滤测试。
4. 先上线 nullable 数据列和“能读 BENTO、旧分支不动”的 renderer，Studio 写入口仍由 feature flag 关闭。这是 expand-first 部署。

### 5.2 MVP 最小可用范围

- 仅内容区 Block 进入 BENTO；identity/CTA/footer 锁定。
- 4 微列、单一 375 布局源；无 desktop breakpoint、无像素坐标、无 overlap/层级/旋转。
- 七类 Block 全部可移动；IMAGE 可到 1 微列，其他内容至少 2 微列；尺寸受类型 preset 和 min/max 限制。
- 桌面 drag + 边/角 resize + 键盘；移动长按拖动 + bottom sheet preset + 四方向按钮。
- 转换前预览、取消零写入；手动保存；20 步本地 undo/redo。
- Page 布局开关与 placements 原子保存；服务端重新校验和 canonicalize；block id 保持稳定。
- 公开页纯 SSR+CSS；非法数据 first-fit 降级；旧 LIST/GRID 截图零 diff。

MVP 要验证的不是“用户能不能做任意海报”，而是：选择 BENTO 的用户是否更愿意完成移动/改尺寸并发布，且发布后的溢出率、撤销率和移动端误触是否可控。建议记录 opt-in、首次成功移动、resize、undo、布局校验失败和最终 publish 等 Studio 事件，不给公开页增加埋点脚本。

### 5.3 后续阶段

**阶段 1：质量与模板。** 根据真实操作热区调整尺寸 policy；为 8 个场景各做经视觉评审的 BENTO variant；增加一键“整理布局”、成对/通栏建议和更好的 overflow 修复提示。

**阶段 2：效率。** 多选、对齐/分布、复制布局、布局版本历史、跨模板套用；这些仍输出同一 `{x,y,w,h}`，不改变公开渲染协议。

**阶段 3：仅在产品改变 480px 战略后。** 再评估可选 `wide` placement。移动仍是必填真相，wide 只能覆盖；禁止让用户维护两套必填页面。绝对定位画布不进入该路线图。

### 5.4 主要风险与回滚点

| 风险                             | 防线                                               | 回滚点                                        |
| -------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| 旧 GRID 被“修规范”导致页面变形   | 老分支冻结 + 8 模板多视口截图                      | BENTO 分支独立删除/关闭，旧 CSS 无需回滚      |
| Page 已切 BENTO、blocks 尚未保存 | layout+blocks 单 API、单批事务；renderer first-fit | 清空 `bentoVersion` 即走旧 `layout`           |
| 隐藏块或 CTA 去重留下洞          | 过滤后再 compact，同一共享引擎                     | 降级 LIST；内容和 position 仍在               |
| 文本/二维码/按钮被固定高度裁掉   | 类型最小值、预览 overflow 检测、操作控件硬阻断发布 | 单页关闭 BENTO，不删 placement                |
| 拖动后 DOM/键盘顺序错乱          | 保存时按 y/x 重写 position，禁用 dense/order       | 旧渲染继续按 position 安全纵排                |
| 恶意 payload 重叠或制造超长页面  | Zod 边界、整页 overlap、最大 600 行、最多 50 块    | API 拒绝；公开 first-fit 防御                 |
| 保存导致 block id 和点击统计断裂 | diff update，API 回传并刷新真实 id                 | 可独立回滚 writer；不影响 renderer            |
| 新编辑器误触、性能差             | 只在把手 long-press、实际 375 canvas、50 块压测    | feature flag 关闭 Studio 入口，已发布页仍可读 |
| 需要回滚到旧应用版本             | `layout` 始终保持 LIST/GRID，新增列可被旧代码忽略  | 旧应用天然显示降级布局；不要 DROP 新列        |

发布顺序应是“数据库列 → 双读 renderer → BENTO writer → 模板”，回滚则逆向关闭 writer；不要回滚数据库列，也不要在已有 BENTO 数据时把 `layout` 写成旧客户端不认识的新 enum。这正是 `bentoVersion` 而非 `Layout.BENTO` 的价值。

核心主张一：选择 d——旧 LIST/GRID 原样保留，新增 4 微列、无重叠、会压紧的 BENTO v1，坚决不做绝对定位画布。
核心主张二：以 nullable `bentoVersion + placement JSON` 增量实现，375px 单布局源服务 320～480px，8 个模板和存量数据零回填、零变形。
核心主张三：dnd-kit 只负责输入，碰撞/压紧/顺序由共享纯函数负责；公开页只输出 SSR HTML + CSS Grid，布局新增框架 JS 为零。
