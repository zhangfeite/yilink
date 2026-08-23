'use client';

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { applyBentoOperation, minimumPlacement } from './bento-editor-logic';
import type { StudioBlock } from './types';

const ROW_PX = 28;

interface BentoCanvasProps {
  blocks: readonly StudioBlock[];
  canRedo: boolean;
  canUndo: boolean;
  onChange: (blocks: StudioBlock[], announcement: string) => void;
  onRedo: () => void;
  onShuffle: () => void;
  onTidy: () => void;
  onUndo: () => void;
}

interface BentoCardProps {
  block: StudioBlock;
  isShaking: boolean;
  onKeyboard: (event: KeyboardEvent<HTMLElement>, block: StudioBlock) => void;
  onSelect: (block: StudioBlock) => void;
  onResizeStart: (
    event: ReactPointerEvent<HTMLButtonElement>,
    block: StudioBlock,
    axis: 'x' | 'y' | 'xy',
  ) => void;
}

function BentoCard({ block, isShaking, onKeyboard, onResizeStart, onSelect }: BentoCardProps) {
  const t = useTranslations('Studio');
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
  });
  const placement = block.placement!;
  return (
    <article
      {...attributes}
      {...listeners}
      aria-label={t('bento.canvas.card', { type: t(`blockTypes.${block.type}`) })}
      className={`group relative flex min-h-0 cursor-grab items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-card px-3 text-center text-caption font-semibold text-ink shadow-sm outline-none transition-[box-shadow,opacity] focus-visible:ring-2 focus-visible:ring-accent ${
        isDragging ? 'z-20 opacity-70 shadow-xl' : ''
      } ${isShaking ? 'animate-[bounce_180ms_ease-in-out]' : ''}`}
      onKeyDown={(event) => onKeyboard(event, block)}
      onClick={() => onSelect(block)}
      ref={setNodeRef}
      style={{
        gridColumn: `${placement.x + 1} / span ${placement.w}`,
        gridRow: `${placement.y + 1} / span ${placement.h}`,
        transform: CSS.Translate.toString(transform),
      }}
      tabIndex={0}
    >
      {t(`blockTypes.${block.type}`)}
      {(['x', 'y', 'xy'] as const).map((axis) => (
        <button
          aria-label={t(`bento.canvas.resize.${axis}`)}
          className={`absolute z-10 hidden touch-none bg-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 lg:block ${
            axis === 'x'
              ? 'right-0 top-1/2 h-11 w-3 -translate-y-1/2 cursor-ew-resize rounded-l-full'
              : axis === 'y'
                ? 'bottom-0 left-1/2 h-3 w-11 -translate-x-1/2 cursor-ns-resize rounded-t-full'
                : 'bottom-0 right-0 h-11 w-11 cursor-nwse-resize rounded-tl-2xl'
          }`}
          key={axis}
          onPointerDown={(event) => onResizeStart(event, block, axis)}
          type="button"
        />
      ))}
    </article>
  );
}

