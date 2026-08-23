import { beforeEach, describe, expect, it } from 'vitest';

import { db } from './db';
import { activationSummary, normalizeChannel, recordPageCreated } from './activation';

async function clearDatabase() {
  await db.activationEvent.deleteMany();
  await db.inviteRedemption.deleteMany();
  await db.inviteCode.deleteMany();
  await db.block.deleteMany();
  await db.page.deleteMany();
  await db.order.deleteMany();
  await db.user.deleteMany();
}

describe('activation', () => {
  beforeEach(clearDatabase);

  it('accepts only safe attribution channels', () => {
    expect(normalizeChannel(' V2EX-2026 ')).toBe('v2ex-2026');
    expect(normalizeChannel('bad_channel')).toBeNull();
    expect(normalizeChannel('x'.repeat(25))).toBeNull();
  });

  it('records a milestone only once under concurrent requests', async () => {
    await db.user.create({ data: { id: 'activation-user', email: 'activation@example.com' } });
    await Promise.all([recordPageCreated('activation-user', 'page-a'), recordPageCreated('activation-user', 'page-b')]);
    await expect(db.activationEvent.findMany({ where: { userId: 'activation-user', kind: 'PAGE_CREATED' } })).resolves.toHaveLength(1);
  });

  it('groups channels and calculates the publish median', async () => {
    await db.user.createMany({ data: [{ id: 'u1', email: 'u1@example.com' }, { id: 'u2', email: 'u2@example.com' }] });
    const start = new Date('2026-08-20T00:00:00Z');
    await db.activationEvent.createMany({ data: [
      { userId: 'u1', kind: 'REGISTERED', channel: 'v2ex', createdAt: start },
      { userId: 'u1', kind: 'PAGE_CREATED', createdAt: new Date('2026-08-20T00:01:00Z') },
      { userId: 'u1', kind: 'PAGE_PUBLISHED', createdAt: new Date('2026-08-20T00:10:00Z') },
      { userId: 'u2', kind: 'REGISTERED', channel: 'v2ex', createdAt: start },
      { userId: 'u2', kind: 'PAGE_PUBLISHED', createdAt: new Date('2026-08-20T00:30:00Z') },
    ] });
    const summary = await activationSummary(new Date('2026-08-23T12:00:00Z'));
    expect(summary.channels).toContainEqual({ channel: 'v2ex', registered: 2, pageCreated: 1, pagePublished: 2, medianRegistrationToPublishMinutes: 20 });
  });
});
