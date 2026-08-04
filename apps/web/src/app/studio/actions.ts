'use server';

import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const roleSchema = z.string().trim().max(24);

function jsonObject(value: Prisma.JsonValue | null): Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Prisma.JsonObject)
    : {};
}

export async function persistPageRole(pageId: string, role: string): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  const parsedRole = roleSchema.safeParse(role);
  if (!userId || !parsedRole.success) throw new Error('Unable to update page role');

  const page = await db.page.findFirst({
    where: { id: pageId, userId },
    select: { id: true, themeConfig: true },
  });
  if (!page) throw new Error('Unable to update page role');

  await db.page.update({
    where: { id: page.id },
    data: {
      themeConfig: {
        ...jsonObject(page.themeConfig),
        role: parsedRole.data,
      } satisfies Prisma.InputJsonObject,
    },
  });
}
