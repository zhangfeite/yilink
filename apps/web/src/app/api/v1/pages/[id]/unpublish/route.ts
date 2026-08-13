import { pageCacheTag } from '@yilink/shared';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import {
  apiError,
  currentUserId,
  invalidInputResponse,
  notFoundResponse,
} from '../../../../../../lib/api';
import { db } from '../../../../../../lib/db';
import { pageIdSchema } from '../../../../../../lib/pages-api-schemas';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await currentUserId();
  if (!userId) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const pageIdParsed = pageIdSchema.safeParse((await params).id);
  if (!pageIdParsed.success) {
    return invalidInputResponse();
  }

  const page = await db.page.findFirst({
    where: { id: pageIdParsed.data, userId, deletedAt: null },
    select: { id: true, slug: true, status: true },
  });
  if (!page) {
    return notFoundResponse();
  }
  // HIDDEN 必须留在 HIDDEN：若允许转 DRAFT，所有者可经 DRAFT→publish 把管理员
  // 隐藏的页面洗白重新上线（publish 只挡「当前是 HIDDEN」，挡不住这条间接路径）。
  if (page.status === 'HIDDEN') {
    return apiError(409, 'PAGE_HIDDEN', '页面已被管理员隐藏');
  }

  const unpublishedPage = await db.page.update({
    where: { id: page.id },
    data: { status: 'DRAFT' },
  });
  revalidateTag(pageCacheTag(page.slug), { expire: 0 });

  return NextResponse.json({ page: unpublishedPage });
}
