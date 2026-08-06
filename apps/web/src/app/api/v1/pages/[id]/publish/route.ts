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
import { moderatePageContent, pageModerationRecordData } from '../../../../../../lib/moderation';
import { pageIdSchema } from '../../../../../../lib/pages-api-schemas';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    include: {
      blocks: {
        orderBy: { position: 'asc' },
      },
    },
  });
  if (!page) {
    return notFoundResponse();
  }
  if (page.status === 'HIDDEN') {
    return apiError(409, 'PAGE_HIDDEN', '页面已被管理员隐藏');
  }

  const moderation = await moderatePageContent({
    title: page.title,
    bio: page.bio,
    avatarUrl: page.avatarUrl,
    seoTitle: page.seoTitle,
    seoDesc: page.seoDesc,
    ctaConfig: page.ctaConfig,
    themeConfig: page.themeConfig,
    blocks: page.blocks.map((block) => block.config),
  });
  const moderationRecord = pageModerationRecordData(page.id, moderation);

  if (moderation.verdict === 'block') {
    await db.moderationRecord.create({ data: moderationRecord });
    return apiError(422, 'MODERATION_BLOCKED', '内容未通过审核');
  }

  // 批量事务形态（D1 不支持交互式事务）
  const nextStatus = moderation.verdict === 'review' ? 'REVIEW' : 'PUBLISHED';
  const [publishedPage] = await db.$transaction([
    db.page.update({
      where: { id: page.id },
      data: {
        status: nextStatus,
        ...(nextStatus === 'PUBLISHED' ? { publishedAt: page.publishedAt ?? new Date() } : {}),
      },
    }),
    db.moderationRecord.create({ data: moderationRecord }),
  ]);
  revalidateTag(pageCacheTag(page.slug), { expire: 0 });

  return NextResponse.json({
    page: publishedPage,
    moderation,
    message: nextStatus === 'REVIEW' ? '已提交审核' : '发布成功',
  });
}
