import { NextResponse } from 'next/server';

import {
  apiError,
  currentUserId,
  invalidInputResponse,
  notFoundResponse,
} from '../../../../../../lib/api';
import { db } from '../../../../../../lib/db';
import { clampQrSize, pageQrUrl, parseQrFormat, renderQrCode } from '../../../../../../lib/qr';
import { pageIdSchema } from '../../../../../../lib/pages-api-schemas';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    select: { slug: true },
  });
  if (!page) {
    return notFoundResponse();
  }

  const searchParams = new URL(request.url).searchParams;
  if (searchParams.has('logo')) {
    return apiError(501, 'NOT_IMPLEMENTED', '二维码 Logo 暂不支持');
  }

  const format = parseQrFormat(searchParams.get('format'));
  if (!format) {
    return invalidInputResponse();
  }

  const content = pageQrUrl(page.slug, request.url);
  const qrCode = await renderQrCode(
    content,
    format,
    format === 'png' ? clampQrSize(searchParams.get('size')) : undefined,
  );

  const extension = format;
  const body = typeof qrCode === 'string' ? qrCode : Uint8Array.from(qrCode);
  return new NextResponse(body, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `attachment; filename="yilink-${page.slug}.${extension}"`,
      'Content-Type': format === 'png' ? 'image/png' : 'image/svg+xml',
    },
  });
}
