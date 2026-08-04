import { NextResponse } from 'next/server';

import { apiError, currentUserId, invalidInputResponse, requestJson } from '../../../../lib/api';
import { db } from '../../../../lib/db';
import { meUpdateSchema } from '../../../../lib/pages-api-schemas';

const userSelect = {
  id: true,
  email: true,
  name: true,
  plan: true,
} as const;

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const parsed = meUpdateSchema.safeParse(await requestJson(request));
  if (!parsed.success) {
    return invalidInputResponse();
  }

  const existingUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!existingUser) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const user = await db.user.update({
    where: { id: userId },
    data: parsed.data,
    select: userSelect,
  });

  return NextResponse.json({ user });
}
