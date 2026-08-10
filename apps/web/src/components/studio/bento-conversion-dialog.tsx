'use client';

import type { BentoPlacement } from '@yilink/shared';
import { useTranslations } from 'next-intl';

import type { PositionedStudioBlock } from './bento-editor-logic';
import type { StudioBlock, StudioLayout } from './types';

interface BentoConversionDialogProps {
  blocks: readonly StudioBlock[];
  candidate: readonly PositionedStudioBlock[];
  isApplying: boolean;
  layout: StudioLayout;
  onApply: () => void;
  onCancel: () => void;
}

function PreviewGrid({ placements }: { placements: readonly BentoPlacement[] }) {
  const rows = Math.max(1, ...placements.map((placement) => placement.y + placement.h));
  return (
    <div
      className="grid min-h-48 grid-cols-4 gap-1.5 rounded-2xl bg-slate-100 p-3"
      style={{ gridTemplateRows: `repeat(${rows}, minmax(8px, 1fr))` }}
    >
      {placements.map((placement, index) => (
        <span
          className="rounded-lg border border-blue-200 bg-blue-100"
          key={index}
          style={{
            gridColumn: `${placement.x + 1} / span ${placement.w}`,
            gridRow: `${placement.y + 1} / span ${placement.h}`,
          }}
        />
      ))}
    </div>
  );
}

function legacyPlacements(blocks: readonly StudioBlock[], layout: StudioLayout): BentoPlacement[] {
  if (layout === 'LIST') {
    return blocks.map((_, index) => ({ x: 0, y: index, w: 4, h: 1 }));
  }
  let cursor = 0;
  return blocks.map((block) => {
    const w = block.size === 'LG' ? 4 : 2;
    const placement = { x: cursor % 4, y: Math.floor(cursor / 4), w, h: 1 };
    cursor += w;
    return placement;
  });
}

export function BentoConversionDialog({
  blocks,
  candidate,
  isApplying,
  layout,
  onApply,
  onCancel,
}: BentoConversionDialogProps) {
  const t = useTranslations('Studio.bento.conversion');
  return (
    <div
      aria-labelledby="bento-conversion-title"
      aria-modal="true"
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
        <h2 className="text-xl font-extrabold text-slate-950" id="bento-conversion-title">
          {t('title')}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t('description')}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <figure>
            <figcaption className="mb-2 text-xs font-bold text-slate-600">
              {t('current')}
            </figcaption>
            <PreviewGrid placements={legacyPlacements(blocks, layout)} />
          </figure>
          <figure>
            <figcaption className="mb-2 text-xs font-bold text-blue-700">{t('after')}</figcaption>
            <PreviewGrid placements={candidate.map((block) => block.placement)} />
          </figure>
        </div>
        <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800">{t('safe')}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            disabled={isApplying}
            onClick={onCancel}
            type="button"
          >
            {t('cancel')}
          </button>
          <button
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            disabled={isApplying}
            onClick={onApply}
            type="button"
          >
            {isApplying ? t('applying') : t('apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
