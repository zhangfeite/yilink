import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { db } from '../../../../lib/db';
// @ts-expect-error The reusable self-hosted ESM script intentionally has no .d.ts file.
import { rollupDaily } from '../../../../../scripts/rollup-daily.mjs';

export const runtime = 'nodejs';

function unavailableResponse(): NextResponse {
  return NextResponse.json({ ok: false }, { status: 503 });
}

export async function POST(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return unavailableResponse();

  // 常数时间比较：长度不同直接拒绝（timingSafeEqual 要求等长，长度本身不是秘密）
  const received = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const result = await rollupDaily(db);

    // TODO(spec-14): Page.deletedAt 的 30 天硬清理函数落地后，在此处同日调用。
    return NextResponse.json({ ok: true, ...result });
  } catch {
    // Cron 不暴露数据库细节；非 2xx 让调度器重试并留下失败记录。
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
