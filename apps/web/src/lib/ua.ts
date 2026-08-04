export type UaClass = 'wechat' | 'weibo' | 'qq' | 'douyin' | 'browser' | 'bot';

const BOT_PATTERN =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|twitterbot|linkedinbot|bytespider|petalbot|headlesschrome|lighthouse/i;

export function classifyUserAgent(userAgent: string | null | undefined): UaClass {
  const ua = userAgent?.trim() ?? '';

  if (BOT_PATTERN.test(ua)) return 'bot';
  if (/micromessenger/i.test(ua)) return 'wechat';
  if (/weibo/i.test(ua)) return 'weibo';
  if (/aweme|douyin/i.test(ua)) return 'douyin';
  if (/(?:^|\s)qq\//i.test(ua) || /mqqbrowser/i.test(ua)) return 'qq';

  return 'browser';
}
