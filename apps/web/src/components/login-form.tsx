'use client';

import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { credentialsSchema } from '@/lib/auth-validation';

interface LoginFormProps {
  callbackUrl: string;
  githubEnabled: boolean;
  registered: boolean;
}

export function LoginForm({ callbackUrl, githubEnabled, registered }: LoginFormProps) {
  const t = useTranslations('Login');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = credentialsSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    if (!parsed.success) {
      setError(t('invalidFields'));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        ...parsed.data,
        redirect: false,
      });

      if (!result || result.error) {
        setError(t('invalidCredentials'));
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {registered ? (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-800" role="status">
          {t('registered')}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-1">
        <label className="block text-sm font-medium" htmlFor="login-email">
          {t('email')}
        </label>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium" htmlFor="login-password">
          {t('password')}
        </label>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
        />
      </div>

      <button
        className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? t('submitting') : t('submit')}
      </button>

      {githubEnabled ? (
        <>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            <span>{t('or')}</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-900"
            type="button"
            onClick={() => void signIn('github', { callbackUrl })}
          >
            {t('github')}
          </button>
        </>
      ) : null}
    </form>
  );
}
