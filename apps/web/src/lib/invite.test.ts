import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { inviteCodeHash, redeemInviteCode } from './invite';

const originalInviteCodes = process.env.INVITE_CODES;

async function clearDatabase() {
  await db.activationEvent.deleteMany();
  await db.inviteRedemption.deleteMany();
  await db.inviteCode.deleteMany();
  await db.user.deleteMany();
}

async function user(id: string) {
  await db.user.create({ data: { id, email: `${id}@example.com` } });
}

describe('invite redemption', () => {
  beforeEach(async () => {
    delete process.env.INVITE_CODES;
    await clearDatabase();
  });

  afterEach(() => {
    if (originalInviteCodes === undefined) delete process.env.INVITE_CODES;
    else process.env.INVITE_CODES = originalInviteCodes;
  });

  it('redeems a database code and returns its channel', async () => {
    await user('normal');
    await db.inviteCode.create({ data: { codeHash: inviteCodeHash('Alpha'), channel: 'v2ex' } });
    await expect(redeemInviteCode(' alpha ', 'normal')).resolves.toEqual({ ok: true, channel: 'v2ex' });
    await expect(db.inviteCode.findFirstOrThrow()).resolves.toMatchObject({ usedCount: 1 });
  });

  it('rejects expired and exhausted codes', async () => {
    await user('expired');
    await user('exhausted');
    await db.inviteCode.create({ data: { codeHash: inviteCodeHash('old'), expiresAt: new Date(0) } });
    await db.inviteCode.create({ data: { codeHash: inviteCodeHash('full'), usedCount: 1, maxUses: 1 } });
    await expect(redeemInviteCode('old', 'expired')).resolves.toMatchObject({ ok: false });
    await expect(redeemInviteCode('full', 'exhausted')).resolves.toMatchObject({ ok: false });
  });

  it('allows only one concurrent redemption at capacity', async () => {
    await user('race-one');
    await user('race-two');
    await db.inviteCode.create({ data: { codeHash: inviteCodeHash('race'), maxUses: 1 } });
    const results = await Promise.all([redeemInviteCode('race', 'race-one'), redeemInviteCode('race', 'race-two')]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it('keeps configured environment codes available during migration', async () => {
    await user('legacy');
    process.env.INVITE_CODES = ' Alpha ';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(redeemInviteCode('alpha', 'legacy')).resolves.toEqual({ ok: true, channel: null });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
