import { existsSync, readFileSync } from 'node:fs';

import { sceneTemplatesFileSchema, type SceneTemplate } from '@yilink/shared';

import bundledTemplates from '@/templates/templates.json';

const fallbackTemplatesInput = [
  {
    id: 'illustrator-commission',
    nameZh: '插画师 · 约稿',
    persona: '创作者',
    scene: ['约稿', '作品展示'],
    defaultTheme: 'cream-paper',
    layout: 'GRID',
    cta: { type: 'wechat', label: '加微信约稿', value: 'linxiaoman' },
    identity: {
      title: '林小满',
      role: '插画师 · 自由职业',
      bio: '画商业插画，也画绘本和头像。约稿开放中，档期与报价见下方约稿须知，全网同名，欢迎来聊。',
    },
    blocks: [
      {
        type: 'LINK',
        size: 'LG',
        config: {
          title: '作品集 · Portfolio',
          desc: '插画与商业案例精选，持续更新',
          url: 'https://example.com/linxiaoman/portfolio',
        },
      },
      {
        type: 'LINK',
        size: 'MD',
        config: {
          title: '约稿须知',
          desc: '档期、报价与合作流程',
          url: 'https://example.com/linxiaoman/commission',
        },
      },
      {
        type: 'SOCIAL',
        size: 'SM',
        config: {
          items: [
            { platform: 'xiaohongshu', url: 'https://example.com/linxiaoman/xiaohongshu' },
            { platform: 'bilibili', url: 'https://example.com/linxiaoman/bilibili' },
            { platform: 'weibo', url: 'https://example.com/linxiaoman/weibo' },
          ],
        },
      },
      {
        type: 'TEXT',
        size: 'MD',
        config: { markdown: '**近期档期：** 本月可接 2 个商业项目，头像约稿 7 天内交付。' },
      },
    ],
  },
  {
    id: 'photographer-booking',
    nameZh: '摄影师 · 约拍',
    persona: '创作者',
    scene: ['约拍', '作品展示'],
    defaultTheme: 'ink-dark',
    layout: 'GRID',
    cta: { type: 'wechat', label: '加微信约拍', value: 'chenye-photo' },
    identity: {
      title: '陈野',
      role: '人像 · 活动摄影师',
      bio: '拍人像，也拍活动与婚礼纪实。常驻杭州，全国可飞。客片即水准，价目与档期见下方，加微信聊具体需求。',
    },
    blocks: [
      {
        type: 'LINK',
        size: 'LG',
        config: {
          title: '约拍套餐与价目',
          desc: '人像、活动、婚礼，明码标价',
          url: 'https://example.com/chenye/pricing',
        },
      },
      {
        type: 'LINK',
        size: 'MD',
        config: {
          title: '客片精选',
          desc: '近半年真实客片与完整故事',
          url: 'https://example.com/chenye/portfolio',
        },
      },
      {
        type: 'LINK',
        size: 'MD',
        config: {
          title: '近期档期',
          desc: '每月更新，定金锁档',
          url: 'https://example.com/chenye/calendar',
        },
      },
      {
        type: 'SOCIAL',
        size: 'SM',
        config: {
          items: [
            { platform: 'xiaohongshu', url: 'https://example.com/chenye/xiaohongshu' },
            { platform: 'weibo', url: 'https://example.com/chenye/weibo' },
            { platform: 'bilibili', url: 'https://example.com/chenye/bilibili' },
          ],
        },
      },
    ],
  },
  {
    id: 'indie-developer',
    nameZh: '独立开发者 · 产品页',
    persona: '开发者',
    scene: ['产品展示'],
    defaultTheme: 'minimal-light',
    layout: 'LIST',
    cta: { type: 'link', label: '查看 GitHub', value: 'https://example.com/afeng/github' },
    identity: {
      title: '阿枫',
      role: '独立开发者 · 正在做一链',
      bio: '白天写代码，晚上也写代码。正在做一链——给中文创作者用的链接名片。开发日志公开，欢迎围观、提 Issue 和 Star。',
    },
    blocks: [
      {
        type: 'LINK',
        size: 'LG',
        config: {
          title: '产品主页 · 一链 YiLink',
          desc: '三分钟搭出你的链接名片',
          url: 'https://example.com/afeng/yilink',
        },
      },
      {
        type: 'LINK',
        size: 'MD',
        config: {
          title: '更新日志 Changelog',
          desc: '每周更新，路线图公开',
          url: 'https://example.com/afeng/changelog',
        },
      },
      {
        type: 'SOCIAL',
        size: 'SM',
        config: {
          items: [
            { platform: 'github', url: 'https://example.com/afeng/github' },
            { platform: 'juejin', url: 'https://example.com/afeng/juejin' },
            { platform: 'bilibili', url: 'https://example.com/afeng/bilibili' },
          ],
        },
      },
      {
        type: 'WECHAT',
        size: 'MD',
        config: { wechatId: 'afeng-dev' },
      },
    ],
  },
] as const;

export const fallbackSceneTemplates: SceneTemplate[] =
  sceneTemplatesFileSchema.parse(fallbackTemplatesInput);

export function parseSceneTemplates(value: unknown): SceneTemplate[] {
  const parsed = sceneTemplatesFileSchema.safeParse(value);
  return parsed.success ? parsed.data : fallbackSceneTemplates;
}

export function loadSceneTemplates(filePath?: string): SceneTemplate[] {
  // 默认路径：构建期静态打包的 JSON（workerd 无文件系统，fs 只在显式传路径时用）
  if (!filePath) {
    return parseSceneTemplates(bundledTemplates as unknown);
  }

  if (!existsSync(filePath)) return fallbackSceneTemplates;
  const existingPath = filePath;

  try {
    return parseSceneTemplates(JSON.parse(readFileSync(existingPath, 'utf8')) as unknown);
  } catch {
    return fallbackSceneTemplates;
  }
}
