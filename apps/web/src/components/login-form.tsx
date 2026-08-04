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
      <form action={formAction} className="space-y-4">
        <input name="callbackUrl" type="hidden" value={callbackUrl} />

        {registered ? (
          <p className="rounded-md bg-green-50 p-3 text-sm text-green-800" role="status">
            {t('registered')}
          </p>
        ) : null}

        {state.error ? (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
            {state.error}
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
          disabled={isPending}
        >
          {isPending ? t('submitting') : t('submit')}
        </button>
      </form>

      {githubEnabled ? (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            <span>{t('or')}</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <form action={githubLoginAction}>
            <input name="callbackUrl" type="hidden" value={callbackUrl} />
            <button
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-900"
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
