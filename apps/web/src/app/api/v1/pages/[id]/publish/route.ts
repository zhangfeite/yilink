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
  if (moderation.verdict === 'block') {
    return apiError(422, 'MODERATION_BLOCKED', '内容未通过审核');
  }

  const publishedPage = await db.page.update({
    where: { id: page.id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });
  revalidateTag(pageCacheTag(page.slug), 'max');

  return NextResponse.json({ page: publishedPage });
}
