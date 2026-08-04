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
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <aside className="w-56 border-r border-slate-200 bg-white p-5">
        <Link className="text-lg font-semibold" href="/">
          一链 YiLink
        </Link>
        <nav className="mt-8 flex flex-col gap-2">
          {navigation.map((item) => (
            <Link
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
