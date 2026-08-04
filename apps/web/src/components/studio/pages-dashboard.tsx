'use client';

import { RESERVED_SLUGS, SLUG_PATTERN, type SceneTemplate } from '@yilink/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { persistPageRole } from '@/app/studio/actions';

import { createPageFromTemplate, studioApiRequest, StudioApiError } from './create-from-template';
import { studioThemes } from './theme-options';

interface PageSummary {
  id: string;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  updatedAt: string;
  _count: { blocks: number };
}

function statusClass(status: PageSummary['status']): string {
  if (status === 'PUBLISHED') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
  if (status === 'HIDDEN') return 'bg-rose-50 text-rose-700 ring-rose-600/20';
  return 'bg-amber-50 text-amber-700 ring-amber-600/20';
}

function errorKey(error: unknown): string {
  if (!(error instanceof StudioApiError)) return 'unexpected';
  if (error.code === 'SLUG_TAKEN') return 'slugTaken';
  if (error.code === 'PAGE_LIMIT') return 'pageLimit';
  if (error.code === 'INVALID_INPUT') return 'invalidInput';
  return 'unexpected';
}

export function PagesDashboard({ templates }: { templates: SceneTemplate[] }) {
  const t = useTranslations('Studio');
  const router = useRouter();
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? '');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const selectedTemplate =
    templates.find((template) => template.id === selectedId) ?? templates[0] ?? null;
  const themeById = useMemo(() => new Map(studioThemes.map((theme) => [theme.id, theme])), []);

  const loadPages = useCallback(async () => {
    await Promise.resolve();
    setIsLoading(true);
    setListError(false);
    try {
      const result = await studioApiRequest<{ pages: PageSummary[] }>(fetch, '/api/v1/pages');
      setPages(result.pages);
    } catch {
      setListError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void studioApiRequest<{ pages: PageSummary[] }>(fetch, '/api/v1/pages')
      .then((result) => {
        if (active) setPages(result.pages);
      })
      .catch(() => {
        if (active) setListError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreating) setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCreating, isOpen]);

  function openCreateFlow() {
    setStep('template');
    setSelectedId(templates[0]?.id ?? '');
    setSlug('');
    setTitle('');
    setCreateError(null);
    setIsOpen(true);
  }

  function continueToDetails() {
    if (!selectedTemplate) return;
    setTitle(selectedTemplate.identity.title);
    setCreateError(null);
    setStep('details');
  }

  async function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTemplate) return;
    const normalizedSlug = slug.trim();
    const isReserved = RESERVED_SLUGS.includes(normalizedSlug as (typeof RESERVED_SLUGS)[number]);
    if (!SLUG_PATTERN.test(normalizedSlug) || isReserved) {
      setCreateError(t('errors.slugInvalid'));
      return;
    }
    if (!title.trim()) {
      setCreateError(t('errors.titleRequired'));
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const page = await createPageFromTemplate({
        persistRole: persistPageRole,
        slug: normalizedSlug,
        template: selectedTemplate,
        title: title.trim(),
      });
      router.push(`/studio/pages/${page.id}`);
    } catch (error) {
      setCreateError(t(`errors.${errorKey(error)}`));
      setIsCreating(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-blue-700">{t('eyebrow')}</p>
          <h1
            className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl"
            data-testid="studio-heading"
          >
            {t('title')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{t('description')}</p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          onClick={openCreateFlow}
          type="button"
        >
          {t('newPage')}
        </button>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {isLoading
          ? [0, 1].map((item) => (
              <div
                aria-hidden="true"
                className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-white"
                key={item}
              />
            ))
          : null}

        {!isLoading && listError ? (
          <div className="col-span-full rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
            <p>{t('errors.loadPages')}</p>
            <button
              className="mt-3 font-semibold underline"
              onClick={() => void loadPages()}
              type="button"
            >
              {t('retry')}
            </button>
          </div>
        ) : null}

        {!isLoading && !listError && pages.length === 0 ? (
          <button
            className="col-span-full min-h-64 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-left transition hover:border-blue-400 hover:bg-blue-50/40"
            onClick={openCreateFlow}
            type="button"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-2xl font-light text-white">
              +
            </span>
            <strong className="mt-6 block text-xl text-slate-950">{t('emptyTitle')}</strong>
            <span className="mt-2 block max-w-md text-sm leading-6 text-slate-600">
              {t('emptyDescription')}
            </span>
          </button>
        ) : null}

        {!isLoading && !listError
          ? pages.map((page) => (
              <article
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
                key={page.id}
              >
                <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-blue-100 transition group-hover:scale-125" />
                <div className="relative">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(page.status)}`}
                  >
                    {t(`status.${page.status.toLowerCase()}`)}
                  </span>
                  <h2 className="mt-5 truncate text-2xl font-extrabold tracking-tight text-slate-950">
                    {page.title}
                  </h2>
                  <p className="mt-2 truncate text-sm text-slate-500">/p/{page.slug}</p>
                  <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                    <span className="text-xs text-slate-500">
                      {t('blockCount', { count: page._count.blocks })}
                    </span>
                    <Link
                      className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-blue-600 hover:text-white"
                      href={`/studio/pages/${page.id}`}
                    >
                      {t('editPage')}
                    </Link>
                  </div>
                </div>
              </article>
            ))
          : null}
      </div>

      {isOpen ? (
        <div
          aria-labelledby="create-page-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="my-auto w-full max-w-3xl rounded-[2rem] bg-white p-5 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                  {t('createStep', { current: step === 'template' ? 1 : 2, total: 2 })}
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight" id="create-page-title">
                  {step === 'template' ? t('chooseTemplate') : t('pageDetails')}
                </h2>
              </div>
              <button
                aria-label={t('close')}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200"
                disabled={isCreating}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            {step === 'template' ? (
              <>
                <p className="mt-3 text-sm leading-6 text-slate-600">{t('chooseTemplateHint')}</p>
                <div className="mt-6 grid max-h-[55vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                  {templates.map((template) => {
                    const theme = themeById.get(template.defaultTheme);
                    const selected = template.id === selectedId;
                    return (
                      <button
                        aria-pressed={selected}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600/15'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                        key={template.id}
                        onClick={() => setSelectedId(template.id)}
                        type="button"
                      >
                        <span className="flex items-center justify-between gap-3">
                          <strong className="text-base text-slate-950">{template.nameZh}</strong>
                          <span
                            aria-label={theme?.nameZh ?? template.defaultTheme}
                            className="h-5 w-5 flex-none rounded-full border-2 border-white shadow ring-1 ring-slate-200"
                            style={{ background: theme?.accent ?? '#1c1c1a' }}
                          />
                        </span>
                        <span className="mt-2 block text-xs font-semibold text-blue-700">
                          {template.persona}
                        </span>
                        <span className="mt-3 block text-sm leading-5 text-slate-600">
                          {template.identity.bio}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!selectedTemplate}
                    onClick={continueToDetails}
                    type="button"
                  >
                    {t('continue')}
                  </button>
                </div>
              </>
            ) : (
              <form className="mt-6" onSubmit={submitCreate}>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  {t('selectedTemplate')}:{' '}
                  <strong className="text-slate-950">{selectedTemplate?.nameZh}</strong>
                </div>
                <label
                  className="mt-5 block text-sm font-semibold text-slate-800"
                  htmlFor="new-page-slug"
                >
                  {t('slugLabel')}
                </label>
                <div className="mt-2 flex rounded-xl border border-slate-300 bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15">
                  <span className="flex items-center border-r border-slate-200 px-3 text-sm text-slate-500">
                    /p/
                  </span>
                  <input
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-r-xl px-3 py-3 text-sm outline-none"
                    id="new-page-slug"
                    maxLength={30}
                    onChange={(event) => setSlug(event.target.value.toLowerCase())}
                    placeholder={t('slugPlaceholder')}
                    value={slug}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">{t('slugHint')}</p>

                <label
                  className="mt-5 block text-sm font-semibold text-slate-800"
                  htmlFor="new-page-title"
                >
                  {t('pageTitleLabel')}
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  id="new-page-title"
                  maxLength={120}
                  onChange={(event) => setTitle(event.target.value)}
                  value={title}
                />

                {createError ? (
                  <p
                    className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
                    role="alert"
                  >
                    {createError}
                  </p>
                ) : null}

                <div className="mt-7 flex items-center justify-between gap-4">
                  <button
                    className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    disabled={isCreating}
                    onClick={() => setStep('template')}
                    type="button"
                  >
                    {t('back')}
                  </button>
                  <button
                    className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-50"
                    disabled={isCreating}
                    type="submit"
                  >
                    {isCreating ? t('creating') : t('createAndEdit')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
