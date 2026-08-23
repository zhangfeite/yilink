'use client';

import { createElement } from 'react';

export function feedbackMailto(pageId?: string, userAgent = '', path = ''): string {
  const recipient = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || 'report@yilink.app';
  const version = process.env.NEXT_PUBLIC_BUILD_SHA || 'unknown';
  const body = [`页面 ID：${pageId ?? '无'}`, `浏览器：${userAgent || 'unknown'}`, `路径：${path || 'unknown'}`, `版本：${version}`].join('\n');
  return `mailto:${recipient}?subject=${encodeURIComponent('一链反馈')}&body=${encodeURIComponent(body)}`;
}

export function FeedbackLink({ pageId }: { pageId?: string }) {
  const href = feedbackMailto(
    pageId,
    typeof navigator === 'undefined' ? '' : navigator.userAgent,
    typeof window === 'undefined' ? '' : window.location.pathname,
  );
  return createElement('a', { className: 'text-accent underline', href }, '反馈问题');
}
