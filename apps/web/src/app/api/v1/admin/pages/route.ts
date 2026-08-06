import { NextResponse } from 'next/server';

import { invalidInputResponse, notFoundResponse } from '../../../../../lib/api';
import { db } from '../../../../../lib/db';
import { currentAdminId } from '../../../../../lib/moderation';

const slugSearchPattern = /^[a-z0-9-]{1,30}$/;
const deletedFilters = new Set(['exclude', 'only']);

export async function GET(request: Request) {
  if (!(await currentAdminId())) {
    return notFoundResponse();
  }

  const searchParams = new URL(request.url).searchParams;
  const slug = (searchParams.get('slug') ?? '').trim().toLowerCase();
  const deleted = searchParams.get('deleted') ?? 'exclude';
  if (!deletedFilters.has(deleted)) {
    return invalidInputResponse();
  }
  if (!slug && deleted !== 'only') {
    return NextResponse.json({ pages: [] });
  }
  if (slug && !slugSearchPattern.test(slug)) {
    return invalidInputResponse();
  }

  const pages = await db.page.findMany({
    where: {
      ...(slug ? { slug: { contains: slug } } : {}),
      deletedAt: deleted === 'only' ? { not: null } : null,
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      hiddenReason: true,
      publishedAt: true,
      deletedAt: true,
      user: { select: { email: true } },
    },
  });

  return NextResponse.json({ deleted, pages });
}
