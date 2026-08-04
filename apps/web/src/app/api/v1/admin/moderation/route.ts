import { NextResponse } from 'next/server';

import { invalidInputResponse, notFoundResponse } from '../../../../../lib/api';
import { db } from '../../../../../lib/db';
import { currentAdminId } from '../../../../../lib/moderation';

const moderationFilters = new Set(['review', 'all']);

export async function GET(request: Request) {
  if (!(await currentAdminId())) {
    return notFoundResponse();
  }

  const filter = new URL(request.url).searchParams.get('filter') ?? 'review';
  if (!moderationFilters.has(filter)) {
    return invalidInputResponse();
  }

  const records = await db.moderationRecord.findMany({
    where:
      filter === 'review'
        ? { targetType: 'page', verdict: 'review', reviewedBy: null }
        : { targetType: 'page' },
    orderBy: { createdAt: 'desc' },
  });

  const targetIds = [...new Set(records.map((record) => record.targetId))];
  const pages = targetIds.length
    ? await db.page.findMany({
        where: { id: { in: targetIds } },
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          user: { select: { email: true } },
        },
      })
    : [];
  const pagesById = new Map(pages.map((page) => [page.id, page]));

  return NextResponse.json({
    filter,
    records: records.map((record) => ({
      ...record,
      page: pagesById.get(record.targetId) ?? null,
    })),
  });
}
