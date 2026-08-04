import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { auth } from '@/lib/auth';

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
    <div className="mx-auto min-h-screen max-w-[1440px] bg-slate-50 lg:flex">
      <aside className="border-b border-slate-200 bg-white px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:flex-none lg:border-b-0 lg:border-r lg:p-5">
        <div className="flex items-center justify-between gap-4 lg:block">
          <Link className="text-lg font-extrabold tracking-tight text-slate-950" href="/">
            一链 <span className="text-blue-700">YiLink</span>
          </Link>
          <nav className="flex gap-1 lg:mt-8 lg:flex-col lg:gap-2">
            {navigation.map((item) => (
              <Link
                className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950 lg:rounded-xl"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:p-8">{children}</main>
    </div>
  );
}
