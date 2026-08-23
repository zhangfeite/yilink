import { createElement } from 'react';

import type { DailyStatsPoint } from '@/lib/stats';

const DAY_COUNT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_HEIGHT = 160;
const BAR_WIDTH = 14;
const BAR_GAP = 6;

interface AnalyticsTrendProps {
  daily: DailyStatsPoint[];
  locale: string;
  noDataLabel: string;
  today: Date;
  viewsUnit: string;
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatChartDate(date: Date, locale: string, formatter: Intl.DateTimeFormat): string {
  if (locale.toLowerCase().startsWith('zh')) {
    return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
  }
  return formatter.format(date);
}

export function fillRecentThirtyDays(daily: DailyStatsPoint[], today: Date): DailyStatsPoint[] {
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const byDate = new Map(daily.map((point) => [utcDayKey(point.date), point]));

  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const date = new Date(todayUtc - (DAY_COUNT - 1 - index) * DAY_MS);
    return byDate.get(utcDayKey(date)) ?? { date, views: 0, uniques: 0, clicks: 0 };
  });
}

export function AnalyticsTrend({
  daily,
  locale,
  noDataLabel,
  today,
  viewsUnit,
}: AnalyticsTrendProps) {
  const points = fillRecentThirtyDays(daily, today);
  const maxViews = Math.max(...points.map((point) => point.views));

  if (maxViews === 0) {
    return createElement(
      'p',
      {
        className: 'mt-4 rounded-control bg-card-muted p-8 text-center text-body text-muted',
      },
      noDataLabel,
    );
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const numberFormatter = new Intl.NumberFormat(locale);
  const separator = locale.toLowerCase().startsWith('zh') ? '：' : ': ';
  const chartWidth = DAY_COUNT * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
  const bars = points.map((point, index) => {
    const height = Math.max(2, (point.views / maxViews) * CHART_HEIGHT);
    const label = `${formatChartDate(point.date, locale, dateFormatter)}${separator}${numberFormatter.format(point.views)} ${viewsUnit}`;

    return createElement(
      'rect',
      {
        className: 'fill-accent',
        height: point.views === 0 ? 0 : height,
        key: utcDayKey(point.date),
        rx: 3,
        width: BAR_WIDTH,
        x: index * (BAR_WIDTH + BAR_GAP),
        y: point.views === 0 ? CHART_HEIGHT : CHART_HEIGHT - height,
      },
      createElement('title', null, label),
    );
  });

  return createElement(
    'figure',
    { 'aria-label': viewsUnit, className: 'mt-4' },
    createElement(
      'svg',
      {
        'aria-label': viewsUnit,
        className: 'h-48 w-full overflow-visible',
        role: 'img',
        viewBox: `0 0 ${chartWidth} ${CHART_HEIGHT}`,
      },
      bars,
    ),
    createElement(
      'figcaption',
      {
        className: 'mt-2 flex justify-between text-caption text-muted',
      },
      createElement('span', null, formatChartDate(points[0]!.date, locale, dateFormatter)),
      createElement(
        'span',
        null,
        formatChartDate(points[points.length - 1]!.date, locale, dateFormatter),
      ),
    ),
  );
}
