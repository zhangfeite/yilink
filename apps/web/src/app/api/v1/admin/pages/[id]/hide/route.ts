import { pageCacheTag } from '@yilink/shared';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { invalidInputResponse, notFoundResponse, requestJson } from '../../../../../../../lib/api';
import { db } from '../../../../../../../lib/db';
import {
  adminResourceIdSchema,
  currentAdminId,
  hidePageSchema,
} from '../../../../../../../lib/moderation';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = await currentAdminId();
  if (!adminId) {
    return notFoundResponse();
  }

  const parsedId = adminResourceIdSchema.safeParse((await params).id);
  const parsedBody = hidePageSchema.safeParse(await requestJson(request));
  if (!parsedId.success || !parsedBody.success) {
    return invalidInputResponse();
  }

  const page = await db.page.findUnique({
    where: { id: parsedId.data },
    select: { id: true, slug: true },
  });
  if (!page) {
    return notFoundResponse();
  }

  // 批量事务形态（D1 不支持交互式事务）
  const [hiddenPage] = await db.$transaction([
    db.page.update({
      where: { id: page.id },
      data: {
        status: 'HIDDEN',
        hiddenReason: parsedBody.data.reason,
      },
    }),
    db.moderationRecord.create({
      data: {
        targetType: 'page',
        targetId: page.id,
        provider: 'manual',
        verdict: 'block',
        detail: { reason: parsedBody.data.reason },
        reviewedBy: adminId,
      },
    }),
    // 隐藏是人工已作出的审核结论，队列中的同页待审项无需继续占用审核席位。
    db.moderationRecord.updateMany({
      where: {
        targetType: 'page',
        targetId: page.id,
        verdict: 'review',
        reviewedBy: null,
      },
      data: { reviewedBy: adminId },
    }),
  ]);
  revalidateTag(pageCacheTag(page.slug), { expire: 0 });

  return NextResponse.json({ page: hiddenPage });
}
