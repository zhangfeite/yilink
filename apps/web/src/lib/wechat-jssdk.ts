import { createHash, randomBytes } from 'node:crypto';

/**
 * 微信 JS-SDK 签名（分享卡片自定义的前提）。
 * 依赖公众号 AppID/AppSecret（env 未配置时整个功能休眠，页面零开销）；
 * 部署方需在公众号后台把主页域名加入「JS 接口安全域名」。
 * access_token / jsapi_ticket 官方有效期 7200s，进程内缓存 7000s（单实例足够；多实例托管版换共享缓存）。
 */

interface CachedValue {
  value: string;
  expiresAt: number;
}

let tokenCache: CachedValue | null = null;
let ticketCache: CachedValue | null = null;

export interface WechatJssdkConfig {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
}

export function wechatJssdkEnabled(): boolean {
  return Boolean(process.env.WECHAT_JSSDK_APP_ID?.trim() && process.env.WECHAT_JSSDK_APP_SECRET?.trim());
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { cache: 'no-store' });
  return (await response.json()) as Record<string, unknown>;
}

async function getAccessToken(appId: string, secret: string): Promise<string | null> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) return tokenCache.value;

  const data = await fetchJson(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(secret)}`,
  );
  const token = typeof data.access_token === 'string' ? data.access_token : null;
  if (!token) return null;
  tokenCache = { value: token, expiresAt: now + 7000_000 };
  return token;
}

async function getJsapiTicket(appId: string, secret: string): Promise<string | null> {
  const now = Date.now();
  if (ticketCache && ticketCache.expiresAt > now) return ticketCache.value;

  const token = await getAccessToken(appId, secret);
  if (!token) return null;

  const data = await fetchJson(
    `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${encodeURIComponent(token)}&type=jsapi`,
  );
  const ticket = typeof data.ticket === 'string' ? data.ticket : null;
  if (!ticket) return null;
  ticketCache = { value: ticket, expiresAt: now + 7000_000 };
  return ticket;
}

/** 官方签名算法：sha1 排序拼接串；url 必须与页面当前 URL（去 # 后）完全一致。 */
export function signJsapi(ticket: string, nonceStr: string, timestamp: number, url: string): string {
  const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url.split('#')[0]}`;
  return createHash('sha1').update(raw).digest('hex');
}

export async function getWechatJssdkConfig(url: string): Promise<WechatJssdkConfig | null> {
  const appId = process.env.WECHAT_JSSDK_APP_ID?.trim();
  const secret = process.env.WECHAT_JSSDK_APP_SECRET?.trim();
  if (!appId || !secret) return null;

  try {
    const ticket = await getJsapiTicket(appId, secret);
    if (!ticket) return null;

    const nonceStr = randomBytes(8).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    return { appId, timestamp, nonceStr, signature: signJsapi(ticket, nonceStr, timestamp, url) };
  } catch {
    return null; // 签名失败静默降级：分享卡片回落到 og 标签，不影响页面
  }
}