export function BentoCanvas({
  blocks,
  canRedo,
  canUndo,
  onChange,
  onRedo,
  onShuffle,
  onTidy,
  onUndo,
}: BentoCanvasProps) {
  const t = useTranslations('Studio');
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOriginRef = useRef<StudioBlock[] | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [draft, setDraft] = useState<StudioBlock[] | null>(null);
  const draftRef = useRef<StudioBlock[] | null>(null);
  const [gestureOrigin, setGestureOrigin] = useState<StudioBlock[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 6 } });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 180, tolerance: 8 },
  });
  const sensors = useSensors(...(isNarrow ? [touchSensor] : [pointerSensor]));
  const displayed = draft ?? blocks;
  const maxRow = Math.max(
    4,
    ...displayed.map((block) => (block.placement?.y ?? 0) + (block.placement?.h ?? 1)),
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  function announce(block: StudioBlock) {
    const placement = block.placement!;
    const text = t('bento.canvas.position', {
      column: placement.x + 1,
      row: placement.y + 1,
      width: placement.w,
      height: placement.h,
    });
    setAnnouncement(text);
    return text;
  }

  function operation(block: StudioBlock, placement: NonNullable<StudioBlock['placement']>) {
    return applyBentoOperation(dragOriginRef.current ?? blocks, block.id, placement);
  }

  function handleDragStart(event: DragStartEvent) {
    dragOriginRef.current = [...blocks];
    setGestureOrigin([...blocks]);
    setActiveId(String(event.active.id));
    draftRef.current = [...blocks];
    setDraft([...blocks]);
  }

  function handleDragMove(event: DragMoveEvent) {
    const origin = dragOriginRef.current;
    const block = origin?.find((item) => item.id === event.active.id);
    if (!block?.placement) return;
    const width = canvasRef.current?.getBoundingClientRect().width ?? 480;
    const columnPx = width / 4;
    const placement = {
      ...block.placement,
      x: block.placement.x + Math.round(event.delta.x / columnPx),
      y: block.placement.y + Math.round(event.delta.y / ROW_PX),
    };
    const next = operation(block, placement);
    draftRef.current = next;
    setDraft(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const next = draftRef.current;
    const moved = next?.find((block) => block.id === event.active.id);
    if (next && moved) onChange(next, announce(moved));
    setActiveId(null);
    setDraft(null);
    draftRef.current = null;
    setGestureOrigin(null);
    dragOriginRef.current = null;
  }

  function cancelGesture() {
    resizeCleanupRef.current?.();
    resizeCleanupRef.current = null;
    setActiveId(null);
    setDraft(null);
    draftRef.current = null;
    setGestureOrigin(null);
    dragOriginRef.current = null;
  }

  function handleResizeStart(
    event: ReactPointerEvent<HTMLButtonElement>,
    block: StudioBlock,
    axis: 'x' | 'y' | 'xy',
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (!block.placement) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const original = [...blocks];
    dragOriginRef.current = original;
    setGestureOrigin(original);
    setActiveId(block.id);
    draftRef.current = original;
    setDraft(original);
    const minimum = minimumPlacement(block);
    const columnPx = (canvasRef.current?.getBoundingClientRect().width ?? 480) / 4;
    const move = (pointer: PointerEvent) => {
      const w =
        axis === 'y'
          ? block.placement!.w
          : block.placement!.w + Math.round((pointer.clientX - startX) / columnPx);
      const h =
        axis === 'x'
          ? block.placement!.h
          : block.placement!.h + Math.round((pointer.clientY - startY) / ROW_PX);
      if (w < minimum.w || h < minimum.h) {
        setShakingId(block.id);
        window.setTimeout(() => setShakingId(null), 180);
        return;
      }
      const next = operation(block, { ...block.placement!, w, h });
      draftRef.current = next;
      setDraft(next);
    };
    const finish = () => {
      const next = draftRef.current;
      const resized = next?.find((item) => item.id === block.id);
      if (next && resized) onChange(next, announce(resized));
      cancelGesture();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    resizeCleanupRef.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
    };
  }

  function handleKeyboard(event: KeyboardEvent<HTMLElement>, block: StudioBlock) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelGesture();
      onUndo();
      return;
    }
    if (!block.placement || !event.key.startsWith('Arrow')) return;
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const placement = { ...block.placement };
    if (event.shiftKey) {
      if (horizontal) placement.w += delta;
      else placement.h += delta;
      const minimum = minimumPlacement(block);
      if (placement.w < minimum.w || placement.h < minimum.h) {
        setShakingId(block.id);
        window.setTimeout(() => setShakingId(null), 180);
        return;
      }
    } else if (horizontal) placement.x += delta;
    else placement.y += delta;
    dragOriginRef.current = [...blocks];
    const next = operation(block, placement);
    const moved = next.find((item) => item.id === block.id)!;
    onChange(next, announce(moved));
    dragOriginRef.current = null;
  }

  function mobileOperation(block: StudioBlock, placement: NonNullable<StudioBlock['placement']>) {
    dragOriginRef.current = [...blocks];
    const next = operation(block, placement);
    const moved = next.find((item) => item.id === block.id)!;
    onChange(next, announce(moved));
    dragOriginRef.current = null;
  }

  const selected = displayed.find((block) => block.id === selectedId);
  const activeOriginal = gestureOrigin?.find((block) => block.id === activeId);
  const activeDraft = displayed.find((block) => block.id === activeId);
  const sizeOptions = [
    { key: 'banner', w: 4, h: 1 },
    { key: 'full', w: 4, h: 4 },
    { key: 'half', w: 2, h: 4 },
    { key: 'halfTall', w: 2, h: 8 },
    { key: 'fullTall', w: 4, h: 8 },
    { key: 'smallImage', w: 1, h: 4 },
  ] as const;

  function animateAction(action: () => void) {
    setIsShuffling(true);
    action();
    window.setTimeout(() => setIsShuffling(false), 200);
  }

  return (
    <section className="rounded-3xl border border-hairline bg-card-muted p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h2 className="text-sm font-extrabold text-ink">{t('bento.canvas.title')}</h2>
          <p className="mt-0.5 text-caption text-muted">{t('bento.canvas.hint')}</p>
        </div>
        <button
          className="order-first rounded-full border border-hairline bg-card px-3 py-2 text-caption font-semibold text-ink transition hover:bg-accent-soft sm:order-none"
          onClick={() => animateAction(onShuffle)}
          type="button"
        >
          {t('bento.shuffle')}
        </button>
        <button
          className="order-first rounded-full border border-hairline bg-card px-3 py-2 text-caption font-semibold text-ink transition hover:bg-accent-soft sm:order-none"
          onClick={() => animateAction(onTidy)}
          type="button"
        >
          {t('bento.tidy')}
        </button>
        <button
          className="rounded-full bg-card px-3 py-2 text-caption font-semibold disabled:opacity-40"
          disabled={!canUndo}
          onClick={onUndo}
          type="button"
        >
          ↶ {t('bento.undo')}
        </button>
        <button
          className="rounded-full bg-card px-3 py-2 text-caption font-semibold disabled:opacity-40"
          disabled={!canRedo}
          onClick={onRedo}
          type="button"
        >
          ↷ {t('bento.redo')}
        </button>
      </div>
      <DndContext
        onDragCancel={cancelGesture}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div
          className={`mx-auto grid w-full max-w-[480px] grid-cols-4 gap-1.5 overflow-hidden rounded-3xl border border-hairline bg-card p-2 transition-all duration-200 ${isShuffling ? 'scale-[0.985] opacity-75' : ''}`}
          ref={canvasRef}
          style={{ gridAutoRows: `${ROW_PX}px`, minHeight: maxRow * ROW_PX + 16 }}
        >
          {displayed.map((block) =>
            block.placement ? (
              <BentoCard
                block={activeId === block.id && activeOriginal ? activeOriginal : block}
                isShaking={shakingId === block.id}
                key={block.id}
                onKeyboard={handleKeyboard}
                onResizeStart={handleResizeStart}
                onSelect={(selectedBlock) => setSelectedId(selectedBlock.id)}
              />
            ) : null,
          )}
          {activeDraft?.placement && draft ? (
            <span
              aria-hidden="true"
              className="rounded-2xl border border-dashed border-accent bg-accent-soft"
              style={{
                gridColumn: `${activeDraft.placement.x + 1} / span ${activeDraft.placement.w}`,
                gridRow: `${activeDraft.placement.y + 1} / span ${activeDraft.placement.h}`,
              }}
            />
          ) : null}
        </div>
      </DndContext>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {selected?.placement ? (
        <div className="fixed inset-x-0 bottom-0 z-[65] rounded-t-3xl border border-hairline bg-card p-4 shadow-[0_-16px_50px_rgba(15,23,42,0.18)] lg:hidden">
          <div className="mx-auto max-w-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-ink">{t('bento.mobile.title')}</h3>
                <p className="text-caption text-muted">{t(`blockTypes.${selected.type}`)}</p>
              </div>
              <button
                className="rounded-full bg-card-muted px-3 py-2 text-caption font-semibold"
                onClick={() => setSelectedId(null)}
                type="button"
              >
                {t('close')}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-2">
              {sizeOptions.map((option) => {
                const minimum = minimumPlacement(selected);
                const disabled = option.w < minimum.w || option.h < minimum.h;
                return (
                  <button
                    aria-label={t(`bento.mobile.sizes.${option.key}`)}
                    aria-pressed={
                      selected.placement?.w === option.w && selected.placement?.h === option.h
                    }
                    className="rounded-xl border border-hairline p-1.5 disabled:cursor-not-allowed disabled:opacity-30 aria-pressed:border-accent aria-pressed:bg-accent-soft"
                    disabled={disabled}
                    key={option.key}
                    onClick={() =>
                      mobileOperation(selected, {
                        ...selected.placement!,
                        w: option.w,
                        h: option.h,
                      })
                    }
                    type="button"
                  >
                    <span className="grid h-10 grid-cols-4 grid-rows-4 gap-px rounded bg-card-muted p-1">
                      <span
                        className="rounded-sm bg-accent"
                        style={{
                          gridColumn: `span ${option.w}`,
                          gridRow: `span ${Math.min(4, option.h)}`,
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(
                [
                  ['up', 0, -1, '↑'],
                  ['down', 0, 1, '↓'],
                  ['left', -1, 0, '←'],
                  ['right', 1, 0, '→'],
                ] as const
              ).map(([direction, x, y, glyph]) => (
                <button
                  aria-label={t(`bento.mobile.nudge.${direction}`)}
                  className="rounded-xl bg-card-muted px-4 py-3 text-lg font-bold text-ink active:bg-accent-soft"
                  key={direction}
                  onClick={() =>
                    mobileOperation(selected, {
                      ...selected.placement!,
                      x: selected.placement!.x + x,
                      y: selected.placement!.y + y,
                    })
                  }
                  type="button"
                >
                  {glyph}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
