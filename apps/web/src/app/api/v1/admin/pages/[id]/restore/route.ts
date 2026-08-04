import { pageCacheTag } from '@yilink/shared';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { invalidInputResponse, notFoundResponse } from '../../../../../../../lib/api';
import { db } from '../../../../../../../lib/db';
import { adminResourceIdSchema, currentAdminId } from '../../../../../../../lib/moderation';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    select: { id: true, slug: true },
  });
  if (!page) {
    return notFoundResponse();
  }

  // 批量事务形态（D1 不支持交互式事务）
  const [restoredPage] = await db.$transaction([
    db.page.update({
      where: { id: page.id },
      data: {
        status: 'PUBLISHED',
        hiddenReason: null,
      },
    }),
    db.moderationRecord.create({
      data: {
        targetType: 'page',
        targetId: page.id,
        provider: 'manual',
        verdict: 'pass',
        detail: { action: 'restore' },
        reviewedBy: adminId,
      },
    }),
  ]);
  revalidateTag(pageCacheTag(page.slug), { expire: 0 });

  return NextResponse.json({ page: restoredPage });
}
