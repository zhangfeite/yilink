'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';

import { registerAction, type AuthFormState } from '@/app/(auth)/actions';

function passwordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 8) {
    return 'weak';
  }

  const characterGroups = [
    /[a-z]/i.test(password),
    /\d/.test(password),
    /[^a-z0-9]/i.test(password),
  ].filter(Boolean).length;

  if (password.length >= 12 && characterGroups === 3) {
    return 'strong';
  }

  return characterGroups >= 2 ? 'medium' : 'weak';
}

const initialState: AuthFormState = { error: null };

interface RegisterFormProps {
  defaultInviteCode: string;
  inviteRequired: boolean;
}

export function RegisterForm({ defaultInviteCode, inviteRequired }: RegisterFormProps) {
  const t = useTranslations('Register');
  const [state, formAction, isPending] = useActionState(registerAction, initialState);
  const [password, setPassword] = useState('');
  const strength = passwordStrength(password);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p className="rounded-control bg-danger-soft p-3 text-body text-danger" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-1">
        <label className="block text-caption font-semibold text-ink" htmlFor="register-email">
          {t('email')}
        </label>
        <input
          className="mt-2 min-h-12 w-full rounded-control border border-hairline bg-card px-4 text-body text-ink"
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-caption font-semibold text-ink" htmlFor="register-password">
          {t('password')}
        </label>
        <input
          className="mt-2 min-h-12 w-full rounded-control border border-hairline bg-card px-4 text-body text-ink"
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <p className="text-caption text-muted">{t('passwordHint')}</p>
        <p className="text-caption font-semibold text-muted" aria-live="polite">
          {t(
            strength === 'strong'
              ? 'strengthStrong'
              : strength === 'medium'
                ? 'strengthMedium'
                : 'strengthWeak',
          )}
        </p>
      </div>

      {inviteRequired ? (
        <div className="space-y-1">
          <label
            className="block text-caption font-semibold text-ink"
            htmlFor="register-invite-code"
          >
            {t('inviteCode')}
          </label>
          <input
            className="mt-2 min-h-12 w-full rounded-control border border-hairline bg-card px-4 text-body text-ink"
            defaultValue={defaultInviteCode}
            id="register-invite-code"
            name="inviteCode"
            type="text"
            autoComplete="off"
            required
          />
          <p className="pt-1 text-caption text-muted">
            {t('inviteHintBefore')}
            <a
              className="font-semibold text-accent"
              href="https://github.com/zhangfeite/yilink/issues"
              rel="noreferrer"
              target="_blank"
            >
              {t('inviteHintLink')}
            </a>
            {t('inviteHintAfter')}
          </p>
        </div>
      ) : null}

      <button
        className="min-h-12 w-full rounded-full bg-accent px-5 text-body font-semibold text-accent-on disabled:opacity-60"
        type="submit"
        disabled={isPending}
      >
        {isPending ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
