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
        <header>
          <p className="text-caption font-semibold tracking-wide text-accent">{t('dataEyebrow')}</p>
          <h1 className="mt-2 text-display text-ink">{t('dataTitle')}</h1>
          <p className="mt-3 text-body text-muted">{t('dataDescription')}</p>
        </header>
        <div className="mt-8 rounded-card bg-card p-8 text-center shadow-card">
          <p className="text-body text-muted">{t('dataEmpty')}</p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-body font-semibold text-accent-on"
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
        <p className="text-caption font-semibold tracking-wide text-accent">{t('dataEyebrow')}</p>
        <h1 className="mt-2 text-display text-ink">{t('dataTitle')}</h1>
        <p className="mt-3 text-body text-muted">{t('dataDescription')}</p>
      </header>

      <form action="/studio/data" className="mt-8 flex flex-wrap items-end gap-3" method="get">
        <label className="min-w-60 flex-1 text-caption font-semibold text-ink">
          {t('dataSelectPage')}
          <select
            className="mt-2 min-h-11 w-full rounded-control border border-hairline bg-card px-3 text-body text-ink"
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
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-body font-semibold text-accent-on"
          type="submit"
        >
          {t('dataShowPage')}
        </button>
      </form>

      <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label={t('dataSummary')}>
        {summaries.map((summary) => (
          <article className="rounded-card bg-card p-6 shadow-card" key={summary.label}>
            <p className="text-caption font-semibold text-muted">{summary.label}</p>
            <p className="mt-3 text-display text-ink">{numberFormatter.format(summary.value)}</p>
          </article>
        ))}
      </section>

      <section
        className="mt-6 rounded-card bg-card p-6 shadow-card"
        aria-labelledby="views-trend-heading"
      >
        <h2 className="text-section text-ink" id="views-trend-heading">
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
