# 一链 YiLink · 技术架构 v1

> 2026-08-04 ｜ 配套 [PRD v0.2](PRD.md) ｜ 负责人：Claude 本体（架构与验收）
> 本文是所有 `docs/spec-*.md` 的上位文档；规格与本文冲突时以本文为准并回改。

---

## 1. 总览

```
                    ┌─ 控制台域名 (console.yilink.example) ─┐
访客/创作者 ──────► │  Next.js (App Router, SSR)             │
                    │  ├ /            营销页                  │
                    │  ├ /studio/**   编辑器（登录后）        │
                    │  ├ /api/v1/**   REST API               │
                    │  └ /api/e       统计事件采集            │
                    └────────────────────────────────────────┘
                    ┌─ 主页承载域名 (yilink-pages.example) ──┐
访客 ─────────────► │  /{slug}  公开主页（SSR + 缓存标签）    │
                    └────────────────────────────────────────┘
                         │ Prisma
                    SQLite（自部署默认）/ PostgreSQL（托管）
                         │
              可插拔外围：审核 Provider（本地词库/阿里云/腾讯云）
                          计费 Webhook（LemonSqueezy）
```

- **一个应用、两种域名角色**：控制台域名与主页承载域名分离（PRD §7 故障隔离）。middleware 按 `Host` 头路由：命中 `PAGES_HOST` 时 rewrite 到 `/p/[slug]` 渲染树，其余走控制台。自部署未配置 `PAGES_HOST` 时两种角色共用同一 host（单域模式）。
- **单容器可跑全部**：自部署 = 一个 Next.js 容器 + 一个 SQLite 文件。不引入 Redis / 队列 / 对象存储（图片 MVP 存本地卷，托管版换 S3 兼容存储，接口抽象 `StorageProvider`）。

## 2. Monorepo 结构（pnpm workspaces）

```
yilink/
├─ apps/web/                 # Next.js 主应用（控制台 + 公开页 + API）
├─ packages/shared/          # zod schemas、Block 类型定义、常量、工具
├─ packages/icons/           # 国内+海外平台图标体系（独立发包引流）
├─ packages/moderation/      # 审核 Provider 接口 + local-words 默认实现 + 云厂商 adapter
├─ docs/                     # PRD / 架构 / 规格 / 调研
└─ docker/                   # Dockerfile、docker-compose.yml
```

## 3. 关键技术决策

| 决策 | 选择 | 理由（关键约束） |
|---|---|---|
| 框架 | Next.js App Router + TypeScript strict | SSR 是微信分享卡片/SEO 硬需求；三大 MIT 代码矿全是 React 系；小程序未来走 Taro（React 语法） |
| ORM/DB | Prisma；SQLite 默认，`DATABASE_URL` 切 Postgres | 自部署零依赖；托管平滑迁移 |
| 认证 | Auth.js v5：Credentials(邮箱+bcrypt) + GitHub OAuth（env 才启用）；手机号短信作为 Provider 预留（国内托管版接阿里云短信） | 自部署无外部依赖；国内实名要求以 Provider 插槽满足 |
| i18n | next-intl，zh-CN 默认 + en | 双社区策略 |
| 公开页性能 | SSR + `revalidateTag('page:{slug}')`，发布/编辑时失效；公开页零框架 JS（仅 ≤5KB 内联脚本：统计 beacon + 复制微信号），图片 lazy | 微信 X5 首屏 < 1s 预算（PRD §6） |
| 统计 | 自研：`POST /api/e` 写原始事件表 → 每日聚合 `DailyStat`；UV 用 ipHash（日盐）；不引入第三方统计 | PIPL 最小必要；参考 librelinks（MIT） |
| 二维码/海报 | 服务端：`qrcode` 生成 SVG/PNG；海报 satori(JSX→SVG) + resvg → PNG；中文字体打包思源黑体子集（OFL 协议） | 与主题 token 共用设计系统 |
| 审核 | `ModerationProvider` 接口：`check(payload) → {verdict, labels}`；默认 local-words；aliyun/tencent adapter；托管版另加 URL 域名黑名单 + 落地页抓取钩子 | 开源版不绑云厂商（PRD §4.1） |
| 计费 | LemonSqueezy（MoR 代缴税、买断制一次性商品、webhook 简单）；`Order` 表落账 → `User.plan` 升级；若日后需要支付宝通道再评估 Paddle | 托管版第一天就做（评审决议 2） |
| 测试 | vitest 单测 + Playwright E2E（注册→建页→发布→访问 happy path） | 铁律 3：测试跑通才算完成 |
| License 红线 | 依赖与搬运代码仅限 MIT/Apache/BSD/ISC/CC0；**AGPL/GPL 依赖禁止**（LinkStack 代码一行不进仓库） | PRD §8.2，写进 CONTRIBUTING |

