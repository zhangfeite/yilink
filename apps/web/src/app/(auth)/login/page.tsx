import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { LoginForm } from '@/components/login-form';

import { AuthShell } from '../auth-shell';

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
    <AuthShell description={t('heroDescription')} eyebrow={t('eyebrow')} title={t('heroTitle')}>
      <p className="text-caption font-semibold tracking-wide text-accent">{t('formEyebrow')}</p>
      <h1 className="mt-2 text-display text-ink">{t('title')}</h1>
      <p className="mb-8 mt-3 text-body text-muted">{t('formDescription')}</p>
      <LoginForm
        callbackUrl={safeCallbackUrl(params.callbackUrl)}
        githubEnabled={Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET)}
        registered={params.registered === '1'}
      />
      <p className="mt-6 text-center text-body text-muted">
        {t('noAccount')}{' '}
        <Link className="font-semibold text-accent" href="/register">
          {t('registerLink')}
        </Link>
      </p>
    </AuthShell>
  );
}
