import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AnalyticsTrend } from './analytics-trend';

const today = new Date('2026-08-19T12:00:00.000Z');

function renderTrend(daily: Parameters<typeof AnalyticsTrend>[0]['daily']) {
  return renderToStaticMarkup(
    AnalyticsTrend({
      daily,
      locale: 'zh-CN',
      noDataLabel: '还没有数据',
      today,
      viewsUnit: '次浏览',
    }),
  );
}

describe('AnalyticsTrend', () => {
  it('does not draw a chart when all 30 days are zero', () => {
    const markup = renderTrend([]);

    expect(markup).toContain('还没有数据');
    expect(markup).not.toContain('<svg');
    expect(markup).not.toContain('<rect');
  });

  it('renders 30 bars for the 30-day trend', () => {
    const daily = Array.from({ length: 30 }, (_, index) => ({
      date: new Date(Date.UTC(2026, 6, 21 + index)),
      views: index + 1,
      uniques: index,
      clicks: Math.floor(index / 2),
    }));
    const markup = renderTrend(daily);

    expect(markup.match(/<rect/g)).toHaveLength(30);
    expect(markup.match(/<title>/g)).toHaveLength(30);
    expect(markup).toContain('8月19日：30 次浏览');
  });
});
