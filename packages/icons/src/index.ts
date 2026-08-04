export type PlatformIconId = 'wechat';

export interface PlatformIconMetadata {
  id: PlatformIconId;
  label: string;
  brandColor: `#${string}`;
  viewBox: string;
  paths: readonly string[];
}

export const wechatIcon: PlatformIconMetadata = {
  id: 'wechat',
  label: '微信',
  brandColor: '#07C160',
  viewBox: '0 0 24 24',
  paths: [
    'M9.3 3.5c-4 0-7.3 2.7-7.3 6 0 1.9 1.1 3.6 2.9 4.7l-.7 2.3 2.7-1.3c.8.2 1.6.3 2.4.3.4 0 .8 0 1.2-.1-.2-.6-.3-1.2-.3-1.8 0-3.4 3.2-6.1 7.1-6.1h.4c-1-2.3-4.3-4-8.4-4Zm-2.4 4.8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4.8 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
    'M22 13.6c0-2.8-2.8-5.1-6.2-5.1s-6.2 2.3-6.2 5.1 2.8 5.1 6.2 5.1c.7 0 1.4-.1 2.1-.3l2.3 1.1-.6-2c1.5-.9 2.4-2.3 2.4-3.9Zm-8.2-.9a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm4.1 0a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z',
  ],
};

export const platformIcons = [wechatIcon] as const;
export const platformIconIds = ['wechat'] as const;
