import { pageCacheTag } from '@yilink/shared';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { invalidInputResponse, notFoundResponse } from '../../../../../../../lib/api';
import { db } from '../../../../../../../lib/db';
import { adminResourceIdSchema, currentAdminId } from '../../../../../../../lib/moderation';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await currentAdminId();
  if (!adminId) {
    return notFoundResponse();
  }

  const parsedId = adminResourceIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return invalidInputResponse();
  }

  const record = await db.moderationRecord.findUnique({ where: { id: parsedId.data } });
  if (
    !record ||
    record.targetType !== 'page' ||
    record.verdict !== 'review' ||
    record.reviewedBy !== null
  ) {
    return notFoundResponse();
  }

  const page = await db.page.findFirst({
    where: { id: record.targetId, status: 'REVIEW', deletedAt: null },
    select: { id: true, slug: true, publishedAt: true },
  });
  if (!page) {
    return notFoundResponse();
  }

  const [publishedPage, resolvedRecord] = await db.$transaction([
    db.page.update({
      where: { id: page.id },
      data: { status: 'PUBLISHED', publishedAt: page.publishedAt ?? new Date() },
    }),
    db.moderationRecord.update({
      where: { id: record.id },
      data: { reviewedBy: adminId },
    }),
    db.moderationRecord.updateMany({
      where: {
        id: { not: record.id },
        targetType: 'page',
        targetId: page.id,
        verdict: 'review',
        reviewedBy: null,
      },
      data: { reviewedBy: adminId },
    }),
    db.moderationRecord.create({
      data: {
        targetType: 'page',
        targetId: page.id,
        provider: 'manual',
        verdict: 'pass',
        detail: { action: 'approve-review' },
        reviewedBy: adminId,
      },
    }),
  ]);
  revalidateTag(pageCacheTag(page.slug), { expire: 0 });

  return NextResponse.json({ page: publishedPage, record: resolvedRecord });
}
