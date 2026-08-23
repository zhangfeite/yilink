'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { githubLoginAction, loginAction, type AuthFormState } from '@/app/(auth)/actions';

interface LoginFormProps {
  callbackUrl: string;
  githubEnabled: boolean;
  registered: boolean;
}

const initialState: AuthFormState = { error: null };

export function LoginForm({ callbackUrl, githubEnabled, registered }: LoginFormProps) {
  const t = useTranslations('Login');
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <>
      <form action={formAction} className="space-y-5">
        <input name="callbackUrl" type="hidden" value={callbackUrl} />

        {registered ? (
          <p className="rounded-control bg-accent-soft p-3 text-body text-accent" role="status">
            {t('registered')}
          </p>
        ) : null}

        {state.error ? (
          <p className="rounded-control bg-danger-soft p-3 text-body text-danger" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="space-y-1">
          <label className="block text-caption font-semibold text-ink" htmlFor="login-email">
            {t('email')}
          </label>
          <input
            className="mt-2 min-h-12 w-full rounded-control border border-hairline bg-card px-4 text-body text-ink"
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-caption font-semibold text-ink" htmlFor="login-password">
            {t('password')}
          </label>
          <input
            className="mt-2 min-h-12 w-full rounded-control border border-hairline bg-card px-4 text-body text-ink"
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </div>

        <button
          className="min-h-12 w-full rounded-full bg-accent px-5 text-body font-semibold text-accent-on disabled:opacity-60"
          type="submit"
          disabled={isPending}
        >
          {isPending ? t('submitting') : t('submit')}
        </button>
      </form>

      {githubEnabled ? (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3 text-caption text-muted">
            <span className="h-px flex-1 bg-hairline" />
            <span>{t('or')}</span>
            <span className="h-px flex-1 bg-hairline" />
          </div>
          <form action={githubLoginAction}>
            <input name="callbackUrl" type="hidden" value={callbackUrl} />
            <button
              className="min-h-12 w-full rounded-full border border-hairline bg-card px-5 text-body font-semibold text-ink"
              type="submit"
            >
              {t('github')}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