## 4. 数据模型（Prisma，v1 冻结）

```prisma
model User {
  id           String   @id @default(cuid())
  email        String?  @unique
  phone        String?  @unique
  passwordHash String?
  githubId     String?  @unique
  name         String?
  plan         Plan     @default(FREE)      // FREE | PRO_MINI | PRO（买断）
  role         Role     @default(USER)      // USER | ADMIN
  trustLevel   Int      @default(0)         // 新号信任分级（PRD §7）
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  pages        Page[]
  orders       Order[]
}
enum Plan { FREE PRO_MINI PRO }
enum Role { USER ADMIN }

model Page {
  id           String     @id @default(cuid())
  userId       String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  slug         String     @unique             // 主页路径，全局唯一，3-30 位小写字母数字连字符
  title        String
  bio          String?
  avatarUrl    String?
  layout       Layout     @default(LIST)
  themeId      String     @default("minimal-light")
  themeConfig  Json?                          // 主题覆写（预留）
  seoTitle     String?
  seoDesc      String?
  status       PageStatus @default(DRAFT)     // DRAFT | PUBLISHED | HIDDEN
  hiddenReason String?                        // 违规先隐藏不羞辱（PRD §5）
  publishedAt  DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  blocks       Block[]
  @@index([userId])
}
enum Layout { LIST GRID }
enum PageStatus { DRAFT PUBLISHED HIDDEN }

model Block {
  id        String    @id @default(cuid())
  pageId    String
  page      Page      @relation(fields: [pageId], references: [id], onDelete: Cascade)
  type      BlockType
  position  Int
  size      BlockSize @default(MD)            // 简化网格：SM/MD/LG（LIST 布局忽略）
  isVisible Boolean   @default(true)
  config    Json                              // 按 type 用 packages/shared 的 zod schema 校验
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  @@index([pageId, position])
}
enum BlockType { LINK SOCIAL TEXT IMAGE WECHAT QR DIVIDER }
enum BlockSize { SM MD LG }

model ClickEvent {
  id        BigInt   @id @default(autoincrement())
  pageId    String
  blockId   String?
  kind      EventKind // VIEW | CLICK
  tsBucket  DateTime  // 事件时间截断到小时
  uaClass   String?   // wechat|weibo|qq|douyin|browser|bot
  refClass  String?   // 来源平台粗分
  ipHash    String?   // sha256(ip + 当日盐)，不存原始 IP
  createdAt DateTime @default(now())
  @@index([pageId, tsBucket])
}
enum EventKind { VIEW CLICK }

model DailyStat {
  id      String   @id @default(cuid())
  pageId  String
  date    DateTime // 日期（UTC 日截断）
  views   Int      @default(0)
  uniques Int      @default(0)
  clicks  Int      @default(0)
  byBlock Json?
  byRef   Json?
  @@unique([pageId, date])
}

model ModerationRecord {
  id         String   @id @default(cuid())
  targetType String   // page | block | image
  targetId   String
  provider   String   // local-words | aliyun | tencent | manual
  verdict    String   // pass | review | block
  detail     Json?
  reviewedBy String?
  createdAt  DateTime @default(now())
  @@index([targetType, targetId])
}

model Order {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  provider        String   // lemonsqueezy
  providerOrderId String   @unique
  product         String   // pro_mini | pro
  amountUsdCents  Int
  status          String   // paid | refunded
  raw             Json?
  createdAt       DateTime @default(now())
}

model Setting {
  key   String @id  // multiUser | moderationProviders | pagesHost …实例级配置
  value Json
}
```

**Block config（zod，`packages/shared`）**：
- `LINK { title, url, desc?, thumbUrl? }`
- `SOCIAL { items: [{ platform, url }] }`（platform 取 `packages/icons` 的 id）
- `TEXT { markdown }`（渲染白名单：加粗/斜体/链接/列表）
- `IMAGE { url, alt?, href? }`
- `WECHAT { wechatId, qrImageUrl? }`（一键复制 + 长按识别）
- `QR { imageUrl, label? }`
- `DIVIDER {}`

## 5. API surface（/api/v1，zod 校验，错误统一 `{error:{code,message}}`）

