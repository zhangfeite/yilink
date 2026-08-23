import { PLAN_LIMITS, PLAN_NAMES_ZH, PLAN_QUOTA_NOTE_ZH } from '@yilink/shared';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

function checkoutUrl(value: string | undefined, userId: string): string | null {
  const rawUrl = value?.trim();
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') return null;
    url.searchParams.set('checkout[custom][user_id]', userId);
    return url.toString();
  } catch {
    return null;
  }
}

function orderProductName(product: string): string {
  if (product === 'pro') return PLAN_NAMES_ZH.PRO;
  if (product === 'pro_mini') return PLAN_NAMES_ZH.PRO_MINI;
  return product;
}

function orderStatusName(status: string): string {
  return status === 'refunded' ? '已退款' : '已支付';
}

function orderAmount(amountUsdCents: number): string {
  return `$${(amountUsdCents / 100).toFixed(2)}`;
}

export default async function StudioSettingsPage() {
  const t = await getTranslations('Studio');
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      plan: true,
      _count: { select: { pages: true } },
      orders: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          product: true,
          amountUsdCents: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
  if (!user) redirect('/login');

  const pageLimit = PLAN_LIMITS[user.plan].pages;
  const quota = String(pageLimit);
  const miniCheckoutUrl = checkoutUrl(process.env.LEMONSQUEEZY_CHECKOUT_URL_MINI, user.id);
  const proCheckoutUrl = checkoutUrl(process.env.LEMONSQUEEZY_CHECKOUT_URL_PRO, user.id);
  const checkoutUrls =
    miniCheckoutUrl && proCheckoutUrl ? { mini: miniCheckoutUrl, pro: proCheckoutUrl } : null;
  const miniPrice = process.env.NEXT_PUBLIC_PRICE_MINI?.trim() || '$12';
  const proPrice = process.env.NEXT_PUBLIC_PRICE_PRO?.trim() || '$25';

  return (
    <section className="mx-auto w-full max-w-5xl">
      <header>
        <p className="text-caption font-semibold tracking-wide text-accent">{t('settingsTitle')}</p>
        <h1 className="mt-2 text-display text-ink">账户与套餐</h1>
        <p className="mt-3 text-body text-muted">管理你的主页配额与买断订单。</p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="当前账户套餐">
        <article className="rounded-card bg-card p-6 shadow-card">
          <p className="text-caption font-semibold text-muted">当前套餐</p>
          <p className="mt-3 text-section text-ink">{PLAN_NAMES_ZH[user.plan]}</p>
        </article>
        <article className="rounded-card bg-card p-6 shadow-card">
          <p className="text-caption font-semibold text-muted">主页配额使用</p>
          <p className="mt-3 text-section text-ink">
            {user._count.pages}/{quota}
          </p>
        </article>
      </section>
      <p className="mt-3 text-center text-caption text-muted">{PLAN_QUOTA_NOTE_ZH}</p>

      <section className="mt-8" aria-labelledby="data-export-heading">
        <article className="rounded-card bg-card p-6 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div>
            <p className="text-caption font-semibold tracking-wide text-accent">
              {t('dataExportEyebrow')}
            </p>
            <h2 className="mt-1 text-section text-ink" id="data-export-heading">
              {t('dataExportTitle')}
            </h2>
            <p className="mt-3 max-w-2xl text-body text-muted">{t('dataExportDescription')}</p>
          </div>
          <a
            className="mt-5 inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-card px-5 text-body font-semibold text-ink sm:mt-0"
            download
            href="/api/v1/me/export"
          >
            {t('dataExportAction')}
          </a>
        </article>
      </section>

      <section className="mt-8" aria-labelledby="orders-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-caption font-semibold tracking-wide text-accent">订单</p>
            <h2 className="mt-1 text-section text-ink" id="orders-heading">
              已购订单
            </h2>
          </div>
          <span className="rounded-full bg-card-muted px-3 py-1.5 text-caption font-semibold text-muted">
            {user.orders.length} 笔
          </span>
        </div>

        {user.orders.length === 0 ? (
          <p className="mt-4 rounded-control bg-card-muted p-5 text-body text-muted">
            还没有买断订单。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-card bg-card shadow-card">
            {user.orders.map((order) => (
              <li className="flex flex-wrap items-center justify-between gap-3 p-4" key={order.id}>
                <div>
                  <p className="font-semibold text-ink">{orderProductName(order.product)}</p>
                  <p className="mt-1 text-caption text-muted">
                    {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(
                      order.createdAt,
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-ink">{orderAmount(order.amountUsdCents)}</p>
                  <p
                    className={`mt-1 text-caption font-semibold ${
                      order.status === 'refunded' ? 'text-muted' : 'text-accent'
                    }`}
                  >
                    {orderStatusName(order.status)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {checkoutUrls ? (
        <section className="mt-10" aria-labelledby="upgrade-heading">
          <p className="text-caption font-semibold tracking-wide text-accent">升级</p>
          <h2 className="mt-1 text-section text-ink" id="upgrade-heading">
            选择终身买断方案
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="rounded-card bg-card p-6 shadow-card">
              <p className="text-section text-ink">基础买断</p>
              <p className="mt-2 text-display text-ink">{miniPrice}</p>
              <p className="mt-3 text-body text-muted">最多创建 10 个主页。</p>
              <a
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-hairline bg-card px-5 text-body font-semibold text-ink"
                href={checkoutUrls.mini}
              >
                购买基础买断
              </a>
            </article>
            <article className="rounded-card border border-accent bg-accent-soft p-6 shadow-card">
              <p className="text-section text-ink">完整买断</p>
              <p className="mt-2 text-display text-ink">{proPrice}</p>
              <p className="mt-3 text-body text-muted">
                最多创建 {PLAN_LIMITS.PRO.pages} 个主页，随功能持续升级。
              </p>
              <a
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-body font-semibold text-accent-on"
                href={checkoutUrls.pro}
              >
                购买完整买断
              </a>
            </article>
          </div>
        </section>
      ) : null}

      <footer className="mt-10 border-t border-hairline pt-5 text-body font-medium text-muted">
        买断即终身，功能只增不减；涨价永远对老用户保价。
      </footer>
    </section>
  );
}
