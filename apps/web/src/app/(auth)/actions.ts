'use server';

import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuthError } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { signIn } from '@/lib/auth';
import { credentialsSchema } from '@/lib/auth-validation';
import { db } from '@/lib/db';
import { isInviteRequired, validateInviteCode } from '@/lib/invite';

export interface AuthFormState {
  error: string | null;
}

/** 仅允许站内相对路径，防开放重定向。 */
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return '/studio';
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('Register');
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const passwordIssue = parsed.error.issues.some((issue) => issue.path[0] === 'password');
    return { error: passwordIssue ? t('shortPassword') : t('invalidEmail') };
  }

  const inviteCode = formData.get('inviteCode');
  if (isInviteRequired() && (typeof inviteCode !== 'string' || !inviteCode.trim())) {
    return { error: t('missingInvite') };
  }

  if (!validateInviteCode(inviteCode)) {
    return { error: t('invalidInvite') };
  }

  try {
    await db.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: await hash(parsed.data.password, 10),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: t('duplicateEmail') };
    }
    return { error: t('unexpectedError') };
  }

  // 注册成功直接建会话，不再跳登录页要求重敲一遍邮箱密码。
  // 邀请制样本本就稀少，这一步纯属白送的流失。
  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get('callbackUrl')),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // 账号确实建成了，只是自动登录没成——退回登录页而不是报注册失败，
      // 否则用户会以为要重注册，再撞上「邮箱已注册」。
      redirect('/login?registered=1');
    }
    throw error; // NEXT_REDIRECT 等框架信号必须重抛
  }

  return { error: null };
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('Login');
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: t('invalidFields') };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get('callbackUrl')),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: t('invalidCredentials') };
    }
    throw error; // NEXT_REDIRECT 等框架信号必须重抛
  }

  return { error: null };
}

export async function githubLoginAction(formData: FormData): Promise<void> {
  await signIn('github', { redirectTo: safeCallbackUrl(formData.get('callbackUrl')) });
}
