import { pageCacheTag } from '@yilink/shared';
import type { Metadata, Viewport } from 'next';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';

import {
  PublicPageRenderer,
  UnavailablePage,
  type PublicPageData,
} from '@/components/public/public-page';
import { WechatShare } from '@/components/public/wechat-share';
import { db } from '@/lib/db';
import { getTheme, isDarkTheme } from '@/lib/themes';
import { classifyUserAgent } from '@/lib/ua';
import { getWechatJssdkConfig, wechatJssdkEnabled } from '@/lib/wechat-jssdk';

interface PublicPageProps {
  params: Promise<{ slug: string }>;
}

async function queryPublicPage(slug: string) {
  const page = await db.page.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      bio: true,
      avatarUrl: true,
      layout: true,
      themeId: true,
      themeConfig: true,
      seoTitle: true,
      seoDesc: true,
      status: true,
      ctaConfig: true,
      blocks: {
        where: { isVisible: true },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          type: true,
          size: true,
          config: true,
        },
      },
    },
  });

  if (!page) {
    const unavailablePage = await db.page.findUnique({ where: { slug }, select: { status: true } });
    if (!unavailablePage) return null;
    if (unavailablePage.status === 'HIDDEN') return { status: 'HIDDEN' as const };
    return { status: 'DRAFT' as const };
  }

  const views = await db.dailyStat.aggregate({
    where: { pageId: page.id },
    _sum: { views: true },
  });

  return { ...page, status: 'PUBLISHED' as const, totalViews: views._sum.views ?? 0 };
}

function cachedPublicPage(slug: string) {
  return unstable_cache(() => queryPublicPage(slug), ['public-page-renderer', slug], {
    tags: [pageCacheTag(slug)],
  })();
}

const loadPublicPage = cache(cachedPublicPage);

function forwardedHeader(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null;
}

async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host =
    forwardedHeader(requestHeaders.get('x-forwarded-host')) ??
    requestHeaders.get('host') ??
    'localhost:3000';
  const forwardedProto = forwardedHeader(requestHeaders.get('x-forwarded-proto'));
  const protocol =
    forwardedProto === 'http' || forwardedProto === 'https'
      ? forwardedProto
      : host.startsWith('localhost') || host.startsWith('127.0.0.1')
        ? 'http'
        : 'https';

  return `${protocol}://${host}`;
}

async function absoluteImageUrl(value: string | null): Promise<string | undefined> {
  if (!value) return undefined;
  try {
    const url = new URL(value, await requestOrigin());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPublicPage(slug);

  if (!page || page.status === 'DRAFT') {
    return { title: '页面不存在' };
  }

  if (page.status === 'HIDDEN') {
    return {
      title: '页面暂不可用',
      description: '这个页面现在无法访问，请稍后再试。',
    };
  }

  const title = page.seoTitle?.trim() || page.title;
  const description = page.seoDesc?.trim() || page.bio?.trim() || undefined;
  // 分享卡片缩略图：头像优先，无头像回落品牌兜底图（微信/QQ 会话卡片取 og:image）
  const avatarUrl = await absoluteImageUrl(page.avatarUrl);
  const shareImage = avatarUrl ?? new URL('/share-default.png', await requestOrigin()).toString();

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      images: [{ url: shareImage, alt: `${page.title}的主页` }],
    },
  };
}

export async function generateViewport({ params }: PublicPageProps): Promise<Viewport> {
  const { slug } = await params;
  const page = await loadPublicPage(slug);
  if (!page || page.status !== 'PUBLISHED') {
    return { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
  }

  const theme = getTheme(page.themeId);
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    // 按主题声明明暗与浏览器 UI 色：阻止微信安卓「强制深色」反转浅色主题、避免暗色主题被套浅色框
    themeColor: theme.neutral.pageBg,
    colorScheme: isDarkTheme(theme) ? 'dark' : 'light',
  };
}

export default async function PublicPage({ params }: PublicPageProps) {
  const { slug } = await params;
  const page = await loadPublicPage(slug);

  if (!page || page.status === 'DRAFT') notFound();
  if (page.status === 'HIDDEN') return <UnavailablePage />;
  if (page.status !== 'PUBLISHED') notFound();

  const requestHeaders = await headers();
  const uaClass = classifyUserAgent(requestHeaders.get('user-agent'));

  // 微信内 + 已配置公众号 JS-SDK：注入自定义分享卡片（标题/摘要/缩略图）；否则零开销
  let wechatShare: ReactNode = null;
  if (uaClass === 'wechat' && wechatJssdkEnabled()) {
    const origin = await requestOrigin();
    const pagesHost = process.env.PAGES_HOST?.trim();
    const host = requestHeaders.get('host')?.toLowerCase() ?? '';
    const pageUrl =
      pagesHost && host === pagesHost.toLowerCase()
        ? `${origin}/${page.slug}`
        : `${origin}/p/${page.slug}`;
    const config = await getWechatJssdkConfig(pageUrl);
    if (config) {
      const avatarUrl = await absoluteImageUrl(page.avatarUrl);
      wechatShare = (
        <WechatShare
          config={config}
          share={{
            title: page.seoTitle?.trim() || page.title,
            desc: page.seoDesc?.trim() || page.bio?.trim() || `${page.title} 的主页`,
            link: pageUrl,
            imgUrl: avatarUrl ?? new URL('/share-default.png', origin).toString(),
          }}
        />
      );
    }
  }

  return (
    <>
      {wechatShare}
      <PublicPageRenderer page={page satisfies PublicPageData} uaClass={uaClass} />
    </>
  );
}
