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
} from '../../../../../lib/api';
import { db } from '../../../../../lib/db';
import { moderatePageContent, pageModerationRecordData } from '../../../../../lib/moderation';
import { pageIdSchema, pageUpdateSchema } from '../../../../../lib/pages-api-schemas';

async function getPageId(params: Promise<{ id: string }>) {
  const parsed = pageIdSchema.safeParse((await params).id);
  return parsed.success ? parsed.data : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const pageId = await getPageId(params);
  if (!pageId) {
    return invalidInputResponse();
  }

  const page = await db.page.findFirst({
    where: { id: pageId, userId, deletedAt: null },
  });
  if (!page) {
    return notFoundResponse();
  }

  return NextResponse.json({ page });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const pageId = await getPageId(params);
  if (!pageId) {
    return invalidInputResponse();
  }

  const parsed = pageUpdateSchema.safeParse(await requestJson(request));
  if (!parsed.success) {
    return invalidInputResponse();
  }

  const ownedPage = await db.page.findFirst({
    where: { id: pageId, userId, deletedAt: null },
    include: {
      blocks: {
        orderBy: { position: 'asc' },
      },
    },
  });
  if (!ownedPage) {
    return notFoundResponse();
  }

  const { ctaConfig, themeConfig, ...pageData } = parsed.data;
  const updateData = {
    ...pageData,
    ...(ctaConfig === undefined
      ? {}
      : {
          ctaConfig: ctaConfig === null ? Prisma.DbNull : (ctaConfig as Prisma.InputJsonValue),
        }),
    ...(themeConfig === undefined
      ? {}
      : {
          themeConfig:
            themeConfig === null ? Prisma.DbNull : (themeConfig as Prisma.InputJsonValue),
        }),
  };

  const moderation =
    ownedPage.status !== 'DRAFT'
      ? await moderatePageContent({
          title: parsed.data.title ?? ownedPage.title,
          bio: parsed.data.bio === undefined ? ownedPage.bio : parsed.data.bio,
          avatarUrl:
            parsed.data.avatarUrl === undefined ? ownedPage.avatarUrl : parsed.data.avatarUrl,
          seoTitle: parsed.data.seoTitle === undefined ? ownedPage.seoTitle : parsed.data.seoTitle,
          seoDesc: parsed.data.seoDesc === undefined ? ownedPage.seoDesc : parsed.data.seoDesc,
          ctaConfig: ctaConfig === undefined ? ownedPage.ctaConfig : ctaConfig,
          themeConfig: themeConfig === undefined ? ownedPage.themeConfig : themeConfig,
          blocks: ownedPage.blocks.map((block) => block.config),
        })
      : null;

  if (moderation?.verdict === 'block') {
    await db.moderationRecord.create({
      data: pageModerationRecordData(ownedPage.id, moderation),
    });
    return apiError(422, 'MODERATION_BLOCKED', '内容未通过审核');
  }

  const nextStatus =
    ownedPage.status === 'PUBLISHED' && moderation?.verdict === 'review'
      ? 'REVIEW'
      : ownedPage.status;
  const page = moderation
    ? (
        await db.$transaction([
          db.page.update({
            where: { id: pageId },
            data: { ...updateData, status: nextStatus },
          }),
          db.moderationRecord.create({
            data: pageModerationRecordData(ownedPage.id, moderation),
          }),
        ])
      )[0]
    : await db.page.update({ where: { id: pageId }, data: updateData });

  if (moderation) {
    revalidateTag(pageCacheTag(ownedPage.slug), { expire: 0 });
  }

  return NextResponse.json({ page, moderation });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) {
    return apiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const pageId = await getPageId(params);
  if (!pageId) {
    return invalidInputResponse();
  }

  const ownedPage = await db.page.findFirst({
    where: { id: pageId, userId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!ownedPage) {
    return notFoundResponse();
  }

  await db.page.update({
    where: { id: pageId },
    data: { deletedAt: new Date() },
  });
  revalidateTag(pageCacheTag(ownedPage.slug), { expire: 0 });
  return new NextResponse(null, { status: 204 });
}
