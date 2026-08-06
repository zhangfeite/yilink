import { afterEach, describe, expect, it, vi } from 'vitest';

const { signInMock, getTranslationsMock, AuthErrorMock } = vi.hoisted(() => {
  class AuthErrorMock extends Error {}

  return {
    signInMock: vi.fn(),
    getTranslationsMock: vi.fn(),
    AuthErrorMock,
  };
});

vi.mock('@/lib/auth', () => ({ signIn: signInMock }));
vi.mock('next-intl/server', () => ({ getTranslations: getTranslationsMock }));
vi.mock('next-auth', () => ({ AuthError: AuthErrorMock }));

import { loginAction, registerAction } from './actions';

const originalInviteCodes = process.env.INVITE_CODES;

function restoreInviteCodes() {
  if (originalInviteCodes === undefined) {
    delete process.env.INVITE_CODES;
  } else {
    process.env.INVITE_CODES = originalInviteCodes;
  }
}

function loginFormData() {
  const formData = new FormData();
  formData.set('email', 'member@example.com');
  formData.set('password', 'password-with-8-chars');
  return formData;
}

function registerFormData() {
  const formData = new FormData();
  formData.set('email', 'new-member@example.com');
  formData.set('password', 'password-with-8-chars');
  return formData;
}

describe('loginAction', () => {
  afterEach(() => {
    restoreInviteCodes();
    signInMock.mockReset();
    getTranslationsMock.mockReset();
  });

  it('shows the same generic message for unknown accounts and wrong passwords', async () => {
    getTranslationsMock.mockResolvedValue((key: string) => {
      if (key === 'invalidCredentials') {
        return '邮箱或密码错误。';
      }
      return key;
    });
    signInMock.mockRejectedValueOnce(new AuthErrorMock('CredentialsSignin'));
    signInMock.mockRejectedValueOnce(new AuthErrorMock('CredentialsSignin'));

    const unknownAccount = await loginAction({ error: null }, loginFormData());
    const wrongPassword = await loginAction({ error: null }, loginFormData());

    expect(unknownAccount).toEqual({ error: '邮箱或密码错误。' });
    expect(wrongPassword).toEqual({ error: '邮箱或密码错误。' });
  });

  it('returns the localized invalid-invitation error before creating an account', async () => {
    process.env.INVITE_CODES = 'alpha';
    getTranslationsMock.mockResolvedValue((key: string) => {
      if (key === 'invalidInvite') {
        return '邀请码无效';
      }
      return key;
    });

    await expect(registerAction({ error: null }, registerFormData())).resolves.toEqual({
      error: '邀请码无效',
    });
  });
});
