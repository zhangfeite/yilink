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
