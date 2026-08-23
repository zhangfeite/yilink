import { createHash } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { db } from './db';

function configuredInviteCodes(): Set<string> {
  return new Set((process.env.INVITE_CODES ?? '').split(',').map((code) => code.trim().toLowerCase()).filter(Boolean));
}

export function inviteCodeHash(code: string): string {
  return createHash('sha256').update(code.trim().toLowerCase()).digest('hex');
}

export function isInviteRequired(): boolean {
  return Boolean(process.env.INVITE_CODES?.trim());
}

export async function redeemInviteCode(code: unknown, userId: string): Promise<{ ok: boolean; channel: string | null }> {
  const normalized = typeof code === 'string' ? code.trim().toLowerCase() : '';
  const codeHash = normalized ? inviteCodeHash(normalized) : null;
  const invite = codeHash ? await db.inviteCode.findUnique({ where: { codeHash } }) : null;

  if (invite) {
    if (invite.expiresAt && invite.expiresAt <= new Date()) return { ok: false, channel: null };
    try {
      const [, increment] = await db.$transaction([
        db.inviteRedemption.create({ data: { codeId: invite.id, userId } }),
        db.inviteCode.updateMany({ where: { id: invite.id, usedCount: { lt: invite.maxUses } }, data: { usedCount: { increment: 1 } } }),
      ]);
      if (increment.count === 1) return { ok: true, channel: invite.channel };
      await db.inviteRedemption.deleteMany({ where: { codeId: invite.id, userId } });
      return { ok: false, channel: null };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { ok: false, channel: null };
      throw error;
    }
  }

  if (normalized && configuredInviteCodes().has(normalized)) {
    console.warn('Deprecated INVITE_CODES invitation code redeemed; migrate it to InviteCode.');
    return { ok: true, channel: null };
  }

  const hasDatabaseCodes = await db.inviteCode.findFirst({ select: { id: true } });
  return { ok: !hasDatabaseCodes && !isInviteRequired(), channel: null };
}
