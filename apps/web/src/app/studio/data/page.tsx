import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import { AnalyticsTrend } from '@/components/studio/analytics-trend';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getRecentPageStats } from '@/lib/stats';

interface StudioDataPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StudioDataPage({ searchParams }: StudioDataPageProps) {
  const [t, locale, session, params] = await Promise.all([
    getTranslations('Studio'),
    getLocale(),
    auth(),
    searchParams,
  ]);
  const userId = session?.user?.id;
  if (!userId) redirect('/login');

  const pages = await db.page.findMany({
    where: { userId, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, slug: true, title: true },
  });
  const requestedPageId = typeof params.pageId === 'string' ? params.pageId : null;
  const selectedPage = pages.find((page) => page.id === requestedPageId) ?? pages[0];

  if (!selectedPage) {
    return (
      <section className="mx-auto w-full max-w-5xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">{t('dataTitle')}</h1>
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm leading-6 text-slate-600">{t('dataEmpty')}</p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
            href="/studio"
          >
            {t('dataCreateFirst')}
          </Link>
        </div>
      </section>
    );
  }

  const now = new Date();
  const stats = await getRecentPageStats(selectedPage.id, now);
  const summaries = [
    { label: t('dataViews'), value: stats.views },
    { label: t('dataUniques'), value: stats.uniques },
    { label: t('dataClicks'), value: stats.clicks },
  ];
  const numberFormatter = new Intl.NumberFormat(locale);

  return (
    <section className="mx-auto w-full max-w-5xl">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">{t('dataTitle')}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{t('dataDescription')}</p>
      </header>

      <form action="/studio/data" className="mt-8 flex flex-wrap items-end gap-3" method="get">
        <label className="min-w-60 flex-1 text-sm font-semibold text-slate-700">
          {t('dataSelectPage')}
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            defaultValue={selectedPage.id}
            name="pageId"
          >
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title} · /p/{page.slug}
              </option>
            ))}
          </select>
        </label>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
          type="submit"
        >
          {t('dataShowPage')}
        </button>
      </form>

      <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label={t('dataSummary')}>
        {summaries.map((summary) => (
          <article
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
            key={summary.label}
          >
            <p className="text-sm font-medium text-slate-500">{summary.label}</p>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
              {numberFormatter.format(summary.value)}
            </p>
          </article>
        ))}
      </section>

      <section
        className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-950"
        aria-labelledby="views-trend-heading"
      >
        <h2
          className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-slate-50"
          id="views-trend-heading"
        >
          {t('dataTrend')}
        </h2>
        <AnalyticsTrend
          daily={stats.daily}
          locale={locale}
          noDataLabel={t('dataNoStats')}
          today={now}
          viewsUnit={t('dataViewsUnit')}
        />
      </section>
    </section>
  );
}
