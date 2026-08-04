import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import {
  apiError,
  currentUserId,
  invalidInputResponse,
  notFoundResponse,
  requestJson,
} from '../../../../../lib/api';
import { db } from '../../../../../lib/db';
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
    where: { id: pageId, userId },
  });
  if (!page) {
    return notFoundResponse();
  }

  return NextResponse.json({ page });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    where: { id: pageId, userId },
    select: { id: true },
  });
  if (!ownedPage) {
    return notFoundResponse();
  }

  const { ctaConfig, ...pageData } = parsed.data;
  const page = await db.page.update({
    where: { id: pageId },
    data: {
      ...pageData,
      ...(ctaConfig === undefined
        ? {}
        : {
            ctaConfig:
              ctaConfig === null ? Prisma.DbNull : (ctaConfig as Prisma.InputJsonValue),
          }),
    },
  });

  return NextResponse.json({ page });
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
    where: { id: pageId, userId },
    select: { id: true },
  });
  if (!ownedPage) {
    return notFoundResponse();
  }

  await db.page.delete({ where: { id: pageId } });
  return new NextResponse(null, { status: 204 });
}
