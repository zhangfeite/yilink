'use client';

/* eslint-disable @next/next/no-img-element */
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { blockConfigSchemas, ctaConfigSchema, type CtaConfig } from '@yilink/shared';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { PublicPageRenderer } from '@/components/public/public-page';

import { SortableBlockEditor } from './block-editor';
import { BentoCanvas } from './bento-canvas';
import { BentoConversionDialog } from './bento-conversion-dialog';
import {
  commitHistory,
  createBentoCandidate,
  createHistory,
  detectBentoGuardrails,
  normalizeStudioBento,
  publishingBlocker,
  randomizeBentoLayout,
  redoHistory,
  tidyBentoLayout,
  undoHistory,
  type PositionedStudioBlock,
} from './bento-editor-logic';
import { studioApiRequest, StudioApiError } from './create-from-template';
import { nextPublishSuccessSignal, SharePanel } from './share-panel';
import { studioThemes } from './theme-options';
import type { StudioBlock, StudioBlockType, StudioPageDraft } from './types';

type CtaDraft = NonNullable<CtaConfig>;
type EditorStatus = StudioPageDraft['status'] | 'REVIEW';

interface ModerationResponse {
  moderation: { verdict: 'pass' | 'review' | 'block'; labels: string[] } | null;
  page: { status: EditorStatus };
}

interface BlocksSaveResponse extends ModerationResponse {
  blocks: StudioBlock[];
}

interface EditorMeta {
  avatarUrl: string;
  bio: string;
  ctaConfig: CtaDraft | null;
  layout: 'LIST' | 'GRID';
  role: string;
  seoDesc: string;
  seoTitle: string;
  themeId: string;
  title: string;
}

