import { NextResponse } from 'next/server';

import { db } from '../../../lib/db';

type DatabaseRead = () => Promise<unknown>;

const readDatabase: DatabaseRead = () => db.$queryRaw`SELECT 1`;

async function healthResponse(read: DatabaseRead = readDatabase): Promise<NextResponse> {
  try {
    await read();
    return NextResponse.json({
      ok: true,
      version: '0.1.0',
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

export function GET() {
  return healthResponse();
}
