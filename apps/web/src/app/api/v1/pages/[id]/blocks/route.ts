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

  const existingBlocks = await db.block.findMany({ where: { pageId }, select: { id: true } });
  const existingIds = new Set(existingBlocks.map((block) => block.id));
  const requestedExistingIds = new Set(
    parsed.data
      .map((block) => block.id)
      .filter((id): id is string => Boolean(id && !id.startsWith('draft-'))),
  );
  if ([...requestedExistingIds].some((id) => !existingIds.has(id))) {
    return invalidInputResponse();
  }

  // D1-compatible batch transaction. Existing IDs are updated in place so click attribution remains valid.
  const operations: Prisma.PrismaPromise<unknown>[] = [];
  for (const [position, block] of parsed.data.entries()) {
    const data = {
      type: block.type,
      size: block.size,
      isVisible: block.isVisible,
      position,
      config: block.config as Prisma.InputJsonValue,
      // DbNull 与 /layout 端点一致：读侧两种空值都表现为 null，但写侧统一成数据库 NULL
      placement: block.placement ? (block.placement as Prisma.InputJsonValue) : Prisma.DbNull,
    };
    if (block.id && !block.id.startsWith('draft-')) {
      operations.push(db.block.update({ where: { id: block.id }, data }));
    } else {
      operations.push(db.block.create({ data: { pageId, ...data } }));
    }
  }
  const deletedIds = [...existingIds].filter((id) => !requestedExistingIds.has(id));
  if (deletedIds.length) operations.push(db.block.deleteMany({ where: { id: { in: deletedIds } } }));
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
