import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { RegisterForm } from '@/components/register-form';
import { isInviteRequired } from '@/lib/invite';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const t = await getTranslations('Register');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold">{t('title')}</h1>
        <RegisterForm inviteRequired={isInviteRequired()} />
        <p className="mt-5 text-center text-sm text-slate-600">
          {t('hasAccount')}{' '}
          <Link className="font-medium text-slate-950 underline" href="/login">
            {t('loginLink')}
          </Link>
        </p>
      </div>
    </main>
  );
}
