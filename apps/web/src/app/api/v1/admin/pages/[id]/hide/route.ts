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

  const hiddenPage = await db.$transaction(async (transaction) => {
    const updatedPage = await transaction.page.update({
      where: { id: page.id },
      data: {
        status: 'HIDDEN',
        hiddenReason: parsedBody.data.reason,
      },
    });
    await transaction.moderationRecord.create({
      data: {
        targetType: 'page',
        targetId: page.id,
        provider: 'manual',
        verdict: 'block',
        detail: { reason: parsedBody.data.reason },
        reviewedBy: adminId,
      },
    });
    // 隐藏是人工已作出的审核结论，队列中的同页待审项无需继续占用审核席位。
    await transaction.moderationRecord.updateMany({
      where: {
        targetType: 'page',
        targetId: page.id,
        verdict: 'review',
        reviewedBy: null,
      },
      data: { reviewedBy: adminId },
    });

    return updatedPage;
  });
  revalidateTag(pageCacheTag(page.slug), 'max');

  return NextResponse.json({ page: hiddenPage });
}
