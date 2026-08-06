import { Prisma } from '@prisma/client';
import { pageCacheTag } from '@yilink/shared';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import {
  apiError,
  currentUserId,
  invalidInputResponse,
  notFoundResponse,
  requestJson,
} from '../../../../../../lib/api';
import { db } from '../../../../../../lib/db';
import { moderatePageContent, pageModerationRecordData } from '../../../../../../lib/moderation';
import { blocksReplaceSchema, pageIdSchema } from '../../../../../../lib/pages-api-schemas';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const pageIdParsed = pageIdSchema.safeParse((await params).id);
  if (!pageIdParsed.success) {
    return invalidInputResponse();
  }

  const parsed = blocksReplaceSchema.safeParse(await requestJson(request));
  if (!parsed.success) {
    return invalidInputResponse();
  }

  const pageId = pageIdParsed.data;
  const page = await db.page.findFirst({
    where: { id: pageId, userId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      title: true,
      bio: true,
      avatarUrl: true,
      seoTitle: true,
      seoDesc: true,
      ctaConfig: true,
      themeConfig: true,
      status: true,
    },
  });
  if (!page) {
    return notFoundResponse();
  }

  const moderation =
    page.status !== 'DRAFT'
      ? await moderatePageContent({
          title: page.title,
          bio: page.bio,
          avatarUrl: page.avatarUrl,
          seoTitle: page.seoTitle,
          seoDesc: page.seoDesc,
          ctaConfig: page.ctaConfig,
          themeConfig: page.themeConfig,
          blocks: parsed.data.map((block) => block.config),
        })
      : null;

  if (moderation?.verdict === 'block') {
    await db.moderationRecord.create({ data: pageModerationRecordData(page.id, moderation) });
    return apiError(422, 'MODERATION_BLOCKED', '内容未通过审核');
  }

  // 批量事务形态（D1 不支持交互式事务，数组形式两端通用）
  const operations: Prisma.PrismaPromise<unknown>[] = [
    db.block.deleteMany({ where: { pageId } }),
    db.block.createMany({
      data: parsed.data.map((block, position) => ({
        pageId,
        type: block.type,
        size: block.size,
        isVisible: block.isVisible,
        position,
        config: block.config as Prisma.InputJsonValue,
      })),
    }),
  ];
  if (moderation) {
    operations.push(
      db.page.update({
        where: { id: page.id },
        data: {
          status:
            page.status === 'PUBLISHED' && moderation.verdict === 'review' ? 'REVIEW' : page.status,
        },
      }),
      db.moderationRecord.create({
        data: pageModerationRecordData(page.id, moderation),
      }),
    );
  }
  await db.$transaction(operations);

  const blocks = await db.block.findMany({
    where: { pageId },
    orderBy: { position: 'asc' },
  });
  const updatedPage = await db.page.findUniqueOrThrow({ where: { id: page.id } });

  if (moderation) {
    revalidateTag(pageCacheTag(page.slug), { expire: 0 });
  }

  return NextResponse.json({ blocks, page: updatedPage, moderation });
}
