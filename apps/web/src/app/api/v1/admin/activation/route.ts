import { NextResponse } from 'next/server';

import { activationSummary } from '../../../../../lib/activation';
import { currentAdminId } from '../../../../../lib/moderation';

export async function GET() {
  if (!(await currentAdminId())) return new NextResponse(null, { status: 404 });
  return NextResponse.json(await activationSummary());
}
