import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { credentialsSchema } from '@/lib/auth-validation';
import { normalizeChannel, recordRegistered } from '@/lib/activation';
import { db } from '@/lib/db';
import { redeemInviteCode } from '@/lib/invite';
import { allowAttempt, rateLimitSubject, REGISTER_RULE } from '@/lib/rate-limit';

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export async function POST(request: Request) {
  // 注册限流挡在解析之前：邀请码枚举与批量建号共用这道闸
  if (!allowAttempt('register-ip', rateLimitSubject(request.headers), REGISTER_RULE)) {
    return errorResponse(429, 'RATE_LIMITED', '尝试过于频繁，请稍后再试');
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(payload);

  if (!parsed.success) {
    return errorResponse(400, 'INVALID_INPUT', '邮箱格式无效或密码少于 8 位');
  }

  const inviteCode =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>).inviteCode
      : undefined;
  const existingUser = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingUser) {
    return errorResponse(409, 'EMAIL_EXISTS', '该邮箱已注册');
  }

  try {
    const user = await db.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: await hash(parsed.data.password, 10),
      },
      select: {
        id: true,
        email: true,
      },
    });

    const redeemed = await redeemInviteCode(inviteCode, user.id);
    if (!redeemed.ok) {
      await db.user.delete({ where: { id: user.id } });
      return errorResponse(403, 'INVITE_INVALID', '邀请码无效');
    }

    const ref = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>).ref : undefined;
    await recordRegistered(user.id, normalizeChannel(ref) ?? redeemed.channel);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return errorResponse(409, 'EMAIL_EXISTS', '该邮箱已注册');
    }

    throw error;
  }
}
