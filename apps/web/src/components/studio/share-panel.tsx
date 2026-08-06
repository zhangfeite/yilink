'use client';

/* eslint-disable @next/next/no-img-element */
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';

import type { PublicTheme } from '@/lib/themes';
import {
  generatePoster,
  posterFileName,
  PosterQrUnavailableError,
  type PosterSize,
} from '@/lib/poster';

interface SharePanelProps {
  avatarUrl: string;
  bio: string;
  pageId: string;
  publishSuccessSignal?: number;
  role: string;
  slug: string;
  theme: PublicTheme;
  title: string;
}

type PreviewState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; url: string }
  | { message: string; qrUnavailable: boolean; status: 'error' };

export interface SharePanelOpenState {
  handledPublishSuccessSignal: number;
  isOpen: boolean;
  openedAfterPublish: boolean;
}

export type DistributionCopyKind = 'moments' | 'xiaohongshu';

export function initialSharePanelOpenState(publishSuccessSignal = 0): SharePanelOpenState {
  return {
    handledPublishSuccessSignal: publishSuccessSignal,
    isOpen: false,
    openedAfterPublish: false,
  };
}

export function applyPublishSuccessSignal(
  state: SharePanelOpenState,
  publishSuccessSignal: number,
): SharePanelOpenState {
  if (publishSuccessSignal <= state.handledPublishSuccessSignal) return state;

  return {
    handledPublishSuccessSignal: publishSuccessSignal,
    isOpen: true,
    openedAfterPublish: true,
  };
}

export function nextPublishSuccessSignal(current: number): number {
  return current + 1;
}

export function distributionCopy(
  kind: DistributionCopyKind,
  locale: string,
  title: string,
  publicUrl: string,
): string {
  const isChinese = locale.startsWith('zh');
  if (kind === 'xiaohongshu') {
    return isChinese
      ? `我的作品和联系方式都整理在这里：${title}\n${publicUrl}`
      : `My work and contact details are all here: ${title}\n${publicUrl}`;
  }

  return isChinese
    ? `我的新主页上线了：${title}\n作品、链接和联系方式都在这里 → ${publicUrl}`
    : `My new page is live: ${title}\nFind my work, links, and contact details here → ${publicUrl}`;
}

export const sharePanelCopy = {
  'zh-CN': {
    close: '关闭分享面板',
    copied: '公开页链接已复制',
    copiedMoments: '朋友圈文案已复制',
    copiedXiaohongshu: '小红书简介文案已复制',
    copyFailed: '复制失败，请手动复制公开页地址',
    copyLink: '复制链接',
    copyMoments: '复制朋友圈文案',
    copyXiaohongshu: '复制小红书简介文案',
    downloadPoster: '下载海报',
    downloadQr: '下载二维码',
    generating: '正在生成清晰预览…',
    posterHint: '头像和二维码只在浏览器中合成，不会上传海报文件。',
    posterTitle: '生成分享海报',
    previewAlt: '当前主页的分享海报预览',
    publicPage: '主页链接',
    publishedKicker: '已发布！现在把它发出去',
    qrUnavailable: '二维码暂时不可用，海报下载已停用。请稍后重试。',
    retry: '重新生成',
    share: '分享',
    shareHint: '复制公开页地址、保存二维码，或生成主题海报。',
    shareTitle: '分享主页',
    sizePortrait: '通用 3:4',
    sizePortraitHint: '1080 × 1440',
    sizeStory: '竖屏 Story',
    sizeStoryHint: '1080 × 1920',
    unavailable: '当前浏览器无法生成海报，请重试或直接下载二维码。',
  },
  en: {
    close: 'Close share panel',
    copied: 'Public page link copied',
    copiedMoments: 'Moments copy copied',
    copiedXiaohongshu: 'Xiaohongshu bio copy copied',
    copyFailed: 'Could not copy. Please copy the public URL manually.',
    copyLink: 'Copy link',
    copyMoments: 'Copy Moments text',
    copyXiaohongshu: 'Copy Xiaohongshu bio',
    downloadPoster: 'Download poster',
    downloadQr: 'Download QR',
    generating: 'Generating a high-resolution preview…',
    posterHint: 'Your avatar and QR code are composed locally in this browser.',
    posterTitle: 'Create a share poster',
    previewAlt: 'Share poster preview for this page',
    publicPage: 'Public page',
    publishedKicker: 'Published! Now send it out',
    qrUnavailable: 'The QR code is unavailable, so poster download is disabled. Try again later.',
    retry: 'Generate again',
    share: 'Share',
    shareHint: 'Copy the public URL, save its QR code, or create a themed poster.',
    shareTitle: 'Share page',
    sizePortrait: 'Standard 3:4',
    sizePortraitHint: '1080 × 1440',
    sizeStory: 'Vertical story',
    sizeStoryHint: '1080 × 1920',
    unavailable: 'This browser could not create the poster. Retry or download the QR code instead.',
  },
} as const;

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="m4 4 10 10M14 4 4 14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 20 20" width="20">
      <rect
        height="11"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        width="11"
        x="6.5"
        y="6.5"
      />
      <path
        d="M4.5 13.5h-1a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M10 2.5v10m0 0 3.5-3.5M10 12.5 6.5 9M3 15.5v1h14v-1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="20" viewBox="0 0 20 20" width="20">
      <path d="M2 2h7v7H2V2Zm2 2v3h3V4H4Zm7-2h7v7h-7V2Zm2 2v3h3V4h-3ZM2 11h7v7H2v-7Zm2 2v3h3v-3H4Zm7-2h2v2h-2v-2Zm3 0h4v2h-4v-2Zm-3 3h2v4h-2v-4Zm3 1h2v-1h2v4h-4v-2h-2v-1Zm3-1h1v1h-1v-1Z" />
    </svg>
  );
}

