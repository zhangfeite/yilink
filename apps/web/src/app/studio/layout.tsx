import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { auth } from '@/lib/auth';

import { StudioNavigation } from './studio-navigation';

export default async function StudioLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const t = await getTranslations('Navigation');
  const navigation = [
    { href: '/studio', label: t('home') },
    { href: '/studio/data', label: t('data') },
    { href: '/studio/settings', label: t('settings') },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[1440px] bg-page text-ink antialiased lg:flex">
      <aside className="bg-page px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:flex-none lg:p-6">
        <div className="flex items-center justify-between gap-4 lg:block">
          <Link
            className="inline-flex items-center gap-3 text-section font-extrabold text-ink"
            href="/"
          >
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-full border border-accent text-section text-accent"
            >
              一
            </span>
            <span>一链 YiLink</span>
          </Link>
          <StudioNavigation items={navigation} />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">{children}</main>
    </div>
  );
}
