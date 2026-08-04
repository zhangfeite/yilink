import { type Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { db } from './db';

type BillingPlan = 'FREE' | 'PRO_MINI' | 'PRO';
type BillableProduct = 'pro_mini' | 'pro';
type JsonRecord = Record<string, unknown>;

interface UserLocator {
  customUserId: string | null;
  email: string | null;
}

interface BillableOrder {
  amountUsdCents: number;
  product: BillableProduct;
  providerOrderId: string;
  userLocator: UserLocator;
}

const PLAN_RANK: Record<BillingPlan, number> = {
  FREE: 0,
  PRO_MINI: 1,
  PRO: 2,
};

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function identifier(value: unknown): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return nonEmptyString(value);
}

function nonNegativeInteger(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }

  const text = nonEmptyString(value);
  if (!text || !/^\d+$/.test(text)) return null;

  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function planForProduct(product: string): BillingPlan {
  if (product === 'pro') return 'PRO';
  if (product === 'pro_mini') return 'PRO_MINI';
  return 'FREE';
}

function productForVariant(variantId: string): BillableProduct | null {
  const miniVariantId = process.env.LEMONSQUEEZY_VARIANT_MINI?.trim();
  const proVariantId = process.env.LEMONSQUEEZY_VARIANT_PRO?.trim();

  if (miniVariantId && variantId === miniVariantId) return 'pro_mini';
  if (proVariantId && variantId === proVariantId) return 'pro';
  return null;
}

function orderData(payload: JsonRecord): { attributes: JsonRecord; data: JsonRecord } {
  const data = asRecord(payload.data);
  const attributes = asRecord(data?.attributes);
  if (!data || !attributes) {
    throw new Error('LemonSqueezy order webhook payload is missing data.attributes');
  }

  return { data, attributes };
}

function orderLocator(meta: JsonRecord, attributes: JsonRecord): UserLocator {
  const customData = asRecord(meta.custom_data);
  const customUserId = nonEmptyString(customData?.user_id);
  const email = nonEmptyString(attributes.user_email)?.toLowerCase() ?? null;

  return { customUserId, email };
}

function parseBillableOrder(payload: JsonRecord, meta: JsonRecord): BillableOrder | null {
  const { data, attributes } = orderData(payload);
  const providerOrderId = identifier(data.id);
  if (!providerOrderId) {
    throw new Error('LemonSqueezy order webhook payload is missing data.id');
  }

  const firstOrderItem = asRecord(attributes.first_order_item);
  const variantId = identifier(firstOrderItem?.variant_id);
  if (!variantId) {
    console.warn('LemonSqueezy order is missing first_order_item.variant_id', { providerOrderId });
    return null;
  }

  const product = productForVariant(variantId);
  if (!product) {
    console.warn('LemonSqueezy order variant is not configured for a plan', {
      providerOrderId,
      variantId,
    });
    return null;
  }

  const amountUsdCents = nonNegativeInteger(attributes.total_usd);
  if (amountUsdCents === null) {
    throw new Error('LemonSqueezy order webhook payload has an invalid total_usd');
  }

  return {
    amountUsdCents,
    product,
    providerOrderId,
    userLocator: orderLocator(meta, attributes),
  };
}

