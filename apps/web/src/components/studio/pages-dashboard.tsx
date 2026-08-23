'use client';

import { RESERVED_SLUGS, SLUG_PATTERN, type SceneTemplate } from '@yilink/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PublicPageRenderer, type PublicPageData } from '@/components/public/public-page';

import {
  createPageFromTemplate,
  studioApiRequest,
  StudioApiError,
  TemplateApplyError,
} from './create-from-template';
import { studioThemes } from './theme-options';

interface PageSummary {
  id: string;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  themeId: string;
  updatedAt: string;
  _count: { blocks: number };
}

function errorKey(error: unknown): string {
  if (!(error instanceof StudioApiError)) return 'unexpected';
  if (error.code === 'SLUG_TAKEN') return 'slugTaken';
  if (error.code === 'PAGE_LIMIT') return 'pageLimit';
  if (error.code === 'INVALID_INPUT') return 'invalidInput';
  return 'unexpected';
}

function templatePage(template: SceneTemplate): PublicPageData {
  return {
    avatarUrl: null,
    bentoVersion: template.bentoVersion,
    bio: template.identity.bio,
    blocks: template.blocks.map((block, index) => ({
      ...block,
      id: `empty-preview-${index}`,
    })),
    ctaConfig: template.cta,
    layout: template.layout,
    slug: template.id,
    themeConfig: { role: template.identity.role },
    themeId: template.defaultTheme,
    title: template.identity.title,
    totalViews: 108116,
  };
}

