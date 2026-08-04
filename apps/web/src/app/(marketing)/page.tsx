import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function MarketingPage() {
  const t = await getTranslations('Marketing');

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
      <nav className="flex items-center justify-between">
        <span className="text-lg font-semibold">一链 YiLink</span>
        <div className="flex gap-4 text-sm">
          <Link href="/login">{t('login')}</Link>
          <Link href="/register">{t('register')}</Link>
        </div>
      </nav>

      <section className="flex flex-1 flex-col items-start justify-center py-20">
        <p className="mb-4 text-sm font-semibold tracking-wide text-emerald-700">一链 YiLink</p>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">{t('tagline')}</h1>
        <p className="mt-6 max-w-xl text-lg text-slate-600">{t('description')}</p>
        <a
          className="mt-8 rounded-md bg-slate-900 px-5 py-3 font-medium text-white"
          href="https://github.com/"
          rel="noreferrer"
          target="_blank"
        >
          {t('github')}
        </a>
      </section>
    </main>
  );
}