async function findUserId(locator: UserLocator): Promise<string | null> {
  if (locator.customUserId) {
    const user = await db.user.findUnique({
      where: { id: locator.customUserId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  if (!locator.email) return null;
  const user = await db.user.findUnique({
    where: { email: locator.email },
    select: { id: true },
  });
  return user?.id ?? null;
}

function logUnassignedOrder(order: BillableOrder) {
  console.warn('LemonSqueezy order could not be attributed to a user', {
    providerOrderId: order.providerOrderId,
    customUserId: order.userLocator.customUserId,
    hasEmail: Boolean(order.userLocator.email),
  });
}

function toPrismaJson(payload: JsonRecord): Prisma.InputJsonObject {
  return payload as unknown as Prisma.InputJsonObject;
}

/**
 * D1 不支持交互式事务：读在事务外完成，写用批量事务 `$transaction([])`。
 * 幂等仍由 providerOrderId 唯一键兜底（读-判-写竞态时 P2002 走 catch 回收）。
 */
async function persistPaidOrder(order: BillableOrder, userId: string, payload: JsonRecord) {
  try {
    const existingOrder = await db.order.findUnique({
      where: { providerOrderId: order.providerOrderId },
      select: { id: true },
    });
    if (existingOrder) return;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!user) {
      throw new Error('LemonSqueezy order user disappeared before it could be persisted');
    }

    const purchasedPlan = planForProduct(order.product);
    const writes: Prisma.PrismaPromise<unknown>[] = [
      db.order.create({
        data: {
          userId,
          provider: 'lemonsqueezy',
          providerOrderId: order.providerOrderId,
          product: order.product,
          amountUsdCents: order.amountUsdCents,
          status: 'paid',
          raw: toPrismaJson(payload),
        },
      }),
    ];
    if (PLAN_RANK[purchasedPlan] > PLAN_RANK[user.plan]) {
      writes.push(
        db.user.update({
          where: { id: userId },
          data: { plan: purchasedPlan },
        }),
      );
    }
    await db.$transaction(writes);
  } catch (error) {
    // A concurrent delivery can lose the unique-key race after both observers
    // see no order. If the canonical row now exists, the webhook is handled.
    const existingOrder = await db.order.findUnique({
      where: { providerOrderId: order.providerOrderId },
      select: { id: true },
    });
    if (existingOrder) return;
    throw error;
  }
}

async function computeNextPlan(userId: string, excludeProviderOrderId?: string): Promise<BillingPlan> {
  const remainingOrders = await db.order.findMany({
    where: {
      userId,
      status: { not: 'refunded' },
      ...(excludeProviderOrderId ? { providerOrderId: { not: excludeProviderOrderId } } : {}),
    },
    select: { product: true },
  });
  return remainingOrders.reduce<BillingPlan>((highestPlan, remainingOrder) => {
    const candidatePlan = planForProduct(remainingOrder.product);
    return PLAN_RANK[candidatePlan] > PLAN_RANK[highestPlan] ? candidatePlan : highestPlan;
  }, 'FREE');
}

async function markOrderRefunded(providerOrderId: string) {
  const order = await db.order.findUnique({
    where: { providerOrderId },
    select: { userId: true },
  });
  if (!order) return false;

  const nextPlan = await computeNextPlan(order.userId, providerOrderId);
  await db.$transaction([
    db.order.update({
      where: { providerOrderId },
      data: { status: 'refunded' },
    }),
    db.user.update({
      where: { id: order.userId },
      data: { plan: nextPlan },
    }),
  ]);
  return true;
}

async function persistRefundedOrder(order: BillableOrder, userId: string, payload: JsonRecord) {
  try {
    const existingOrder = await db.order.findUnique({
      where: { providerOrderId: order.providerOrderId },
      select: { userId: true },
    });
    if (existingOrder) {
      await markOrderRefunded(order.providerOrderId);
      return;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new Error('LemonSqueezy refund user disappeared before it could be persisted');
    }

    const nextPlan = await computeNextPlan(user.id, order.providerOrderId);
    await db.$transaction([
      db.order.create({
        data: {
          userId,
          provider: 'lemonsqueezy',
          providerOrderId: order.providerOrderId,
          product: order.product,
          amountUsdCents: order.amountUsdCents,
          status: 'refunded',
          raw: toPrismaJson(payload),
        },
      }),
      db.user.update({
        where: { id: user.id },
        data: { plan: nextPlan },
      }),
    ]);
  } catch (error) {
    // A paid-order delivery can win the race after the initial lookup. Mark the
    // canonical row refunded rather than allowing a later replay to grant access.
    const existingOrder = await db.order.findUnique({
      where: { providerOrderId: order.providerOrderId },
      select: { id: true },
    });
    if (existingOrder) {
      await markOrderRefunded(order.providerOrderId);
      return;
    }
    throw error;
  }
}

/**
 * Verifies the exact raw request body sent by LemonSqueezy before it is parsed.
 */
export function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !/^[a-fA-F0-9]{64}$/.test(signature)) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/**
 * Applies a verified LemonSqueezy event. Unknown events are intentionally no-ops.
 */
export async function processLemonSqueezyWebhook(payload: unknown): Promise<void> {
  const root = asRecord(payload);
  const meta = asRecord(root?.meta);
  if (!root || !meta) {
    throw new Error('LemonSqueezy webhook payload is malformed');
  }

  const eventName = nonEmptyString(meta.event_name);
  if (eventName !== 'order_created' && eventName !== 'order_refunded') return;

  if (eventName === 'order_created') {
    const order = parseBillableOrder(root, meta);
    if (!order) return;

    const userId = await findUserId(order.userLocator);
    if (!userId) {
      logUnassignedOrder(order);
      return;
    }

    await persistPaidOrder(order, userId, root);
    return;
  }

  const { data } = orderData(root);
  const providerOrderId = identifier(data.id);
  if (!providerOrderId) {
    throw new Error('LemonSqueezy refund webhook payload is missing data.id');
  }

  const wasRecorded = await markOrderRefunded(providerOrderId);
  if (wasRecorded) return;

  // LemonSqueezy deliveries are retried independently. Persisting a refunded
  // order received first creates an idempotency tombstone, so a late
  // order_created delivery cannot restore access.
  const order = parseBillableOrder(root, meta);
  if (!order) return;

  const userId = await findUserId(order.userLocator);
  if (!userId) {
    logUnassignedOrder(order);
    return;
  }

  await persistRefundedOrder(order, userId, root);
}
