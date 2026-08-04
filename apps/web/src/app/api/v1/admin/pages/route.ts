import { NextResponse } from 'next/server';

import { invalidInputResponse, notFoundResponse } from '../../../../../lib/api';
import { db } from '../../../../../lib/db';
import { currentAdminId } from '../../../../../lib/moderation';

const slugSearchPattern = /^[a-z0-9-]{1,30}$/;

export async function GET(request: Request) {
  if (!(await currentAdminId())) {
    return notFoundResponse();
  }

  const slug = (new URL(request.url).searchParams.get('slug') ?? '').trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ pages: [] });
  }
  if (!slugSearchPattern.test(slug)) {
    return invalidInputResponse();
  }

  const pages = await db.page.findMany({
    where: { slug: { contains: slug } },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      hiddenReason: true,
      publishedAt: true,
      user: { select: { email: true } },
    },
  });

  return NextResponse.json({ pages });
}
