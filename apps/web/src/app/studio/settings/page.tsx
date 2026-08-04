import { PLAN_LIMITS, PLAN_NAMES_ZH } from '@yilink/shared';
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
  const quota = pageLimit === Infinity ? '无限' : String(pageLimit);
  const miniCheckoutUrl = checkoutUrl(process.env.LEMONSQUEEZY_CHECKOUT_URL_MINI, user.id);
  const proCheckoutUrl = checkoutUrl(process.env.LEMONSQUEEZY_CHECKOUT_URL_PRO, user.id);
  const checkoutUrls =
    miniCheckoutUrl && proCheckoutUrl ? { mini: miniCheckoutUrl, pro: proCheckoutUrl } : null;
  const miniPrice = process.env.NEXT_PUBLIC_PRICE_MINI?.trim() || '$12';
  const proPrice = process.env.NEXT_PUBLIC_PRICE_PRO?.trim() || '$25';

  return (
    <section className="mx-auto w-full max-w-5xl">
      <header>
        <p className="text-sm font-semibold tracking-wide text-blue-700">{t('settingsTitle')}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          账户与套餐
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">管理你的主页配额与买断订单。</p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="当前账户套餐">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-medium text-slate-500">当前套餐</p>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
            {PLAN_NAMES_ZH[user.plan]}
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-medium text-slate-500">主页配额使用</p>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
            {user._count.pages}/{quota}
          </p>
        </article>
      </section>

      <section className="mt-8" aria-labelledby="orders-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-blue-700">订单</p>
            <h2
              className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950"
              id="orders-heading"
            >
              已购订单
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
            {user.orders.length} 笔
          </span>
        </div>

        {user.orders.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
            还没有买断订单。
          </p>
        ) : (
          <ul className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
            {user.orders.map((order) => (
              <li className="flex flex-wrap items-center justify-between gap-3 p-4" key={order.id}>
                <div>
                  <p className="font-semibold text-slate-950">{orderProductName(order.product)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(
                      order.createdAt,
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-950">
                    {orderAmount(order.amountUsdCents)}
                  </p>
                  <p
                    className={`mt-1 text-sm font-medium ${
                      order.status === 'refunded' ? 'text-slate-500' : 'text-emerald-700'
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
          <p className="text-sm font-semibold tracking-wide text-blue-700">升级</p>
          <h2
            className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950"
            id="upgrade-heading"
          >
            选择终身买断方案
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
              <p className="text-lg font-extrabold text-slate-950">基础买断</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {miniPrice}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">最多创建 10 个主页。</p>
              <a
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
                href={checkoutUrls.mini}
              >
                购买基础买断
              </a>
            </article>
            <article className="rounded-3xl border border-blue-200 bg-blue-50/40 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
              <p className="text-lg font-extrabold text-slate-950">完整买断</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {proPrice}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                无限创建主页，随功能持续升级。
              </p>
              <a
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
                href={checkoutUrls.pro}
              >
                购买完整买断
              </a>
            </article>
          </div>
        </section>
      ) : null}

      <footer className="mt-10 border-t border-slate-200 pt-5 text-sm font-medium text-slate-600">
        买断即终身，功能只增不减；涨价永远对老用户保价。
      </footer>
    </section>
  );
}
