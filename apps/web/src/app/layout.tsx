import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { siteOrigin } from '@/lib/origin';

import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 微信全屏 WebView 下启用安全区变量（env(safe-area-inset-*)）
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  const origin = await siteOrigin();
  const title = t('title');
  const description = t('description');

  // 分享卡片是发布传播的第一现场：帖子里的链接、微信转发、即刻卡片都读这几个标签。
  // 缺了它们，站点被转发出去就是一张白卡。公开页有自己的 generateMetadata 覆盖这里。
  return {
    metadataBase: new URL(origin),
    title,
    description,
    applicationName: title,
    openGraph: {
      type: 'website',
      siteName: title,
      title,
      description,
      url: origin,
      locale: 'zh_CN',
      images: [{ url: '/share-default.png', alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/share-default.png'],
    },
    alternates: { canonical: origin },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