function publicPageUrl(slug: string): string {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const path = `/p/${encodeURIComponent(slug)}`;
  if (configuredAppUrl) {
    try {
      return new URL(path, configuredAppUrl).toString();
    } catch {
      // Fall through to the current site when a deployment URL is malformed.
    }
  }
  return new URL(path, window.location.origin).toString();
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Copy command failed');
}

export function SharePanel({
  avatarUrl,
  bio,
  pageId,
  publishSuccessSignal = 0,
  role,
  slug,
  theme,
  title,
}: SharePanelProps) {
  const locale = useLocale();
  const text = sharePanelCopy[locale.startsWith('zh') ? 'zh-CN' : 'en'];
  const [panelState, setPanelState] = useState(() => {
    if (publishSuccessSignal === 0) return initialSharePanelOpenState();
    return applyPublishSuccessSignal(
      initialSharePanelOpenState(publishSuccessSignal - 1),
      publishSuccessSignal,
    );
  });
  const [size, setSize] = useState<PosterSize>('portrait');
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' });
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const isOpen = panelState.isOpen;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPanelState((current) => ({
          ...current,
          isOpen: false,
          openedAfterPublish: false,
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    let previewUrl: string | undefined;

    void generatePoster({
      avatarUrl: avatarUrl || null,
      bio: bio || null,
      pageId,
      publicUrl: publicPageUrl(slug),
      role: role || null,
      signal: controller.signal,
      size,
      slug,
      theme,
      title,
    })
      .then((blob) => {
        if (controller.signal.aborted) return;
        previewUrl = URL.createObjectURL(blob);
        setPreview({ status: 'ready', url: previewUrl });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const qrUnavailable = error instanceof PosterQrUnavailableError;
        setPreview({
          message: qrUnavailable ? text.qrUnavailable : text.unavailable,
          qrUnavailable,
          status: 'error',
        });
      });

    return () => {
      controller.abort();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [avatarUrl, bio, generation, isOpen, pageId, role, size, slug, text, theme, title]);

  async function handleCopy(kind: 'link' | DistributionCopyKind) {
    const pageUrl = publicPageUrl(slug);
    const value = kind === 'link' ? pageUrl : distributionCopy(kind, locale, title, pageUrl);
    const successNotice =
      kind === 'link'
        ? text.copied
        : kind === 'xiaohongshu'
          ? text.copiedXiaohongshu
          : text.copiedMoments;

    try {
      await copyText(value);
      setCopyNotice(successNotice);
    } catch {
      setCopyNotice(text.copyFailed);
    }
  }

  function downloadPoster() {
    if (preview.status !== 'ready') return;
    const anchor = document.createElement('a');
    anchor.download = posterFileName(slug);
    anchor.href = preview.url;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  const qrUnavailable = preview.status === 'error' && preview.qrUnavailable;
  const qrReady = preview.status === 'ready' || (preview.status === 'error' && !qrUnavailable);
  const pageUrl = isOpen ? publicPageUrl(slug) : '';

  return (
    <>
      <button
        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700"
        onClick={() => {
          setCopyNotice(null);
          setPreview({ status: 'loading' });
          setPanelState((current) => ({
            ...current,
            isOpen: true,
            openedAfterPublish: false,
          }));
        }}
        type="button"
      >
        {text.share}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setPanelState((current) => ({
                ...current,
                isOpen: false,
                openedAfterPublish: false,
              }));
            }
          }}
        >
          <section
            aria-labelledby="share-panel-title"
            aria-modal="true"
            className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:rounded-[2rem]"
            role="dialog"
          >
            <header className="sticky top-0 z-10 flex items-start gap-4 border-b border-slate-200 bg-slate-50/95 px-5 py-5 backdrop-blur sm:px-7">
              <div className="min-w-0 flex-1">
                <h2
                  className="text-xl font-extrabold tracking-tight text-slate-950"
                  id="share-panel-title"
                >
                  {text.shareTitle}
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">{text.shareHint}</p>
              </div>
              <button
                aria-label={text.close}
                autoFocus
                className="grid h-9 w-9 flex-none place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-slate-950"
                onClick={() =>
                  setPanelState((current) => ({
                    ...current,
                    isOpen: false,
                    openedAfterPublish: false,
                  }))
                }
                type="button"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="space-y-3 border-b border-slate-200 px-5 py-4 sm:px-7">
              {panelState.openedAfterPublish ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-800">
                  {text.publishedKicker}
                </p>
              ) : null}
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {text.publicPage}
                </span>
                <a
                  className="mt-1 block break-all text-sm font-semibold text-blue-700 hover:underline"
                  href={pageUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {pageUrl}
                </a>
              </div>
            </div>

            <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="flex min-h-24 flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-bold text-slate-800 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:border-blue-300 hover:text-blue-700"
                    onClick={() => void handleCopy('link')}
                    type="button"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500">
                      <CopyIcon />
                    </span>
                    {text.copyLink}
                  </button>
                  {qrReady ? (
                    <a
                      className="flex min-h-24 flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-bold text-slate-800 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:border-blue-300 hover:text-blue-700"
                      download
                      href={`/api/v1/pages/${encodeURIComponent(pageId)}/qr?format=png&size=512`}
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500">
                        <QrIcon />
                      </span>
                      {text.downloadQr}
                    </a>
                  ) : (
                    <button
                      className="flex min-h-24 cursor-not-allowed flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-bold text-slate-400 opacity-70"
                      disabled
                      type="button"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full border border-slate-200">
                        <QrIcon />
                      </span>
                      {text.downloadQr}
                    </button>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                  <button
                    className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs font-bold leading-5 text-slate-800 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:border-blue-300 hover:text-blue-700"
                    onClick={() => void handleCopy('xiaohongshu')}
                    type="button"
                  >
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-full border border-slate-200 text-slate-500">
                      <CopyIcon />
                    </span>
                    {text.copyXiaohongshu}
                  </button>
                  <button
                    className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs font-bold leading-5 text-slate-800 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:border-blue-300 hover:text-blue-700"
                    onClick={() => void handleCopy('moments')}
                    type="button"
                  >
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-full border border-slate-200 text-slate-500">
                      <CopyIcon />
                    </span>
                    {text.copyMoments}
                  </button>
                </div>
                <p aria-live="polite" className="mt-2 min-h-5 px-1 text-xs text-slate-500">
                  {copyNotice ?? ''}
                </p>

                <div className="mt-6">
                  <h3 className="text-base font-extrabold tracking-tight text-slate-950">
                    {text.posterTitle}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{text.posterHint}</p>
                  <div className="mt-4 grid gap-2">
                    {(
                      [
                        ['portrait', text.sizePortrait, text.sizePortraitHint],
                        ['story', text.sizeStory, text.sizeStoryHint],
                      ] as const
                    ).map(([value, label, hint]) => (
                      <button
                        aria-pressed={size === value}
                        className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                          size === value
                            ? 'border-blue-300 bg-blue-50 text-blue-950'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                        key={value}
                        onClick={() => {
                          if (size === value) return;
                          setPreview({ status: 'loading' });
                          setSize(value);
                        }}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className={`block w-7 flex-none rounded border-2 ${
                            value === 'portrait' ? 'aspect-[3/4]' : 'aspect-[9/16]'
                          } ${size === value ? 'border-blue-500' : 'border-slate-300'}`}
                        />
                        <span>
                          <strong className="block text-sm">{label}</strong>
                          <small className="mt-0.5 block text-[11px] font-medium text-slate-500">
                            {hint}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex min-h-[420px] flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <div className="grid flex-1 place-items-center overflow-hidden rounded-2xl bg-slate-100 p-4">
                  {preview.status === 'ready' ? (
                    <img
                      alt={text.previewAlt}
                      className={`max-h-[520px] w-auto rounded-xl object-contain shadow-[0_16px_40px_rgba(15,23,42,0.16)] ${
                        size === 'portrait' ? 'aspect-[3/4]' : 'aspect-[9/16]'
                      }`}
                      src={preview.url}
                    />
                  ) : preview.status === 'error' ? (
                    <div className="max-w-xs text-center">
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-slate-400">
                        <QrIcon />
                      </span>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{preview.message}</p>
                      <button
                        className="mt-3 text-xs font-bold text-blue-700 hover:underline"
                        onClick={() => {
                          setPreview({ status: 'loading' });
                          setGeneration((current) => current + 1);
                        }}
                        type="button"
                      >
                        {text.retry}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500" role="status">
                      <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                      <p className="mt-3 text-xs">{text.generating}</p>
                    </div>
                  )}
                </div>
                <button
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={preview.status !== 'ready'}
                  onClick={downloadPoster}
                  style={{ backgroundColor: theme.accent, color: theme.accentOn }}
                  type="button"
                >
                  <DownloadIcon />
                  {preview.status === 'loading' ? text.generating : text.downloadPoster}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
