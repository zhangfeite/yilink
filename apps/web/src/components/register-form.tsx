'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { credentialsSchema } from '@/lib/auth-validation';

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

export function RegisterForm() {
  const t = useTranslations('Register');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const strength = passwordStrength(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = credentialsSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.some((issue) => issue.path[0] === 'password');
      setError(passwordIssue ? t('shortPassword') : t('invalidEmail'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(parsed.data),
      });

      if (response.status === 409) {
        setError(t('duplicateEmail'));
        return;
      }

      if (!response.ok) {
        setError(t('unexpectedError'));
        return;
      }

      router.push('/login?registered=1');
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {error ? (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-1">
        <label className="block text-sm font-medium" htmlFor="register-email">
          {t('email')}
        </label>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium" htmlFor="register-password">
          {t('password')}
        </label>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <p className="text-xs text-slate-500">{t('passwordHint')}</p>
        <p className="text-xs font-medium text-slate-700" aria-live="polite">
          {t(
            strength === 'strong'
              ? 'strengthStrong'
              : strength === 'medium'
                ? 'strengthMedium'
                : 'strengthWeak',
          )}
        </p>
      </div>

      <button
        className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
