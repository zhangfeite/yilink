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
import { layoutSaveSchema, pageIdSchema } from '../../../../../../lib/pages-api-schemas';

/** Atomically persists page metadata and its stable-ID block diff. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return apiError(401, 'UNAUTHORIZED', '请先登录');

  const pageIdParsed = pageIdSchema.safeParse((await params).id);
  const parsed = layoutSaveSchema.safeParse(await requestJson(request));
  if (!pageIdParsed.success || !parsed.success) return invalidInputResponse();

  const pageId = pageIdParsed.data;
  const input = parsed.data;
  const page = await db.page.findFirst({
    where: { id: pageId, userId, deletedAt: null },
    select: { id: true, slug: true, status: true },
  });
  if (!page) return notFoundResponse();

  const existingBlocks = await db.block.findMany({ where: { pageId }, select: { id: true } });
  const existingIds = new Set(existingBlocks.map((block) => block.id));
  const requestedExistingIds = new Set(
    input.blocks
      .map((block) => block.id)
      .filter((id): id is string => Boolean(id && !id.startsWith('draft-'))),
  );
  if ([...requestedExistingIds].some((id) => !existingIds.has(id))) return invalidInputResponse();

  const moderation =
    page.status !== 'DRAFT'
      ? await moderatePageContent({
          title: input.title,
          bio: input.bio,
          avatarUrl: input.avatarUrl,
          seoTitle: input.seoTitle,
          seoDesc: input.seoDesc,
          ctaConfig: input.ctaConfig,
          themeConfig: input.themeConfig,
          blocks: input.blocks.map((block) => block.config),
        })
      : null;
  if (moderation?.verdict === 'block') {
    await db.moderationRecord.create({ data: pageModerationRecordData(page.id, moderation) });
    return apiError(422, 'MODERATION_BLOCKED', '内容未通过审核');
  }

  const nextStatus =
    page.status === 'PUBLISHED' && moderation?.verdict === 'review' ? 'REVIEW' : page.status;
  const operations: Prisma.PrismaPromise<unknown>[] = [
    db.page.update({
      where: { id: pageId },
      data: {
        title: input.title,
        bio: input.bio,
        avatarUrl: input.avatarUrl,
        layout: input.layout,
        bentoVersion: input.bentoVersion,
        themeId: input.themeId,
        seoTitle: input.seoTitle,
        seoDesc: input.seoDesc,
        ctaConfig: input.ctaConfig === null ? Prisma.DbNull : (input.ctaConfig as Prisma.InputJsonValue),
        themeConfig: input.themeConfig === null ? Prisma.DbNull : (input.themeConfig as Prisma.InputJsonValue),
        status: nextStatus,
      },
    }),
  ];
  for (const [position, block] of input.blocks.entries()) {
    const data = {
      type: block.type,
      size: block.size,
      isVisible: block.isVisible,
      position,
      config: block.config as Prisma.InputJsonValue,
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
  if (moderation) operations.push(db.moderationRecord.create({ data: pageModerationRecordData(page.id, moderation) }));
  await db.$transaction(operations);

  const [updatedPage, blocks] = await Promise.all([
    db.page.findUniqueOrThrow({ where: { id: pageId } }),
    db.block.findMany({ where: { pageId }, orderBy: { position: 'asc' } }),
  ]);
  if (moderation) revalidateTag(pageCacheTag(page.slug), { expire: 0 });
  return NextResponse.json({ page: updatedPage, blocks, moderation });
}
