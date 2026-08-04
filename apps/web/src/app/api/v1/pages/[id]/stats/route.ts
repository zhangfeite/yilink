import { NextResponse } from 'next/server';

import {
  apiError,
  currentUserId,
  invalidInputResponse,
  notFoundResponse,
} from '../../../../../../lib/api';
import { db } from '../../../../../../lib/db';
import { pageIdSchema } from '../../../../../../lib/pages-api-schemas';
import { getRecentPageStats } from '../../../../../../lib/stats';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const pageIdParsed = pageIdSchema.safeParse((await params).id);
  if (!pageIdParsed.success) {
    return invalidInputResponse();
  }

  const page = await db.page.findFirst({
    where: { id: pageIdParsed.data, userId },
    select: { id: true },
  });
  if (!page) {
    return notFoundResponse();
  }

  return NextResponse.json(await getRecentPageStats(page.id));
}
