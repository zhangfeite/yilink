import { NextResponse } from 'next/server';

import { invalidInputResponse, notFoundResponse } from '../../../../../lib/api';
import { db } from '../../../../../lib/db';
import { ADMIN_USER_PAGE_SIZE, currentAdminId } from '../../../../../lib/moderation';

function parsePage(value: string | null) {
  if (value === null || value === '') {
    return 1;
  }

  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : null;
}

export async function GET(request: Request) {
  if (!(await currentAdminId())) {
    return notFoundResponse();
  }

  const searchParams = new URL(request.url).searchParams;
  const query = (searchParams.get('query') ?? '').trim();
  const page = parsePage(searchParams.get('page'));
  if (query.length > 320 || page === null) {
    return invalidInputResponse();
  }

  const where = query ? { email: { contains: query } } : undefined;
  const [total, users] = await db.$transaction([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * ADMIN_USER_PAGE_SIZE,
      take: ADMIN_USER_PAGE_SIZE,
      select: {
        id: true,
        email: true,
        plan: true,
        trustLevel: true,
        _count: { select: { pages: { where: { deletedAt: null } } } },
      },
    }),
  ]);

  return NextResponse.json({
    users,
    pagination: {
      page,
      pageSize: ADMIN_USER_PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / ADMIN_USER_PAGE_SIZE),
    },
  });
}
