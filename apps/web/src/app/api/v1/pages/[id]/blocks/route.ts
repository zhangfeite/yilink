import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import {
  apiError,
  currentUserId,
  invalidInputResponse,
  notFoundResponse,
  requestJson,
} from '../../../../../../lib/api';
import { db } from '../../../../../../lib/db';
import { blocksReplaceSchema, pageIdSchema } from '../../../../../../lib/pages-api-schemas';

export async function PUT(
  request: Request,
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

  const parsed = blocksReplaceSchema.safeParse(await requestJson(request));
  if (!parsed.success) {
    return invalidInputResponse();
  }

  const pageId = pageIdParsed.data;
  const page = await db.page.findFirst({
    where: { id: pageId, userId },
    select: { id: true },
  });
  if (!page) {
    return notFoundResponse();
  }

  // 批量事务形态（D1 不支持交互式事务，数组形式两端通用）
  await db.$transaction([
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
  ]);

  const blocks = await db.block.findMany({
    where: { pageId },
    orderBy: { position: 'asc' },
  });

  return NextResponse.json({ blocks });
}
