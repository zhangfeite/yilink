import { Prisma } from '@prisma/client';
import { FREE_PAGE_LIMIT } from '@yilink/shared';
import { NextResponse } from 'next/server';

import { apiError, currentUserId, invalidInputResponse, requestJson } from '../../../../lib/api';
import { db } from '../../../../lib/db';
import { pageCreateSchema } from '../../../../lib/pages-api-schemas';

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const pages = await db.page.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { blocks: true },
      },
    },
  });

  return NextResponse.json({ pages });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const parsed = pageCreateSchema.safeParse(await requestJson(request));
  if (!parsed.success) {
    return invalidInputResponse();
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!user) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  if (user.plan === 'FREE') {
    const pageCount = await db.page.count({ where: { userId } });
    if (pageCount >= FREE_PAGE_LIMIT) {
      return apiError(403, 'PAGE_LIMIT', `免费用户最多创建 ${FREE_PAGE_LIMIT} 个主页`);
    }
  }

  try {
    const page = await db.page.create({
      data: {
        ...parsed.data,
        userId,
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return apiError(409, 'SLUG_TAKEN', '该主页地址已被占用');
    }

    throw error;
  }
}
