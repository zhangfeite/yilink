import { CompositeModerationProvider } from '@yilink/moderation/composite';
import { LocalWordsModerationProvider } from '@yilink/moderation/local-words';
import type { ModerationResult } from '@yilink/moderation';
import { UrlBlocklistProvider } from '@yilink/moderation/url-blocklist';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

import { auth } from './auth';
import { db } from './db';

export const adminResourceIdSchema = z.string().trim().min(1).max(64);

export const hidePageSchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export const trustLevelUpdateSchema = z
  .object({
    trustLevel: z.number().int().min(0).max(100),
  })
  .strict();

export const ADMIN_USER_PAGE_SIZE = 20;
export const PAGE_MODERATION_PROVIDER = 'local-words+url-blocklist';
export const PAGE_SOFT_DELETE_RETENTION_DAYS = 30;

const pageModerationProvider = new CompositeModerationProvider([
  new LocalWordsModerationProvider(),
  new UrlBlocklistProvider(),
]);

/**
 * ADMIN 权限始终从数据库读取，避免角色变更后仍受旧 JWT session 影响。
 */
export async function currentAdminId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === 'ADMIN' ? userId : null;
}

export function moderationDetail(labels: readonly string[]) {
  return { labels: [...labels] };
}

export function moderatePageContent(payload: unknown): Promise<ModerationResult> {
  return pageModerationProvider.check(payload);
}

export function pageModerationRecordData(pageId: string, result: ModerationResult) {
  return {
    targetType: 'page',
    targetId: pageId,
    provider: PAGE_MODERATION_PROVIDER,
    verdict: result.verdict,
    detail: moderationDetail(result.labels),
  };
}

/** Shared hook for the daily data-ops job; the exact 30-day boundary is retained. */
export async function purgeExpiredDeletedPages(
  client: Pick<PrismaClient, 'page'> = db,
  now = new Date(),
): Promise<{ deletedPages: number }> {
  const retentionMs = PAGE_SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const result = await client.page.deleteMany({
    where: { deletedAt: { lt: new Date(now.getTime() - retentionMs) } },
  });
  return { deletedPages: result.count };
}
