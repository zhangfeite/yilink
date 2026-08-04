# Spec-09：计费（LemonSqueezy 买断制）

> 工人：Codex（gpt-5.6-terra）｜验收：Claude 本体｜上位：[PRD](PRD.md) §10（$12/$25 终身、不做订阅、涨价保老价写进定价页）、architecture.md §3（Order 模型已建）
> 工区：**只许改** `apps/web/src/app/api/webhooks/lemonsqueezy/route.ts`（新建）、`apps/web/src/lib/billing.ts`（新建）、`apps/web/src/app/studio/settings/**`（把占位页做成账户页）、`packages/shared/src/plan.ts`（新建+index 导出）、`apps/web/.env.example` + 对应测试。**禁止**：动其他 API、依赖锁文件、docs、prisma、git commit。

## 1. 套餐模型（packages/shared/src/plan.ts）

```ts
PLAN_LIMITS = { FREE: { pages: 3 }, PRO_MINI: { pages: 10 }, PRO: { pages: Infinity } }
PLAN_NAMES_ZH = { FREE: '免费版', PRO_MINI: '基础买断', PRO: '完整买断' }
```
建页上限改为按 `user.plan` 读 `PLAN_LIMITS`（现 FREE_PAGE_LIMIT 硬编码处替换，保留原常量并标注 deprecated 以免破坏既有测试引用）。

## 2. Webhook `POST /api/webhooks/lemonsqueezy`

- 校验 `X-Signature`（HMAC-SHA256，密钥 `LEMONSQUEEZY_WEBHOOK_SECRET`；缺密钥时接口直接 503，防裸奔）
- `order_created`：从 `meta.custom_data.user_id` 定位用户（无则按 `data.attributes.user_email` 小写匹配）；按 `first_order_item.variant_id` 映射套餐（env `LEMONSQUEEZY_VARIANT_MINI` / `LEMONSQUEEZY_VARIANT_PRO`）；落 `Order`（providerOrderId 幂等去重）+ 升级 `user.plan`（只升不降：PRO 用户收到 MINI 单不降级）
- `order_refunded`：Order 标 refunded + 用户降回 FREE（除非另有未退款订单）
- 未知事件 200 忽略；签名错 401；处理失败 500（LS 会重试）

## 3. 设置页（/studio/settings）

- 展示当前套餐、主页配额使用（n/limit）、已购订单列表
- 升级区：两档买断卡片（价格文案从 env `NEXT_PUBLIC_PRICE_MINI/PRO` 读，默认 $12/$25），按钮跳 `LEMONSQUEEZY_CHECKOUT_URL_MINI/PRO`（拼 `?checkout[custom][user_id]={id}` 实现精确归户）；env 未配置时整个升级区隐藏（自部署实例不显示商业内容）
- 页脚一行信任承诺：「买断即终身，功能只增不减；涨价永远对老用户保价。」

## 4. 测试与验收

- vitest ≥10：签名校验（对/错/缺密钥 503）；order_created 归户（custom_data/email/找不到→200 但落日志）；幂等（同 providerOrderId 重放不重复升级）；变体映射；只升不降；退款降级；页配额按 plan 生效（PRO_MINI 建第 4 页成功、FREE 失败）
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；`git status --short` 贴报告；.env.example 新增变量全部带中文注释
