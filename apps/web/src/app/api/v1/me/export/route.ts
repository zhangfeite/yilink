import { NextResponse } from 'next/server';

import { apiError, currentUserId } from '../../../../../lib/api';
import { db } from '../../../../../lib/db';

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

  const pages = await db.page.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      blocks: {
        orderBy: { position: 'asc' },
      },
    },
  });

  return NextResponse.json(
    { user, pages },
    {
      headers: {
        'Content-Disposition': 'attachment; filename="yilink-export.json"',
      },
    },
  );
}
