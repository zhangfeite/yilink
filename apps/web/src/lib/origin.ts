import { headers } from 'next/headers';

function forwardedHeader(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null;
}

/**
 * 当前请求的站点源（协议 + 主机）。
 *
 * 分享卡片的 og:image、sitemap 的 loc 都必须是绝对地址，而托管版跑在 Cloudflare
 * Workers 上没有固定的构建期地址，只能从请求头推。localhost 走 http，其余一律 https
 * ——生产永远在 Cloudflare 后面，不给降级到 http 的机会。
 */
export async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host =
    forwardedHeader(requestHeaders.get('x-forwarded-host')) ??
    requestHeaders.get('host') ??
    'localhost:3000';
  const forwardedProto = forwardedHeader(requestHeaders.get('x-forwarded-proto'));
  const protocol =
    forwardedProto === 'http' || forwardedProto === 'https'
      ? forwardedProto
      : host.startsWith('localhost') || host.startsWith('127.0.0.1')
        ? 'http'
        : 'https';

  return `${protocol}://${host}`;
}

/** 站点公开地址：优先配置值，回落到当前请求源。 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return requestOrigin();
}
