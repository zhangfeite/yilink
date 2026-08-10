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

function statusClass(status: EditorStatus): string {
  if (status === 'PUBLISHED') return 'bg-emerald-50 text-emerald-700';
  if (status === 'HIDDEN') return 'bg-rose-50 text-rose-700';
  if (status === 'REVIEW') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
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
  const [blocks, setBlocks] = useState(initialPage.blocks);
  const [status, setStatus] = useState<EditorStatus>(initialPage.status);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageAction, setPageAction] = useState<'publish' | 'unpublish' | null>(null);
  const [publishSuccessSignal, setPublishSuccessSignal] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
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
    setBlocks((current) => current.map((block) => (block.id === nextBlock.id ? nextBlock : block)));
    setIsDirty(true);
    setNotice(null);
  }

  function removeBlock(id: string) {
    setBlocks((current) => current.filter((block) => block.id !== id));
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
    setBlocks((current) => [
      ...current,
      { id, type, size: 'MD', isVisible: true, config: defaultConfig(type) },
    ]);
    setIsDirty(true);
    setNotice(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((current) => {
      const from = current.findIndex((block) => block.id === active.id);
      const to = current.findIndex((block) => block.id === over.id);
      return from < 0 || to < 0 ? current : arrayMove(current, from, to);
    });
    setIsDirty(true);
    setNotice(null);
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
    try {
      const layoutResult = await studioApiRequest<BlocksSaveResponse>(
        fetch,
        `/api/v1/pages/${initialPage.id}/layout`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: meta.title.trim(),
            bio: meta.bio.trim() || null,
            avatarUrl: meta.avatarUrl.trim() || null,
            layout: meta.layout,
            bentoVersion: null,
            themeId: meta.themeId,
            seoTitle: meta.seoTitle.trim() || null,
            seoDesc: meta.seoDesc.trim() || null,
            ctaConfig: meta.ctaConfig,
            themeConfig: { ...recordValue(initialPage.themeConfig), role: meta.role.trim() },
            blocks: blocks.map(({ id, type, size, isVisible, config, placement }) => ({
              id,
              type,
              size,
              isVisible,
              config,
              placement,
            })),
          }),
        },
      );
      setStatus(layoutResult.page.status);
      setBlocks(layoutResult.blocks);
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
    themeId: meta.themeId,
    themeConfig: { ...recordValue(initialPage.themeConfig), role: meta.role },
    ctaConfig: meta.ctaConfig,
    totalViews: 0,
    blocks: blocks
      .filter((block) => block.isVisible)
      .map(({ id, type, size, config }) => ({ id, type, size, config })),
  };

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <header className="sticky top-0 z-40 -mx-4 -mt-6 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            aria-label={t('backToPages')}
            className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-950"
            href="/studio"
          >
            ← {t('back')}
          </Link>
          <div className="mr-auto min-w-0">
            <div className="flex items-center gap-2">
              <strong className="max-w-48 truncate text-sm text-slate-950 sm:max-w-72">
                {meta.title}
              </strong>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(status)}`}
              >
                {t(`status.${status.toLowerCase()}`)}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${isDirty ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
              {isDirty ? t('unsaved') : t('allSaved')}
            </p>
          </div>

          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm [&::-webkit-details-marker]:hidden">
              <span
                className="h-4 w-4 rounded-full border border-white shadow ring-1 ring-slate-200"
                style={{ background: currentTheme?.accent }}
              />
              {t('theme')}
            </summary>
            <div className="absolute right-0 z-50 mt-2 grid w-64 grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              {studioThemes.map((theme) => (
                <button
                  aria-pressed={meta.themeId === theme.id}
                  className={`flex items-center gap-2 rounded-xl p-2 text-left text-xs font-semibold ${
                    meta.themeId === theme.id ? 'bg-blue-50 text-blue-800' : 'hover:bg-slate-50'
                  }`}
                  key={theme.id}
                  onClick={() => updateMeta({ themeId: theme.id })}
                  type="button"
                >
                  <span
                    className="h-5 w-5 flex-none rounded-full border-2 border-white shadow ring-1 ring-slate-200"
                    style={{ background: theme.accent }}
                  />
                  {theme.nameZh}
                </button>
              ))}
            </div>
          </details>

          <div className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {(['LIST', 'GRID'] as const).map((layout) => (
              <button
                aria-pressed={meta.layout === layout}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  meta.layout === layout ? 'bg-slate-950 text-white' : 'text-slate-600'
                }`}
                key={layout}
                onClick={() => updateMeta({ layout })}
                type="button"
              >
                {t(`layouts.${layout.toLowerCase()}`)}
              </button>
            ))}
          </div>

          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm [&::-webkit-details-marker]:hidden">
              {t('cta')}
              {meta.ctaConfig ? ` · ${t('enabled')}` : ''}
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              {meta.ctaConfig ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                    {(['wechat', 'link'] as const).map((type) => (
                      <button
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                          meta.ctaConfig?.type === type
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'text-slate-500'
                        }`}
                        key={type}
                        onClick={() =>
                          updateMeta({
                            ctaConfig: {
                              type,
                              label: meta.ctaConfig?.label ?? t('defaults.ctaLabel'),
                              value:
                                type === 'link' ? 'https://example.com' : t('defaults.wechatId'),
                            },
                          })
                        }
                        type="button"
                      >
                        {t(`ctaTypes.${type}`)}
                      </button>
                    ))}
                  </div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('fields.ctaLabel')}
                    <input
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      maxLength={12}
                      onChange={(event) =>
                        updateMeta({
                          ctaConfig: meta.ctaConfig
                            ? { ...meta.ctaConfig, label: event.target.value }
                            : null,
                        })
                      }
                      value={meta.ctaConfig.label}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    {meta.ctaConfig.type === 'wechat' ? t('fields.wechatId') : t('fields.url')}
                    <input
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      onChange={(event) =>
                        updateMeta({
                          ctaConfig: meta.ctaConfig
                            ? { ...meta.ctaConfig, value: event.target.value }
                            : null,
                        })
                      }
                      type={meta.ctaConfig.type === 'link' ? 'url' : 'text'}
                      value={meta.ctaConfig.value}
                    />
                  </label>
                  {meta.ctaConfig.type === 'wechat' ? (
                    <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                      {t('ctaUniqueHint')}
                    </p>
                  ) : null}
                  {metaErrors.ctaConfig ? (
                    <p className="text-xs text-rose-600">{metaErrors.ctaConfig}</p>
                  ) : null}
                  <button
                    className="text-xs font-semibold text-rose-600 hover:underline"
                    onClick={() => updateMeta({ ctaConfig: null })}
                    type="button"
                  >
                    {t('disableCta')}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm leading-6 text-slate-600">{t('ctaDescription')}</p>
                  <button
                    className="mt-3 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white"
                    onClick={() =>
                      updateMeta({
                        ctaConfig: {
                          type: 'link',
                          label: t('defaults.ctaLabel'),
                          value: 'https://example.com',
                        },
                      })
                    }
                    type="button"
                  >
                    {t('enableCta')}
                  </button>
                </div>
              )}
            </div>
          </details>

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
            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm disabled:cursor-wait disabled:opacity-50"
            disabled={isSaving || pageAction !== null}
            onClick={() => void saveDraft()}
            type="button"
          >
            {isSaving ? t('saving') : t('save')}
          </button>
          {status === 'PUBLISHED' ? (
            <button
              className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-50"
              disabled={pageAction !== null || isSaving}
              onClick={() => void unpublishPage()}
              type="button"
            >
              {pageAction === 'unpublish' ? t('unpublishing') : t('unpublish')}
            </button>
          ) : (
            <button
              className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-50"
              disabled={pageAction !== null || isSaving}
              onClick={() => void publishPage()}
              type="button"
            >
              {pageAction === 'publish' ? t('publishing') : t('publish')}
            </button>
          )}
        </div>
        {notice ? (
          <p
            aria-live="polite"
            className={`mt-2 rounded-xl px-3 py-2 text-xs ${
              notice.kind === 'error'
                ? 'bg-rose-50 text-rose-700'
                : notice.kind === 'review'
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {notice.text}
          </p>
        ) : null}
      </header>

      <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-200 p-1 lg:hidden">
        {(['edit', 'preview'] as const).map((tab) => (
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              mobileTab === tab ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
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
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-950">
                  {t('pageSettings')}
                </h2>
                <p className="mt-1 text-xs text-slate-500">{t('pageSettingsHint')}</p>
              </div>
              <div
                className="relative grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-2xl text-xl font-bold text-white shadow-sm"
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
              <label className="text-sm font-semibold text-slate-800">
                {t('fields.pageTitle')}
                <input
                  aria-invalid={Boolean(metaErrors.title)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                  maxLength={120}
                  onChange={(event) => updateMeta({ title: event.target.value })}
                  value={meta.title}
                />
                {metaErrors.title ? (
                  <span className="mt-1 block text-xs font-normal text-rose-600">
                    {metaErrors.title}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-semibold text-slate-800">
                {t('fields.role')}
                <input
                  aria-invalid={Boolean(metaErrors.role)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                  maxLength={24}
                  onChange={(event) => updateMeta({ role: event.target.value })}
                  value={meta.role}
                />
                {metaErrors.role ? (
                  <span className="mt-1 block text-xs font-normal text-rose-600">
                    {metaErrors.role}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-semibold text-slate-800 sm:col-span-2">
                {t('fields.bio')}
                <textarea
                  aria-invalid={Boolean(metaErrors.bio)}
                  className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal leading-6 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                  maxLength={500}
                  onChange={(event) => updateMeta({ bio: event.target.value })}
                  value={meta.bio}
                />
                <span className="mt-1 flex justify-between text-xs font-normal text-slate-400">
                  <span>{metaErrors.bio ?? ''}</span>
                  <span>{meta.bio.length}/500</span>
                </span>
              </label>
              <label className="text-sm font-semibold text-slate-800 sm:col-span-2">
                {t('fields.avatarUrl')}
                <input
                  aria-invalid={Boolean(metaErrors.avatarUrl)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                  onChange={(event) => updateMeta({ avatarUrl: event.target.value })}
                  placeholder="https://"
                  type="url"
                  value={meta.avatarUrl}
                />
                {metaErrors.avatarUrl ? (
                  <span className="mt-1 block text-xs font-normal text-rose-600">
                    {metaErrors.avatarUrl}
                  </span>
                ) : null}
              </label>
            </div>

            <details className="mt-5 border-t border-slate-100 pt-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-700">
                {t('seoSettings')}
              </summary>
              <div className="mt-4 grid gap-4">
                <label className="text-sm font-semibold text-slate-800">
                  {t('fields.seoTitle')}
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
                    maxLength={120}
                    onChange={(event) => updateMeta({ seoTitle: event.target.value })}
                    value={meta.seoTitle}
                  />
                </label>
                <label className="text-sm font-semibold text-slate-800">
                  {t('fields.seoDescription')}
                  <textarea
                    className="mt-1.5 min-h-20 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"
                    maxLength={500}
                    onChange={(event) => updateMeta({ seoDesc: event.target.value })}
                    value={meta.seoDesc}
                  />
                </label>
              </div>
            </details>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-950">
                  {t('blocks.title')}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {t('blocks.summary', { count: blocks.length, invalid: invalidBlockCount })}
                </p>
              </div>
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-full bg-slate-950 px-4 py-2.5 text-xs font-bold text-white [&::-webkit-details-marker]:hidden">
                  {t('blocks.add')}
                </summary>
                <div className="absolute right-0 z-30 mt-2 grid w-72 grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  {blockTypes.map((type) => (
                    <button
                      className="rounded-xl border border-slate-100 p-3 text-left text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
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
                  <div className="mt-4 space-y-3">
                    {blocks.map((block) => (
                      <SortableBlockEditor
                        block={block}
                        key={block.id}
                        layout={meta.layout}
                        onChange={updateBlock}
                        onRemove={removeBlock}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                {t('blocks.empty')}
              </div>
            )}
          </section>
        </div>

        <aside
          className={`${mobileTab === 'preview' ? 'block' : 'hidden'} lg:sticky lg:top-28 lg:block`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-950">{t('livePreview')}</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">{t('previewHint')}</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 shadow-sm">
              375px
            </span>
          </div>
          <div className="mx-auto w-full max-w-[375px] rounded-[2.25rem] bg-slate-950 p-[7px] shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
            <div
              className="h-[720px] overflow-hidden rounded-[1.85rem] bg-white"
              onClickCapture={(event) => event.preventDefault()}
            >
              <PublicPageRenderer page={previewPage} preview uaClass="browser" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
