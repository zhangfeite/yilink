import { LocalWordsModerationProvider } from '@yilink/moderation/local-words';
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
import { moderationDetail } from '../../../../../../lib/moderation';
import { pageIdSchema } from '../../../../../../lib/pages-api-schemas';

const moderationProvider = new LocalWordsModerationProvider();

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
    where: { id: pageIdParsed.data, userId },
    include: {
      blocks: {
        orderBy: { position: 'asc' },
      },
    },
  });
  if (!page) {
    return notFoundResponse();
  }

  const moderation = await moderationProvider.check({
    title: page.title,
    bio: page.bio,
    blocks: page.blocks.map((block) => block.config),
  });
  const moderationRecord = {
    targetType: 'page',
    targetId: page.id,
    provider: 'local-words',
    verdict: moderation.verdict,
    detail: moderationDetail(moderation.labels),
  };

  if (moderation.verdict === 'block') {
    await db.moderationRecord.create({ data: moderationRecord });
    return apiError(422, 'MODERATION_BLOCKED', '内容未通过审核');
  }

  const publishedPage = await db.$transaction(async (transaction) => {
    const updatedPage = await transaction.page.update({
      where: { id: page.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    await transaction.moderationRecord.create({ data: moderationRecord });

    return updatedPage;
  });
  revalidateTag(pageCacheTag(page.slug), { expire: 0 });

  return NextResponse.json({ page: publishedPage });
}
