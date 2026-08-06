import { db } from '../../../lib/db';
import {
  allowEventForIp,
  classifyReferrer,
  clientIp,
  eventPayloadSchema,
  hashIp,
  startOfUtcHour,
} from '../../../lib/stats';
import { classifyUserAgent } from '../../../lib/ua';

export const runtime = 'nodejs';

function noContent(): Response {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = eventPayloadSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noContent();

    const uaClass = classifyUserAgent(request.headers.get('user-agent'));
    if (uaClass === 'bot') return noContent();

    const page = await db.page.findUnique({
      where: { id: parsed.data.pageId },
      select: { status: true },
    });
    if (page?.status !== 'PUBLISHED') return noContent();

    if (parsed.data.blockId) {
      // 只按 id + pageId 查一次，避免任意 blockId 污染其他主页的点击统计。
      const block = await db.block.findFirst({
        where: { id: parsed.data.blockId, pageId: parsed.data.pageId },
        select: { id: true },
      });
      if (!block) return noContent();
    }

    const now = new Date();
    const tsBucket = startOfUtcHour(now);
    const ipHash = hashIp(clientIp(request.headers), now);

    if (parsed.data.kind === 'VIEW') {
      // 无唯一索引时以存在性查询去重；并发重放仍由 Cloudflare 边缘限频兜底。
      const duplicateView = await db.clickEvent.findFirst({
        where: {
          pageId: parsed.data.pageId,
          kind: 'VIEW',
          ipHash,
          tsBucket,
        },
        select: { id: true },
      });
      if (duplicateView) return noContent();
    } else {
      const clickCount = await db.clickEvent.count({
        where: {
          pageId: parsed.data.pageId,
          kind: 'CLICK',
          ipHash,
          tsBucket,
        },
      });
      if (clickCount >= 30) return noContent();
    }

    // 单实例用内存桶即可；托管多实例部署时在这里替换为 Redis 的原子限频计数。
    if (!allowEventForIp(ipHash, now.getTime())) return noContent();

    await db.clickEvent.create({
      data: {
        pageId: parsed.data.pageId,
        blockId: parsed.data.blockId,
        kind: parsed.data.kind,
        tsBucket,
        uaClass,
        refClass: classifyReferrer(request.headers.get('referer')),
        ipHash,
      },
    });
  } catch {
    // Beacon callers never receive error details or a page-existence probe surface.
  }

  return noContent();
}
