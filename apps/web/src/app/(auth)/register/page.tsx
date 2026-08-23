import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { RegisterForm } from '@/components/register-form';
import { isInviteRequired } from '@/lib/invite';

import { AuthShell } from '../auth-shell';

export const dynamic = 'force-dynamic';

interface RegisterPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const t = await getTranslations('Register');
  const params = await searchParams;
  const invite = typeof params.invite === 'string' ? params.invite : '';

  return (
    <AuthShell description={t('heroDescription')} eyebrow={t('eyebrow')} title={t('heroTitle')}>
      <p className="text-caption font-semibold tracking-wide text-accent">{t('formEyebrow')}</p>
      <h1 className="mt-2 text-display text-ink">{t('title')}</h1>
      <p className="mb-8 mt-3 text-body text-muted">{t('formDescription')}</p>
      <RegisterForm defaultInviteCode={invite} inviteRequired={isInviteRequired()} />
      <p className="mt-6 text-center text-body text-muted">
        {t('hasAccount')}{' '}
        <Link className="font-semibold text-accent" href="/login">
          {t('loginLink')}
        </Link>
      </p>
    </AuthShell>
  );
}
