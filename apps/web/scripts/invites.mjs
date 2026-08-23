#!/usr/bin/env node
// 远端 D1：在本地生成 SQL 后用 `wrangler d1 execute yilink-db --remote --command "…"` 执行；切勿把明文邀请码写入 SQL 或日志。
import { createHash, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const [command, ...args] = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
const hash = (code) => createHash('sha256').update(code.trim().toLowerCase()).digest('hex');
const expiration = (value) => {
  if (!value) return null;
  const match = /^(\d+)(d)$/.exec(value);
  if (!match) throw new Error('--expires 仅支持如 30d');
  return new Date(Date.now() + Number(match[1]) * 86400000);
};

try {
  if (command === 'create') {
    const channel = option('--channel');
    const count = Number(option('--count'));
    const maxUses = Number(option('--max-uses') ?? '1');
    if (!channel || !Number.isInteger(count) || count < 1 || !Number.isInteger(maxUses) || maxUses < 1) throw new Error('参数无效');
    const expiresAt = expiration(option('--expires'));
    const codes = Array.from({ length: count }, () => randomBytes(9).toString('base64url').toLowerCase());
    await db.$transaction(codes.map((code) => db.inviteCode.create({ data: { codeHash: hash(code), channel, maxUses, expiresAt } })));
    process.stdout.write(`${codes.join('\n')}\n`);
  } else if (command === 'list') {
    const invites = await db.inviteCode.findMany({ orderBy: { createdAt: 'desc' }, select: { channel: true, usedCount: true, maxUses: true, expiresAt: true } });
    for (const invite of invites) process.stdout.write(`${invite.channel ?? '-'}\t${invite.usedCount}/${invite.maxUses}\t${invite.expiresAt?.toISOString() ?? 'never'}\n`);
  } else {
    throw new Error('用法：invites.mjs create --channel v2ex --count 30 --max-uses 1 --expires 30d | list');
  }
} finally {
  await db.$disconnect();
}