export function PagesDashboard({ templates }: { templates: SceneTemplate[] }) {
  const t = useTranslations('Studio');
  const locale = useLocale();
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
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    [locale],
  );

  const loadPages = useCallback(async () => {
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
        slug: normalizedSlug,
        template: selectedTemplate,
        title: title.trim(),
      });
      router.push(`/studio/pages/${page.id}`);
    } catch (error) {
      if (error instanceof TemplateApplyError) {
        void loadPages();
        setCreateError(t('errors.templateApplyFailed'));
      } else {
        setCreateError(t(`errors.${errorKey(error)}`));
      }
      setIsCreating(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption font-semibold tracking-wide text-accent">{t('eyebrow')}</p>
          <h1 className="mt-2 text-display text-ink" data-testid="studio-heading">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-2xl text-body text-muted">{t('description')}</p>
        </div>
        {!isLoading && !listError && pages.length > 0 ? (
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-body font-semibold text-accent-on"
            onClick={openCreateFlow}
            type="button"
          >
            {t('newPage')}
          </button>
        ) : null}
      </header>

      <div className="mt-10 grid gap-5">
        {isLoading
          ? [0, 1].map((item) => (
              <div
                aria-hidden="true"
                className="h-32 animate-pulse rounded-card bg-card"
                key={item}
              />
            ))
          : null}

        {!isLoading && listError ? (
          <div className="rounded-card bg-danger-soft p-6 text-body text-danger">
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

        {!isLoading && !listError && pages.length === 0 && templates[0] ? (
          <section className="relative grid min-h-[420px] overflow-hidden rounded-card bg-card p-8 shadow-card sm:grid-cols-2 sm:items-center sm:gap-8 lg:p-12">
            <div className="relative z-10">
              <p className="text-caption font-semibold tracking-wide text-accent">
                {t('emptyEyebrow')}
              </p>
              <h2 className="mt-2 text-display text-ink">{t('emptyTitle')}</h2>
              <p className="mt-4 max-w-md text-body text-muted">{t('emptyDescription')}</p>
              <button
                className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-body font-semibold text-accent-on"
                onClick={openCreateFlow}
                type="button"
              >
                {t('newPage')}
              </button>
            </div>
            <div className="relative hidden h-[340px] sm:block" aria-hidden="true">
              <div className="absolute inset-0 m-auto h-[440px] w-[250px] rotate-[-3deg] overflow-hidden rounded-card border border-hairline bg-card shadow-raised">
                <div className="w-[375px] origin-top-left scale-[0.64]">
                  <PublicPageRenderer page={templatePage(templates[0])} preview uaClass="browser" />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {!isLoading && !listError
          ? pages.map((page) => {
              const theme = themeById.get(page.themeId);
              return (
                <article
                  className="group flex flex-col gap-5 rounded-card bg-card p-6 shadow-card transition hover:shadow-raised sm:flex-row sm:items-center"
                  key={page.id}
                >
                  <div
                    className="grid h-14 w-14 flex-none place-items-center rounded-control border border-hairline text-section font-extrabold"
                    style={{ backgroundColor: theme?.neutral.pageBg, color: theme?.accent }}
                  >
                    {page.title.trim().charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-section text-ink">{page.title}</h2>
                      <span
                        className={`text-caption font-semibold ${
                          page.status === 'PUBLISHED' ? 'text-accent' : 'text-muted'
                        } ${page.status === 'HIDDEN' ? 'italic' : ''}`}
                      >
                        {t(`status.${page.status.toLowerCase()}`)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-caption text-muted">/p/{page.slug}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-muted sm:justify-end">
                    <span>{t('blockCount', { count: page._count.blocks })}</span>
                    <span>
                      {t('updatedAt', { date: dateFormatter.format(new Date(page.updatedAt)) })}
                    </span>
                  </div>
                  <Link
                    className="inline-flex min-h-10 flex-none items-center justify-center rounded-full border border-hairline bg-card px-4 text-body font-semibold text-ink group-hover:border-accent"
                    href={`/studio/pages/${page.id}`}
                  >
                    {t('editPage')}
                  </Link>
                </article>
              );
            })
          : null}
      </div>

      {isOpen ? (
        <div
          aria-labelledby="create-page-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-page/95 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="my-auto w-full max-w-3xl rounded-card bg-card shadow-raised">
            <div className="flex items-start justify-between gap-4 p-6 sm:p-8">
              <div>
                <p className="text-caption font-semibold tracking-wide text-accent">
                  {t('createStep', { current: step === 'template' ? 1 : 2, total: 2 })}
                </p>
                <h2 className="mt-2 text-section text-ink" id="create-page-title">
                  {step === 'template' ? t('chooseTemplate') : t('pageDetails')}
                </h2>
              </div>
              <button
                aria-label={t('close')}
                className="grid h-10 w-10 place-items-center rounded-full bg-card-muted text-section text-muted"
                disabled={isCreating}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            {step === 'template' ? (
              <>
                <div className="px-6 pb-6 sm:px-8">
                  <p className="text-body text-muted">{t('chooseTemplateHint')}</p>
                  <div className="mt-6 grid max-h-[55vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                    {templates.map((template) => {
                      const theme = themeById.get(template.defaultTheme);
                      const selected = template.id === selectedId;
                      return (
                        <button
                          aria-pressed={selected}
                          className={`rounded-control border p-4 text-left transition ${
                            selected
                              ? 'border-accent bg-accent-soft'
                              : 'border-hairline bg-card hover:bg-card-muted'
                          }`}
                          key={template.id}
                          onClick={() => setSelectedId(template.id)}
                          type="button"
                        >
                          <span className="flex items-center justify-between gap-3">
                            <strong className="text-section text-ink">{template.nameZh}</strong>
                            <span
                              aria-label={theme?.nameZh ?? template.defaultTheme}
                              className="h-5 w-5 flex-none rounded-full border border-hairline"
                              style={{ backgroundColor: theme?.accent }}
                            />
                          </span>
                          <span className="mt-2 block text-caption font-semibold text-accent">
                            {template.persona}
                          </span>
                          <span className="mt-3 block text-body text-muted">
                            {template.identity.bio}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end border-t border-hairline p-5 sm:px-8">
                  <button
                    className="rounded-full bg-accent px-6 py-3 text-body font-semibold text-accent-on disabled:opacity-40"
                    disabled={!selectedTemplate}
                    onClick={continueToDetails}
                    type="button"
                  >
                    {t('continue')}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={submitCreate}>
                <div className="px-6 pb-8 sm:px-8">
                  <div className="rounded-control bg-card-muted p-4 text-body text-muted">
                    {t('selectedTemplate')}:{' '}
                    <strong className="text-ink">{selectedTemplate?.nameZh}</strong>
                  </div>
                  <label
                    className="mt-6 block text-caption font-semibold text-ink"
                    htmlFor="new-page-slug"
                  >
                    {t('slugLabel')}
                  </label>
                  <div className="mt-2 flex rounded-control border border-hairline bg-card focus-within:border-accent">
                    <span className="flex items-center border-r border-hairline px-3 text-caption text-muted">
                      yilink.app/p/
                    </span>
                    <input
                      autoComplete="off"
                      className="min-w-0 flex-1 rounded-control bg-card px-3 py-3 text-body text-ink outline-none"
                      id="new-page-slug"
                      maxLength={30}
                      onChange={(event) => setSlug(event.target.value.toLowerCase())}
                      placeholder={t('slugPlaceholder')}
                      value={slug}
                    />
                  </div>
                  <p className="mt-2 text-caption text-muted">{t('slugHint')}</p>

                  <label
                    className="mt-6 block text-caption font-semibold text-ink"
                    htmlFor="new-page-title"
                  >
                    {t('pageTitleLabel')}
                  </label>
                  <input
                    className="mt-2 w-full rounded-control border border-hairline bg-card px-3 py-3 text-body text-ink outline-none"
                    id="new-page-title"
                    maxLength={120}
                    onChange={(event) => setTitle(event.target.value)}
                    value={title}
                  />

                  {createError ? (
                    <p
                      className="mt-4 rounded-control bg-danger-soft px-4 py-3 text-body text-danger"
                      role="alert"
                    >
                      {createError}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-hairline p-5 sm:px-8">
                  <button
                    className="rounded-full border border-hairline bg-card px-4 py-2 text-body font-semibold text-ink"
                    disabled={isCreating}
                    onClick={() => setStep('template')}
                    type="button"
                  >
                    {t('back')}
                  </button>
                  <button
                    className="rounded-full bg-accent px-6 py-3 text-body font-semibold text-accent-on disabled:opacity-50"
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
