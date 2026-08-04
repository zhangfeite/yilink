import { NextResponse } from 'next/server';

import { auth } from './auth';

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function invalidInputResponse() {
  return apiError(400, 'INVALID_INPUT', '请求参数无效');
}

export function notFoundResponse() {
  return apiError(404, 'NOT_FOUND', '资源不存在');
}

export async function currentUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requestJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}
