import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { LoginForm } from '@/components/login-form';

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function safeCallbackUrl(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/studio';
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const t = await getTranslations('Login');
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold">{t('title')}</h1>
        <LoginForm
          callbackUrl={safeCallbackUrl(params.callbackUrl)}
          githubEnabled={Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET)}
          registered={params.registered === '1'}
        />
        <p className="mt-5 text-center text-sm text-slate-600">
          {t('noAccount')}{' '}
          <Link className="font-medium text-slate-950 underline" href="/register">
            {t('registerLink')}
          </Link>
        </p>
      </div>
    </main>
  );
}
