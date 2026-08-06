import { NextResponse } from 'next/server';

import { invalidInputResponse, notFoundResponse, requestJson } from '../../../../../../lib/api';
import { db } from '../../../../../../lib/db';
import {
  adminResourceIdSchema,
  currentAdminId,
  trustLevelUpdateSchema,
} from '../../../../../../lib/moderation';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await currentAdminId())) {
    return notFoundResponse();
  }

  const parsedId = adminResourceIdSchema.safeParse((await params).id);
  const parsedBody = trustLevelUpdateSchema.safeParse(await requestJson(request));
  if (!parsedId.success || !parsedBody.success) {
    return invalidInputResponse();
  }

  const user = await db.user.findUnique({
    where: { id: parsedId.data },
    select: { id: true },
  });
  if (!user) {
    return notFoundResponse();
  }

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { trustLevel: parsedBody.data.trustLevel },
    select: {
      id: true,
      email: true,
      plan: true,
      trustLevel: true,
      _count: { select: { pages: { where: { deletedAt: null } } } },
    },
  });

  return NextResponse.json({ user: updatedUser });
}
