import { NextResponse } from 'next/server';

import { invalidInputResponse, notFoundResponse } from '../../../../../../../lib/api';
import { db } from '../../../../../../../lib/db';
import { adminResourceIdSchema, currentAdminId } from '../../../../../../../lib/moderation';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = await currentAdminId();
  if (!adminId) {
    return notFoundResponse();
  }

  const parsedId = adminResourceIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return invalidInputResponse();
  }

  const record = await db.moderationRecord.findUnique({ where: { id: parsedId.data } });
  if (!record || record.verdict !== 'review') {
    return notFoundResponse();
  }

  const resolvedRecord =
    record.reviewedBy === null
      ? await db.moderationRecord.update({
          where: { id: record.id },
          data: { reviewedBy: adminId },
        })
      : record;

  return NextResponse.json({ record: resolvedRecord });
}
