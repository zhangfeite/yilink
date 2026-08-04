import { db } from '../../../lib/db';
import {
  allowEventForIp,
  classifyReferrer,
  clientIp,
  eventPayloadSchema,
  hashIp,
  startOfUtcHour,
  nextClickEventId,
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

    const now = new Date();
    const ipHash = hashIp(clientIp(request.headers), now);

    // 单实例用内存桶即可；托管多实例部署时在这里替换为 Redis 的原子限频计数。
    if (!allowEventForIp(ipHash, now.getTime())) return noContent();

    await db.clickEvent.create({
      data: {
        id: nextClickEventId(now.getTime()),
        pageId: parsed.data.pageId,
        blockId: parsed.data.blockId,
        kind: parsed.data.kind,
        tsBucket: startOfUtcHour(now),
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
