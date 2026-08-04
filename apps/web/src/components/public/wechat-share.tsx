'use client';

import { useEffect } from 'react';

import type { WechatJssdkConfig } from '@/lib/wechat-jssdk';

interface WechatShareProps {
  config: WechatJssdkConfig;
  share: { title: string; desc: string; link: string; imgUrl: string };
}

interface WxSdk {
  config: (options: Record<string, unknown>) => void;
  ready: (callback: () => void) => void;
  updateAppMessageShareData: (options: Record<string, unknown>) => void;
  updateTimelineShareData: (options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    wx?: WxSdk;
  }
}

const SDK_SRC = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';

/** 仅微信 UA 且服务端签名成功时渲染：配置转发/朋友圈分享卡片（标题/摘要/缩略图）。 */
export function WechatShare({ config, share }: WechatShareProps) {
  useEffect(() => {
    let cancelled = false;

    function setup() {
      const wx = window.wx;
      if (cancelled || !wx) return;
      wx.config({
        debug: false,
        appId: config.appId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData'],
      });
      wx.ready(() => {
        if (cancelled) return;
        wx.updateAppMessageShareData({ ...share, success: () => undefined });
        wx.updateTimelineShareData({ title: share.title, link: share.link, imgUrl: share.imgUrl });
      });
    }

    if (window.wx) {
      setup();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.onload = setup;
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [config, share]);

  return null;
}
