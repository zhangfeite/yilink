# spec-17：发布就绪度（统计面板 UI + 数据导出入口）

> 派单对象：Codex（gpt-5.6-sol）
> 背景文档：[launch-fact-check.md](launch-fact-check.md) 第 1、2 条
> 目标：把两个**后端已完备、前端零入口**的能力接出来。这两条都是发布物料里的公开承诺，
> 不做就必须从文案删除，而它们恰好是「数据自主」这个信任叙事的核心，删了产品定位就塌一角。

## 工作区隔离

**只允许改动**：
- `apps/web/src/app/studio/data/page.tsx`
- `apps/web/src/components/studio/`（可新建文件）
- `apps/web/src/app/studio/settings/page.tsx`
- `apps/web/src/i18n/zh-CN.json`、`apps/web/src/i18n/en.json`（如存在）
- 上述文件对应的 `*.test.ts(x)`

**禁止改动**：`packages/`、`prisma/`、任何 `app/api/` 路由、`app/p/`、`public-page*`、
`next.config.ts`、`e2e/`、图标与主题数据。后端 API 已就绪，**不要动它们**。

## 任务 A：统计面板 UI

### 现状
- API `GET /api/v1/pages/[id]/stats` 已可用，鉴权与所有权校验完备，返回
  `{ views, uniques, clicks, daily: [{ date, views, uniques, clicks }] }`（近 30 天，
  含当日实时值；实现见 `apps/web/src/lib/stats.ts` 的 `getRecentPageStats`）。
- `apps/web/src/app/studio/data/page.tsx` 目前只渲染两行静态文案，
  i18n key `Studio.dataDescription` 写着「统计面板将在后续版本开放」。
- **该 API 目前没有任何前端调用方**（全仓 grep 零命中）。

### 要求
1. `/studio/data` 改成真实数据页：
   - 服务端取当前用户的全部主页（`deletedAt: null`），按更新时间倒序；
   - 无主页时给空状态：一句话 + 指向 `/studio` 的「去创建第一个主页」按钮；
   - 有主页时默认选中第一个，允许切换（原生 `<select>` 即可，不要引入新依赖）；
   - 展示三个汇总数字（浏览 / 独立访客 / 点击）与近 30 天日趋势。
2. **趋势图用纯 CSS/SVG 手写，不要引入任何图表库**。这个项目对包体有硬纪律
   （公开页零框架 JS）。一个 30 根柱子的 SVG 柱状图足够，需带：
   - 每根柱子的 `<title>` 或 `aria-label` 说明「几月几日：N 次浏览」；
   - 全零数据时不要画空图，给「还没有数据」的说明；
   - 深浅色都要能看（沿用 Tailwind slate 色阶，与 studio 其余页面一致）。
3. 数据获取方式：服务端组件直接调 `getRecentPageStats`（`@/lib/stats`），
   **不要**在客户端 fetch 自己的 API——多一次往返且要处理鉴权态。
4. 更新 i18n：删掉「将在后续版本开放」，补齐新文案 key。中文文案要克制、具体，
   不要用「强大」「全面」这类形容词。

### 验收判据
- `/studio/data` 在有页/无页/有页但零数据三种状态下都不报错、都有合理呈现；
- 未登录访问 `/studio/data` 仍被 `studio/layout.tsx` 拦到 `/login`（不要绕过它）；
- 只能看到自己的主页数据（沿用现有 `where: { userId }` 约束）；
- 新增组件有单测：至少覆盖「零数据不画图」「30 天数据渲染 30 根柱子」两条。

## 任务 B：数据导出入口

### 现状
- API `GET /api/v1/me/export` 已可用，返回 `{ user, pages: [...blocks] }`，
  带 `Content-Disposition: attachment; filename="yilink-export.json"`。
- studio 全站**没有任何触发它的 UI**。

### 要求
1. 在 `/studio/settings` 增加「数据导出」区块，与现有「当前账户套餐」「订单」区块同级样式；
2. 一个链接/按钮触发下载即可（`<a href="/api/v1/me/export" download>` 最简单可靠，
   不要写 fetch + blob 那一套，浏览器原生下载对 Safari/微信内置浏览器兼容性更好）；
3. 旁边一句说明：导出的是什么、包含哪些内容、这是产品的公开承诺（「随时打包走人」）；
4. 不要加二次确认弹窗——导出是无损操作，加确认只是摩擦。

### 验收判据
- 设置页可见该区块，点击真的下载到 JSON 文件；
- 未登录访问该 API 仍返回 401（不要动 API）。

## 全局纪律

- 跑通 `pnpm --filter @yilink/web typecheck`、`pnpm lint`、`pnpm --filter @yilink/web test`；
- **分段落盘 + 进度信标**：每完成一个任务就写盘并把一行进度追加到
  `/tmp/codex-spec17-beacon.txt`（格式 `[时间] 任务X 完成：改了哪些文件`），不要憋到最后一起提交；
- 不要改动上面「禁止改动」清单里的任何文件；
- 不要新增 npm 依赖；
- 中文注释只写「为什么」，不写「这行做了什么」。