interface Notice {
  kind: 'error' | 'review' | 'success';
  text: string;
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function initialCta(value: unknown): CtaDraft | null {
  const parsed = ctaConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function PageEditor({ initialPage }: { initialPage: StudioPageDraft }) {
  const t = useTranslations('Studio');
  const role = recordValue(initialPage.themeConfig).role;
  const [meta, setMeta] = useState<EditorMeta>({
    avatarUrl: initialPage.avatarUrl ?? '',
    bio: initialPage.bio ?? '',
    ctaConfig: initialCta(initialPage.ctaConfig),
    layout: initialPage.layout,
    role: typeof role === 'string' ? role : '',
    seoDesc: initialPage.seoDesc ?? '',
    seoTitle: initialPage.seoTitle ?? '',
    themeId: initialPage.themeId,
    title: initialPage.title,
  });
  const [blockHistory, setBlockHistory] = useState(() => createHistory(initialPage.blocks));
  const blocks = blockHistory.present;
  const [bentoVersion, setBentoVersion] = useState(initialPage.bentoVersion);
  const [bentoCandidate, setBentoCandidate] = useState<PositionedStudioBlock[] | null>(null);
  const [isApplyingBento, setIsApplyingBento] = useState(false);
  const [status, setStatus] = useState<EditorStatus>(initialPage.status);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageAction, setPageAction] = useState<'publish' | 'unpublish' | null>(null);
  const [publishSuccessSignal, setPublishSuccessSignal] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [guardrailWarnings, setGuardrailWarnings] = useState<
    ReturnType<typeof detectBentoGuardrails>
  >([]);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const currentTheme = studioThemes.find((theme) => theme.id === meta.themeId) ?? studioThemes[0]!;
  const blockTypes: StudioBlockType[] = [
    'LINK',
    'SOCIAL',
    'TEXT',
    'IMAGE',
    'WECHAT',
    'QR',
    'DIVIDER',
  ];
  const metaErrors = useMemo(() => {
    const errors: Partial<Record<keyof EditorMeta, string>> = {};
    if (!meta.title.trim()) errors.title = t('errors.titleRequired');
    if (meta.role.length > 24) errors.role = t('errors.roleTooLong');
    if (meta.bio.length > 500) errors.bio = t('errors.bioTooLong');
    if (meta.avatarUrl && !isHttpUrl(meta.avatarUrl)) errors.avatarUrl = t('errors.urlInvalid');
    if (meta.seoTitle.length > 120) errors.seoTitle = t('errors.seoTitleTooLong');
    if (meta.seoDesc.length > 500) errors.seoDesc = t('errors.seoDescTooLong');
    if (meta.ctaConfig) {
      const parsed = ctaConfigSchema.safeParse(meta.ctaConfig);
      if (
        !parsed.success ||
        !meta.ctaConfig.value.trim() ||
        (meta.ctaConfig.type === 'link' && !isHttpUrl(meta.ctaConfig.value))
      ) {
        errors.ctaConfig = t('errors.ctaInvalid');
      }
    }
    return errors;
  }, [meta, t]);
  const invalidBlockCount = blocks.filter(
    (block) => !blockConfigSchemas[block.type].safeParse(block.config).success,
  ).length;

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeLeave);
    return () => window.removeEventListener('beforeunload', warnBeforeLeave);
  }, [isDirty]);

  function updateMeta(patch: Partial<EditorMeta>) {
    setMeta((current) => ({ ...current, ...patch }));
    setIsDirty(true);
    setNotice(null);
  }

  function updateBlock(nextBlock: StudioBlock) {
    setBlockHistory((current) =>
      commitHistory(
        current,
        current.present.map((block) => (block.id === nextBlock.id ? nextBlock : block)),
      ),
    );
    setIsDirty(true);
    setNotice(null);
  }

  function removeBlock(id: string) {
    setBlockHistory((current) =>
      commitHistory(
        current,
        current.present.filter((block) => block.id !== id),
      ),
    );
    setIsDirty(true);
    setNotice(null);
  }

  function defaultConfig(type: StudioBlockType): Record<string, unknown> {
    if (type === 'LINK') {
      return { title: t('defaults.linkTitle'), url: 'https://example.com' };
    }
    if (type === 'SOCIAL') {
      return { items: [{ platform: 'website', url: 'https://example.com' }] };
    }
    if (type === 'TEXT') return { markdown: t('defaults.text') };
    if (type === 'IMAGE') {
      return {
        url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
        alt: t('defaults.imageAlt'),
      };
    }
    if (type === 'WECHAT') return { wechatId: t('defaults.wechatId') };
    if (type === 'QR') {
      return {
        imageUrl: 'https://placehold.co/240x240/png?text=QR',
        label: t('defaults.qrLabel'),
      };
    }
    return {};
  }

  function addBlock(type: StudioBlockType) {
    if (blocks.length >= 50) {
      setNotice({ kind: 'error', text: t('errors.blockLimit') });
      return;
    }
    const id = `draft-${crypto.randomUUID()}`;
    setBlockHistory((current) => {
      const next = [
        ...current.present,
        { id, type, size: 'MD', isVisible: true, config: defaultConfig(type) },
      ] satisfies StudioBlock[];
      return commitHistory(current, bentoVersion === 1 ? normalizeStudioBento(next) : next);
    });
    setIsDirty(true);
    setNotice(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlockHistory((current) => {
      const from = current.present.findIndex((block) => block.id === active.id);
      const to = current.present.findIndex((block) => block.id === over.id);
      return from < 0 || to < 0
        ? current
        : commitHistory(current, arrayMove(current.present, from, to));
    });
    setIsDirty(true);
    setNotice(null);
  }

  function layoutBody(nextBlocks: readonly StudioBlock[], nextBentoVersion = bentoVersion) {
    return {
      title: meta.title.trim(),
      bio: meta.bio.trim() || null,
      avatarUrl: meta.avatarUrl.trim() || null,
      layout: meta.layout,
      bentoVersion: nextBentoVersion,
      themeId: meta.themeId,
      seoTitle: meta.seoTitle.trim() || null,
      seoDesc: meta.seoDesc.trim() || null,
      ctaConfig: meta.ctaConfig,
      themeConfig: { ...recordValue(initialPage.themeConfig), role: meta.role.trim() },
      blocks: nextBlocks.map(({ id, type, size, isVisible, config, placement }) => ({
        id,
        type,
        size,
        isVisible,
        config,
        placement,
      })),
    };
  }

  function chooseLayout(layout: EditorMeta['layout']) {
    updateMeta({ layout });
    setBentoVersion(null);
  }

  function openBentoConversion() {
    if (bentoVersion === 1) return;
    setBentoCandidate(createBentoCandidate(blocks, meta.layout));
  }

  async function applyBentoConversion() {
    if (!bentoCandidate) return;
    setIsApplyingBento(true);
    setNotice(null);
    try {
      const result = await studioApiRequest<BlocksSaveResponse>(
        fetch,
        `/api/v1/pages/${initialPage.id}/layout`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(layoutBody(bentoCandidate, 1)),
        },
      );
      setBlockHistory(createHistory(result.blocks));
      setBentoVersion(1);
      setBentoCandidate(null);
      setIsDirty(false);
      setStatus(result.page.status);
      setNotice({ kind: 'success', text: t('bento.conversion.applied') });
    } catch {
      setNotice({ kind: 'error', text: t('bento.conversion.failed') });
    } finally {
      setIsApplyingBento(false);
    }
  }

  async function saveDraft(announce = true): Promise<boolean> {
    if (Object.keys(metaErrors).length > 0 || invalidBlockCount > 0) {
      setNotice({
        kind: 'error',
        text:
          invalidBlockCount > 0
            ? t('errors.blocksInvalid', { count: invalidBlockCount })
            : t('errors.pageInvalid'),
      });
      setMobileTab('edit');
      return false;
    }

    setIsSaving(true);
    setNotice(null);
    setGuardrailWarnings(bentoVersion === 1 ? detectBentoGuardrails(blocks) : []);
    try {
      const layoutResult = await studioApiRequest<BlocksSaveResponse>(
        fetch,
        `/api/v1/pages/${initialPage.id}/layout`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(layoutBody(blocks)),
        },
      );
      setStatus(layoutResult.page.status);
      setBlockHistory(createHistory(layoutResult.blocks));
      setIsDirty(false);
      if (announce) {
        setNotice(
          layoutResult.page.status === 'REVIEW'
            ? { kind: 'review', text: t('reviewPending') }
            : { kind: 'success', text: t('saved') },
        );
      }
      return true;
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof StudioApiError && error.code === 'MODERATION_BLOCKED'
            ? t('errors.moderationBlocked', { reason: error.message })
            : t('errors.saveFailed'),
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function publishPage() {
    const blocker = bentoVersion === 1 ? publishingBlocker(blocks) : null;
    if (blocker) {
      setNotice({
        kind: 'error',
        text: t('bento.guardrails.blocking', { type: t(`blockTypes.${blocker.type}`) }),
      });
      return;
    }
    setPageAction('publish');
    const saved = await saveDraft(false);
    if (!saved) {
      setPageAction(null);
      return;
    }
    try {
      const result = await studioApiRequest<ModerationResponse>(
        fetch,
        `/api/v1/pages/${initialPage.id}/publish`,
        { method: 'POST' },
      );
      setStatus(result.page.status);
      if (result.page.status === 'REVIEW') {
        setNotice({ kind: 'review', text: t('submittedForReview') });
      } else {
        setNotice({ kind: 'success', text: t('published') });
        setPublishSuccessSignal(nextPublishSuccessSignal);
      }
    } catch (error) {
      if (error instanceof StudioApiError && error.code === 'MODERATION_BLOCKED') {
        setNotice({
          kind: 'error',
          text: t('errors.moderationBlocked', { reason: error.message }),
        });
      } else {
        setNotice({ kind: 'error', text: t('errors.publishFailed') });
      }
    } finally {
      setPageAction(null);
    }
  }

  async function unpublishPage() {
    setPageAction('unpublish');
    setNotice(null);
    try {
      await studioApiRequest(fetch, `/api/v1/pages/${initialPage.id}/unpublish`, {
        method: 'POST',
      });
      setStatus('DRAFT');
      setNotice({ kind: 'success', text: t('unpublished') });
    } catch {
      setNotice({ kind: 'error', text: t('errors.unpublishFailed') });
    } finally {
      setPageAction(null);
    }
  }

  const previewPage = {
    id: initialPage.id,
    slug: initialPage.slug,
    title: meta.title || t('defaults.untitled'),
    bio: meta.bio || null,
    avatarUrl: meta.avatarUrl || null,
    layout: meta.layout,
    bentoVersion,
    themeId: meta.themeId,
    themeConfig: { ...recordValue(initialPage.themeConfig), role: meta.role },
    ctaConfig: meta.ctaConfig,
    totalViews: 0,
    blocks: blocks
      .filter((block) => block.isVisible)
      .map(({ id, type, size, config, placement }) => ({
        id,
        type,
        size,
        config,
        placement,
      })),
  };

  const fieldClass =
    'mt-1.5 w-full rounded-control border border-hairline bg-card px-3 py-2.5 text-body font-normal text-ink outline-none';
  const labelClass = 'text-caption font-semibold text-ink';
  const secondaryButtonClass =
    'rounded-full border border-hairline bg-card px-4 py-2 text-caption font-semibold text-ink';

  return (
    <div className="mx-auto w-full max-w-[1180px] text-ink">
      <header className="sticky top-0 z-40 -mx-4 -mt-6 bg-page px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              aria-label={t('backToPages')}
              className="grid h-9 w-9 flex-none place-items-center rounded-full text-body text-muted hover:bg-card"
              href="/studio"
            >
              ←
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <strong className="max-w-36 truncate text-body text-ink sm:max-w-56">
                  {meta.title}
                </strong>
                <span
                  className={`text-caption font-semibold ${status === 'PUBLISHED' ? 'text-accent' : 'text-muted'}`}
                >
                  {t(`status.${status.toLowerCase()}`)}
                </span>
                <details className="group relative">
                  <summary
                    aria-label={t('theme')}
                    className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-full border border-hairline bg-card [&::-webkit-details-marker]:hidden"
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-hairline"
                      style={{ background: currentTheme?.accent }}
                    />
                  </summary>
                  <div className="absolute left-0 z-50 mt-2 grid w-64 grid-cols-2 gap-2 rounded-card border border-hairline bg-card p-3 shadow-card">
                    {studioThemes.map((theme) => (
                      <button
                        aria-pressed={meta.themeId === theme.id}
                        className={`flex items-center gap-2 rounded-control p-2 text-left text-caption font-semibold ${
                          meta.themeId === theme.id ? 'bg-accent-soft text-ink' : 'text-muted'
                        }`}
                        key={theme.id}
                        onClick={() => updateMeta({ themeId: theme.id })}
                        type="button"
                      >
                        <span
                          className="h-5 w-5 flex-none rounded-full border border-hairline"
                          style={{ background: theme.accent }}
                        />
                        {theme.nameZh}
                      </button>
                    ))}
                  </div>
                </details>
              </div>
              <p className="text-caption text-muted">
                {isDirty ? t('unsaved') : t('allSaved')}
              </p>
            </div>
          </div>

          <div className="order-3 mx-auto flex rounded-full bg-card-muted p-1 sm:order-none">
            {(['LIST', 'GRID'] as const).map((layout) => (
              <button
                aria-pressed={bentoVersion === null && meta.layout === layout}
                className={`rounded-full px-3 py-1.5 text-caption font-semibold ${
                  bentoVersion === null && meta.layout === layout
                    ? 'bg-card text-ink shadow-card'
                    : 'text-muted'
                }`}
                key={layout}
                onClick={() => chooseLayout(layout)}
                type="button"
              >
                {t(`layouts.${layout.toLowerCase()}`)}
              </button>
            ))}
            <button
              aria-pressed={bentoVersion === 1}
              className={`rounded-full px-3 py-1.5 text-caption font-semibold ${
                bentoVersion === 1 ? 'bg-card text-ink shadow-card' : 'text-muted'
              }`}
              onClick={openBentoConversion}
              type="button"
            >
              {t('layouts.bento')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <SharePanel
              avatarUrl={meta.avatarUrl}
              bio={meta.bio}
              key={publishSuccessSignal}
              pageId={initialPage.id}
              publishSuccessSignal={publishSuccessSignal}
              role={meta.role}
              slug={initialPage.slug}
              theme={currentTheme}
              title={meta.title || t('defaults.untitled')}
            />
            <button
              className={secondaryButtonClass}
              disabled={isSaving || pageAction !== null}
              onClick={() => void saveDraft()}
              type="button"
            >
              {isSaving ? t('saving') : t('save')}
            </button>
            {status === 'PUBLISHED' ? (
              <button
                className="rounded-full bg-accent px-4 py-2 text-caption font-bold text-accent-on disabled:cursor-wait disabled:opacity-50"
                disabled={pageAction !== null || isSaving}
                onClick={() => void unpublishPage()}
                type="button"
              >
                {pageAction === 'unpublish' ? t('unpublishing') : t('unpublish')}
              </button>
            ) : (
              <button
                className="rounded-full bg-accent px-4 py-2 text-caption font-bold text-accent-on disabled:cursor-wait disabled:opacity-50"
                disabled={pageAction !== null || isSaving}
                onClick={() => void publishPage()}
                type="button"
              >
                {pageAction === 'publish' ? t('publishing') : t('publish')}
              </button>
            )}
          </div>
        </div>
        {notice ? (
          <p aria-live="polite" className="mt-2 rounded-control bg-accent-soft px-3 py-2 text-caption text-ink">
            {notice.text}
          </p>
        ) : null}
        {guardrailWarnings.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-control bg-accent-soft px-3 py-2 text-caption text-ink">
            <span className="mr-auto">
              {guardrailWarnings.map((warning) => t(`bento.guardrails.${warning}`)).join(' · ')}
            </span>
            <button
              className={secondaryButtonClass}
              onClick={() => {
                setBlockHistory((current) =>
                  commitHistory(current, tidyBentoLayout(current.present)),
                );
                setGuardrailWarnings([]);
                setIsDirty(true);
              }}
              type="button"
            >
              {t('bento.tidy')}
            </button>
          </div>
        ) : null}
      </header>

      <div className="mt-5 grid grid-cols-2 rounded-full bg-card-muted p-1 lg:hidden">
        {(['edit', 'preview'] as const).map((tab) => (
          <button
            className={`rounded-full px-4 py-2 text-body font-semibold ${
              mobileTab === tab ? 'bg-card text-ink shadow-card' : 'text-muted'
            }`}
            key={tab}
            onClick={() => setMobileTab(tab)}
            type="button"
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div className="mt-6 gap-7 lg:grid lg:grid-cols-[minmax(0,1fr)_375px] lg:items-start">
        <div className={`${mobileTab === 'edit' ? 'block' : 'hidden'} min-w-0 space-y-6 lg:block`}>
          <section className="rounded-card bg-card p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-section text-ink">
                  {t('pageSettings')}
                </h2>
                <p className="mt-1 text-caption text-muted">{t('pageSettingsHint')}</p>
              </div>
              <div
                className="relative grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-card text-section font-bold text-accent-on shadow-card"
                style={{ background: currentTheme?.accent }}
              >
                {Array.from(meta.title.trim())[0] ?? '一'}
                {meta.avatarUrl && !metaErrors.avatarUrl ? (
                  <img
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    src={meta.avatarUrl}
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                {t('fields.pageTitle')}
                <input
                  aria-invalid={Boolean(metaErrors.title)}
                  className={fieldClass}
                  maxLength={120}
                  onChange={(event) => updateMeta({ title: event.target.value })}
                  value={meta.title}
                />
                {metaErrors.title ? (
                  <span className="mt-1 block text-caption font-normal text-accent">
                    {metaErrors.title}
                  </span>
                ) : null}
              </label>
              <label className={labelClass}>
                {t('fields.role')}
                <input
                  aria-invalid={Boolean(metaErrors.role)}
                  className={fieldClass}
                  maxLength={24}
                  onChange={(event) => updateMeta({ role: event.target.value })}
                  value={meta.role}
                />
                {metaErrors.role ? (
                  <span className="mt-1 block text-caption font-normal text-accent">
                    {metaErrors.role}
                  </span>
                ) : null}
              </label>
              <label className={`${labelClass} sm:col-span-2`}>
                {t('fields.bio')}
                <textarea
                  aria-invalid={Boolean(metaErrors.bio)}
                  className={`${fieldClass} min-h-24 resize-y`}
                  maxLength={500}
                  onChange={(event) => updateMeta({ bio: event.target.value })}
                  value={meta.bio}
                />
                <span className="mt-1 flex justify-between text-caption font-normal text-muted">
                  <span>{metaErrors.bio ?? ''}</span>
                  <span>{meta.bio.length}/500</span>
                </span>
              </label>
              <label className={`${labelClass} sm:col-span-2`}>
                {t('fields.avatarUrl')}
                <input
                  aria-invalid={Boolean(metaErrors.avatarUrl)}
                  className={fieldClass}
                  onChange={(event) => updateMeta({ avatarUrl: event.target.value })}
                  placeholder="https://"
                  type="url"
                  value={meta.avatarUrl}
                />
                {metaErrors.avatarUrl ? (
                  <span className="mt-1 block text-caption font-normal text-accent">
                    {metaErrors.avatarUrl}
                  </span>
                ) : null}
              </label>
            </div>

            <details className="mt-6 border-t border-hairline pt-5">
              <summary className="cursor-pointer text-body font-bold text-ink">
                {t('seoSettings')}
              </summary>
              <div className="mt-4 grid gap-4">
                <label className={labelClass}>
                  {t('fields.seoTitle')}
                  <input
                    className={fieldClass}
                    maxLength={120}
                    onChange={(event) => updateMeta({ seoTitle: event.target.value })}
                    value={meta.seoTitle}
                  />
                </label>
                <label className={labelClass}>
                  {t('fields.seoDescription')}
                  <textarea
                    className={`${fieldClass} min-h-20 resize-y`}
                    maxLength={500}
                    onChange={(event) => updateMeta({ seoDesc: event.target.value })}
                    value={meta.seoDesc}
                  />
                </label>
              </div>
            </details>

            <details className="mt-5 border-t border-hairline pt-5">
              <summary className="cursor-pointer text-body font-bold text-ink">
                {t('cta')}{meta.ctaConfig ? ` · ${t('enabled')}` : ''}
              </summary>
              <div className="mt-4">
                {meta.ctaConfig ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 rounded-full bg-card-muted p-1">
                      {(['wechat', 'link'] as const).map((type) => (
                        <button
                          className={`rounded-full px-3 py-2 text-caption font-semibold ${
                            meta.ctaConfig?.type === type ? 'bg-card text-ink shadow-card' : 'text-muted'
                          }`}
                          key={type}
                          onClick={() => updateMeta({ ctaConfig: {
                            type,
                            label: meta.ctaConfig?.label ?? t('defaults.ctaLabel'),
                            value: type === 'link' ? 'https://example.com' : t('defaults.wechatId'),
                          } })}
                          type="button"
                        >
                          {t(`ctaTypes.${type}`)}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className={labelClass}>
                        {t('fields.ctaLabel')}
                        <input className={fieldClass} maxLength={12} onChange={(event) => updateMeta({ ctaConfig: meta.ctaConfig ? { ...meta.ctaConfig, label: event.target.value } : null })} value={meta.ctaConfig.label} />
                      </label>
                      <label className={labelClass}>
                        {meta.ctaConfig.type === 'wechat' ? t('fields.wechatId') : t('fields.url')}
                        <input className={fieldClass} onChange={(event) => updateMeta({ ctaConfig: meta.ctaConfig ? { ...meta.ctaConfig, value: event.target.value } : null })} type={meta.ctaConfig.type === 'link' ? 'url' : 'text'} value={meta.ctaConfig.value} />
                      </label>
                    </div>
                    {meta.ctaConfig.type === 'wechat' ? <p className="rounded-control bg-accent-soft p-3 text-caption text-muted">{t('ctaUniqueHint')}</p> : null}
                    {metaErrors.ctaConfig ? <p className="text-caption text-accent">{metaErrors.ctaConfig}</p> : null}
                    <button className="text-caption font-semibold text-accent" onClick={() => updateMeta({ ctaConfig: null })} type="button">{t('disableCta')}</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-body text-muted">{t('ctaDescription')}</p>
                    <button className={`${secondaryButtonClass} mt-3`} onClick={() => updateMeta({ ctaConfig: { type: 'link', label: t('defaults.ctaLabel'), value: 'https://example.com' } })} type="button">{t('enableCta')}</button>
                  </div>
                )}
              </div>
            </details>
          </section>

          {bentoVersion === 1 ? (
            <BentoCanvas
              blocks={blocks}
              canRedo={blockHistory.future.length > 0}
              canUndo={blockHistory.past.length > 0}
              onChange={(nextBlocks, nextAnnouncement) => {
                setBlockHistory((current) => commitHistory(current, nextBlocks));
                setIsDirty(true);
                setNotice({ kind: 'success', text: nextAnnouncement });
              }}
              onRedo={() => {
                setBlockHistory((current) => redoHistory(current));
                setIsDirty(true);
              }}
              onShuffle={() => {
                setBlockHistory((current) =>
                  commitHistory(current, randomizeBentoLayout(current.present)),
                );
                setIsDirty(true);
                setNotice(null);
              }}
              onTidy={() => {
                setBlockHistory((current) =>
                  commitHistory(current, tidyBentoLayout(current.present)),
                );
                setGuardrailWarnings([]);
                setIsDirty(true);
                setNotice(null);
              }}
              onUndo={() => {
                setBlockHistory((current) => undoHistory(current));
                setIsDirty(true);
              }}
            />
          ) : null}

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-section text-ink">
                  {t('blocks.title')}
                </h2>
                <p className="mt-1 text-caption text-muted">
                  {t('blocks.summary', { count: blocks.length, invalid: invalidBlockCount })}
                </p>
              </div>
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-full border border-hairline bg-card px-4 py-2.5 text-caption font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {t('blocks.add')}
                </summary>
                <div className="absolute right-0 z-30 mt-2 grid w-72 grid-cols-2 gap-2 rounded-card border border-hairline bg-card p-3 shadow-card">
                  {blockTypes.map((type) => (
                    <button
                      className="rounded-control border border-hairline p-3 text-left text-caption font-semibold text-ink hover:bg-accent-soft"
                      key={type}
                      onClick={() => addBlock(type)}
                      type="button"
                    >
                      {t(`blockTypes.${type}`)}
                    </button>
                  ))}
                </div>
              </details>
            </div>

            {blocks.length ? (
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                sensors={sensors}
              >
                <SortableContext
                  items={blocks.map((block) => block.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="mt-4 divide-y divide-hairline">
                    {blocks.map((block) => (
                      <SortableBlockEditor
                        block={block}
                        key={block.id}
                        layout={bentoVersion === 1 ? 'LIST' : meta.layout}
                        onChange={updateBlock}
                        onRemove={removeBlock}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="mt-4 rounded-card bg-card-muted p-8 text-center text-body text-muted">
                {t('blocks.empty')}
              </div>
            )}
          </section>
        </div>

        <aside
          className={`${mobileTab === 'preview' ? 'block' : 'hidden'} lg:sticky lg:top-28 lg:block`}
        >
          <div className="mb-3 flex items-center justify-between text-caption text-muted">
            <span>{t('livePreview')} · 375px</span>
            <span>{t('previewHint')}</span>
          </div>
          <div className="mx-auto w-full max-w-[375px] overflow-hidden rounded-card border border-hairline bg-card shadow-card">
            <div
              className="h-[720px] overflow-hidden bg-card"
              onClickCapture={(event) => event.preventDefault()}
            >
              <PublicPageRenderer page={previewPage} preview uaClass="browser" />
            </div>
          </div>
        </aside>
      </div>
      {bentoCandidate ? (
        <BentoConversionDialog
          blocks={blocks}
          candidate={bentoCandidate}
          isApplying={isApplyingBento}
          layout={meta.layout}
          onApply={() => void applyBentoConversion()}
          onCancel={() => setBentoCandidate(null)}
        />
      ) : null}
    </div>
  );
}
