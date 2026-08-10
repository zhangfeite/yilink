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

  const page = await db.page.findUnique({
    where: { id: parsedId.data },
    select: { id: true, slug: true, status: true, publishedAt: true, deletedAt: true },
  });
  if (!page) {
    return notFoundResponse();
  }
  // REVIEW 是人工审核队列的常态，必须可放行；否则待审页面永远卡住（spec-14 遗漏）
  if (page.deletedAt === null && page.status !== 'HIDDEN' && page.status !== 'REVIEW') {
    return notFoundResponse();
  }

  const restoresDeletedPage = page.deletedAt !== null;

  // 批量事务形态（D1 不支持交互式事务）
  const [restoredPage] = await db.$transaction([
    db.page.update({
      where: { id: page.id },
      data: restoresDeletedPage
        ? { deletedAt: null }
        : {
            status: 'PUBLISHED',
            hiddenReason: null,
            publishedAt: page.publishedAt ?? new Date(),
          },
    }),
    db.moderationRecord.create({
      data: {
        targetType: 'page',
        targetId: page.id,
        provider: 'manual',
        verdict: 'pass',
        detail: {
          action: restoresDeletedPage
            ? 'restore-deleted'
            : page.status === 'REVIEW'
              ? 'approve-review'
              : 'restore-hidden',
        },
        reviewedBy: adminId,
      },
    }),
  ]);
  revalidateTag(pageCacheTag(page.slug), { expire: 0 });

  return NextResponse.json({ page: restoredPage });
}