| 端点 | 方法 | 说明 |
|---|---|---|
| /auth/* | — | Auth.js 托管（register 为自定义 route） |
| /me | GET/PATCH | 当前用户 |
| /me/export | GET | 全量数据导出 JSON（信任承诺） |
| /pages | GET/POST | 我的主页列表/新建 |
| /pages/:id | GET/PATCH/DELETE | 单页元信息（含 layout/theme/seo） |
| /pages/:id/blocks | PUT | 区块全量批量保存（编辑器保存粒度） |
| /pages/:id/publish | POST | 发布（触发审核管道 → 通过则 PUBLISHED + revalidateTag） |
| /pages/:id/stats | GET | 汇总 + 近 30 天曲线 + 分区块点击 |
| /pages/:id/qr | GET | 页面二维码 PNG/SVG（?logo=1） |
| /pages/:id/poster | GET | 分享海报 PNG（?template=t1） |
| /e | POST | 统计事件（beacon；无鉴权，限速） |
| /admin/users, /admin/moderation | GET/POST | 多用户模式管理后台（隐藏/恢复/申诉处理） |
| /webhooks/lemonsqueezy | POST | 计费回调（签名校验 → Order → plan 升级） |

## 6. 公开页渲染要点（微信内是第一场景）

1. `<head>`：og:title/og:image（头像）/description 齐全——微信/QQ 会话内分享卡片依赖 og 标签兜底；接入方若配了公众号 JS-SDK 再增强（V1.x）。
2. 无诱导话术组件；UI 不模仿微信原生样式（外链规范 2.16）。
3. UA=micromessenger 时：App 下载类链接自动降级为「复制链接」；正常链接直接跳转。域名异常期的浏览器引导遮罩由 `Setting.degradeMode` 开关控制，默认关。
4. 简化网格规范：移动 375px 基准 2 列 grid，`SM`=1 列 × 1 行（紧凑行高），`MD`=1 列 × 2 行，`LG`=跨 2 列；间距 token 由主题控制；桌面端容器限宽 480px 居中（保持手机版式，对齐 Bento 观感）。
5. 主题 = 设计 token JSON（palette/background/font/radius/buttonStyle），`packages/shared` 定义 schema，`docs/design/themes.json` 为首批 8 套（spec-02 产出后并入 `apps/web`）。其上还有**场景模板层**（主题 × 版式 × 预置区块与文案骨架，静态 JSON 资产，见 [template-system.md](design/template-system.md)）——onboarding 与渲染器（spec-05）按此实装。

## 7. 部署形态矩阵

| 形态 | 开关 | 合规责任 |
|---|---|---|
| 自部署·单用户（默认） | `MULTI_USER=false` | 部署者个人页面，无 UGC 义务；文档提示境内需自行备案 |
| 自部署·多用户 | `MULTI_USER=true` | 文档明示企业备案 + 审核义务，管理后台可用 |
| 托管·海外（M3 上线） | 多用户 + LemonSqueezy + S3 存储 | Vercel/Cloudflare 部署，不受境内备案约束 |
| 托管·国内（M4，随备案） | 多用户 + 短信实名 + 双云审核全开 | 现有公司主体 ICP/公安备案；收费前办 B25 |

## 8. 规格拆解与分派计划

| 规格 | 内容 | 工人 | 状态 |
|---|---|---|---|
| [spec-01](spec-01-scaffold.md) | Monorepo 脚手架：应用壳/Prisma/Auth/i18n/Docker/CI | Codex sol | **已派发** |
| [spec-02](spec-02-themes.md) | 8 套主题 token + 网格视觉规范 + 预览页 | Kimi K3 | v1 交付但视觉被否决，**返工 → [spec-02b](spec-02b-themes-v2.md)**（设计法则见 [design-direction.md](design/design-direction.md)，约束后续一切视觉产出） |
| [spec-03](spec-03-icons-metadata.md) | 平台图标元数据草稿（42 平台） | DeepSeek Flash | **已派发**（产出仅作草稿，需人工核色） |
| spec-04 | 编辑器（区块 CRUD/拖拽/尺寸/移动端） | Codex | 待脚手架合入 |
| spec-05 | 公开页渲染器（列表+网格+主题+微信适配） | Codex | 待 spec-02 产出 |
| spec-06 | 统计管道（采集/聚合/报表/导出） | Codex | 待脚手架合入 |
| spec-07 | 二维码 + 海报生成 | Codex | 待 spec-02 产出 |
| spec-08 | 审核管道 + 管理后台 | Codex | 待脚手架合入 |
| spec-09 | 计费（LemonSqueezy）+ 套餐门控 | Codex | 待脚手架合入 |
| spec-10 | packages/icons 实装（simple-icons 底座 + 自绘缺口） | Codex + 人工审 | 待 spec-03 核验 |

流程（按 CLAUDE.md 铁律）：每个 spec 附精确文件清单与验收命令；工人交付后 Claude 本体跑验收 + 评审；重要模块 Codex↔Claude 交叉评审 ≤2 轮；并行 Codex ≤4（`--ephemeral`）。
