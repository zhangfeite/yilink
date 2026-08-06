import { createHmac } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../../../../lib/db';
import { POST } from './route';

const webhookSecret = 'test-webhook-secret';
const miniVariantId = 'variant-mini';
const proVariantId = 'variant-pro';

const originalEnv = {
  webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
  miniVariantId: process.env.LEMONSQUEEZY_VARIANT_MINI,
  proVariantId: process.env.LEMONSQUEEZY_VARIANT_PRO,
};

type Plan = 'FREE' | 'PRO_MINI' | 'PRO';

interface UserOptions {
  email?: string;
  id?: string;
  plan?: Plan;
}

interface WebhookOptions {
  email?: string;
  eventName?: string;
  orderId?: string;
  total?: number;
  totalUsd?: number;
  userId?: string;
  variantId?: string;
}

async function clearDatabase() {
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

async function createUser({
  id = 'billing-user',
  email = `${id}@example.com`,
  plan = 'FREE',
}: UserOptions = {}) {
  return db.user.create({
    data: { id, email, plan },
  });
}

function webhookPayload({
  email = 'buyer@example.com',
  eventName = 'order_created',
  orderId = 'order-1',
  total = 1200,
  totalUsd = total,
  userId,
  variantId = miniVariantId,
}: WebhookOptions = {}) {
  return {
    meta: {
      event_name: eventName,
      custom_data: userId ? { user_id: userId } : {},
    },
    data: {
      id: orderId,
      attributes: {
        user_email: email,
        total,
        total_usd: totalUsd,
        first_order_item: { variant_id: variantId },
        created_at: '2026-08-06T12:34:56.000Z',
      },
    },
  };
}

function signedRequest(payload: unknown, secret = webhookSecret) {
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  return new Request('http://localhost/api/webhooks/lemonsqueezy', {
    method: 'POST',
    headers: { 'x-signature': signature },
    body,
  });
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

describe('/api/webhooks/lemonsqueezy', () => {
  beforeEach(async () => {
    await clearDatabase();
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = webhookSecret;
    process.env.LEMONSQUEEZY_VARIANT_MINI = miniVariantId;
    process.env.LEMONSQUEEZY_VARIANT_PRO = proVariantId;
  });

  afterEach(() => {
    restoreEnv('LEMONSQUEEZY_WEBHOOK_SECRET', originalEnv.webhookSecret);
    restoreEnv('LEMONSQUEEZY_VARIANT_MINI', originalEnv.miniVariantId);
    restoreEnv('LEMONSQUEEZY_VARIANT_PRO', originalEnv.proVariantId);
  });

  it('accepts a correctly signed webhook and attributes it by custom user id', async () => {
    const user = await createUser();

    const response = await POST(signedRequest(webhookPayload({ userId: user.id })));

    expect(response.status).toBe(200);
    await expect(db.order.findMany()).resolves.toMatchObject([
      {
        userId: user.id,
        provider: 'lemonsqueezy',
        providerOrderId: 'order-1',
        product: 'pro_mini',
        amountUsdCents: 1200,
        status: 'paid',
      },
    ]);
    await expect(db.user.findUnique({ where: { id: user.id } })).resolves.toMatchObject({
      plan: 'PRO_MINI',
    });
  });

  it('stores only the compact operational fields in Order.raw', async () => {
    const user = await createUser();

    const response = await POST(
      signedRequest(webhookPayload({ userId: user.id, orderId: 'compact-raw-order' })),
    );

    expect(response.status).toBe(200);
    await expect(
      db.order.findUnique({ where: { providerOrderId: 'compact-raw-order' } }),
    ).resolves.toMatchObject({
      raw: {
        orderId: 'compact-raw-order',
        variantId: miniVariantId,
        amountUsdCents: 1200,
        emailDomain: 'example.com',
        eventName: 'order_created',
        eventTime: '2026-08-06T12:34:56.000Z',
      },
    });
  });

  it('rejects a webhook with an invalid signature', async () => {
    const user = await createUser();
    const body = webhookPayload({ userId: user.id });

    const response = await POST(signedRequest(body, 'wrong-secret'));

    expect(response.status).toBe(401);
    await expect(db.order.count()).resolves.toBe(0);
  });

  it('returns 503 when the webhook secret is absent', async () => {
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    const response = await POST(signedRequest(webhookPayload()));

    expect(response.status).toBe(503);
  });

  it('falls back to a lower-cased email when custom user id is absent', async () => {
    const user = await createUser({ id: 'email-user', email: 'buyer@example.com' });

    const response = await POST(
      signedRequest(webhookPayload({ email: 'BUYER@EXAMPLE.COM', orderId: 'email-order' })),
    );

    expect(response.status).toBe(200);
    await expect(
      db.order.findUnique({ where: { providerOrderId: 'email-order' } }),
    ).resolves.toMatchObject({ userId: user.id });
  });

  it('acknowledges an unassigned order and records a warning', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const response = await POST(signedRequest(webhookPayload({ orderId: 'orphan-order' })));

      expect(response.status).toBe(200);
      expect(warning).toHaveBeenCalledWith(
        'LemonSqueezy order could not be attributed to a user',
        expect.objectContaining({
          providerOrderId: 'orphan-order',
          hasEmail: true,
        }),
      );
      await expect(db.order.count()).resolves.toBe(0);
    } finally {
      warning.mockRestore();
    }
  });

  it('does not create another order or reprocess a replayed provider order id', async () => {
    const user = await createUser();
    const request = () =>
      signedRequest(webhookPayload({ userId: user.id, orderId: 'replay-order' }));

    expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(200);
    await expect(db.order.count({ where: { providerOrderId: 'replay-order' } })).resolves.toBe(1);
    await expect(db.user.findUnique({ where: { id: user.id } })).resolves.toMatchObject({
      plan: 'PRO_MINI',
    });
  });

  it('maps the configured PRO variant to the complete lifetime plan', async () => {
    const user = await createUser();

    const response = await POST(
      signedRequest(
        webhookPayload({ userId: user.id, orderId: 'pro-order', variantId: proVariantId }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(
      db.order.findUnique({ where: { providerOrderId: 'pro-order' } }),
    ).resolves.toMatchObject({ product: 'pro' });
    await expect(db.user.findUnique({ where: { id: user.id } })).resolves.toMatchObject({
      plan: 'PRO',
    });
  });

  it('records USD cents rather than a non-USD order total', async () => {
    const user = await createUser();

    const response = await POST(
      signedRequest(
        webhookPayload({
          userId: user.id,
          orderId: 'foreign-currency-order',
          total: 1859.76,
          totalUsd: 2016,
        }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(
      db.order.findUnique({ where: { providerOrderId: 'foreign-currency-order' } }),
    ).resolves.toMatchObject({ amountUsdCents: 2016 });
  });

  it('never downgrades a PRO user when a MINI order arrives', async () => {
    const user = await createUser({ plan: 'PRO' });

    const response = await POST(
      signedRequest(webhookPayload({ userId: user.id, orderId: 'mini-after-pro' })),
    );

    expect(response.status).toBe(200);
    await expect(db.user.findUnique({ where: { id: user.id } })).resolves.toMatchObject({
      plan: 'PRO',
    });
  });

  it('marks a refunded order and returns the user to FREE with no paid orders left', async () => {
    const user = await createUser({ plan: 'PRO_MINI' });
    await db.order.create({
      data: {
        userId: user.id,
        provider: 'lemonsqueezy',
        providerOrderId: 'refund-order',
        product: 'pro_mini',
        amountUsdCents: 1200,
        status: 'paid',
      },
    });

    const response = await POST(
      signedRequest(webhookPayload({ eventName: 'order_refunded', orderId: 'refund-order' })),
    );

    expect(response.status).toBe(200);
    await expect(
      db.order.findUnique({ where: { providerOrderId: 'refund-order' } }),
    ).resolves.toMatchObject({ status: 'refunded' });
    await expect(db.user.findUnique({ where: { id: user.id } })).resolves.toMatchObject({
      plan: 'FREE',
    });
  });

  it('retains the highest remaining paid plan after a refund', async () => {
    const user = await createUser({ plan: 'PRO' });
    await db.order.createMany({
      data: [
        {
          userId: user.id,
          provider: 'lemonsqueezy',
          providerOrderId: 'refunded-pro-order',
          product: 'pro',
          amountUsdCents: 2500,
          status: 'paid',
        },
        {
          userId: user.id,
          provider: 'lemonsqueezy',
          providerOrderId: 'remaining-mini-order',
          product: 'pro_mini',
          amountUsdCents: 1200,
          status: 'paid',
        },
      ],
    });

    const response = await POST(
      signedRequest(webhookPayload({ eventName: 'order_refunded', orderId: 'refunded-pro-order' })),
    );

    expect(response.status).toBe(200);
    await expect(db.user.findUnique({ where: { id: user.id } })).resolves.toMatchObject({
      plan: 'PRO_MINI',
    });
  });

  it('keeps a refund delivered before order creation from granting access on a later replay', async () => {
    const user = await createUser();
    const refund = () =>
      signedRequest(
        webhookPayload({
          eventName: 'order_refunded',
          orderId: 'refund-before-create',
          userId: user.id,
        }),
      );
    const created = () =>
      signedRequest(webhookPayload({ orderId: 'refund-before-create', userId: user.id }));

    expect((await POST(refund())).status).toBe(200);
    expect((await POST(created())).status).toBe(200);
    await expect(
      db.order.findUnique({ where: { providerOrderId: 'refund-before-create' } }),
    ).resolves.toMatchObject({ status: 'refunded' });
    await expect(db.user.findUnique({ where: { id: user.id } })).resolves.toMatchObject({
      plan: 'FREE',
    });
  });

  it('acknowledges unknown events without changing billing data', async () => {
    const response = await POST(
      signedRequest(
        webhookPayload({ eventName: 'subscription_created', orderId: 'ignored-order' }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(db.order.count()).resolves.toBe(0);
  });
});
