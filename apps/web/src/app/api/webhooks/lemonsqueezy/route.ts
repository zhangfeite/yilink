import { NextResponse } from 'next/server';

import { processLemonSqueezyWebhook, verifyLemonSqueezySignature } from '../../../../lib/billing';

export const runtime = 'nodejs';

function emptyResponse(status: number) {
  return new NextResponse(null, { status });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return emptyResponse(503);
  }

  try {
    const rawBody = await request.text();
    if (!verifyLemonSqueezySignature(rawBody, request.headers.get('x-signature'), webhookSecret)) {
      return emptyResponse(401);
    }

    const payload: unknown = JSON.parse(rawBody);
    await processLemonSqueezyWebhook(payload);
    return emptyResponse(200);
  } catch (error) {
    console.error('Failed to process LemonSqueezy webhook', error);
    return emptyResponse(500);
  }
}
