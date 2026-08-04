import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PUBLISHED_AT = new Date('2026-08-04T08:00:00.000Z');
const STAT_DATE = new Date('2026-08-04T00:00:00.000Z');

const pages = [
  {
    slug: 'demo-illustrator',
    title: '林小满',
    bio: '画商业插画，也画绘本和头像。约稿开放中，档期与报价见下方「约稿须知」，全网同名，欢迎来聊。',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=82',
    layout: 'GRID',
    themeId: 'cream-paper',
    themeConfig: { role: '插画师 · 自由职业' },
    seoTitle: '林小满｜插画作品与约稿',
    seoDesc: '商业插画、绘本与头像作品集，约稿档期与合作流程。',
    ctaConfig: { type: 'wechat', label: '+ 加微信合作', value: 'linxiaoman' },
    templateId: 'illustrator-commission',
    blocks: [
      {
        id: 'seed-demo-illustrator-link-portfolio',
        type: 'LINK',
        size: 'LG',
        config: {
          title: '作品集 · Portfolio',
          desc: '插画与商业案例精选（持续更新）',
          url: 'https://example.com/linxiaoman/portfolio',
          sectionTitle: '作品与约稿',
        },
      },
      {
        id: 'seed-demo-illustrator-link-brief',
        type: 'LINK',
        size: 'MD',
        config: {
          title: '约稿须知',
          desc: '档期 / 报价 / 合作流程',
          url: 'https://example.com/linxiaoman/commission',
        },
      },
      {
        id: 'seed-demo-illustrator-social',
        type: 'SOCIAL',
        size: 'LG',
        config: {
          sectionTitle: '全网同名',
          items: [
            { platform: 'wechat', url: 'https://weixin.qq.com/' },
            { platform: 'bilibili', url: 'https://space.bilibili.com/' },
            { platform: 'douyin', url: 'https://www.douyin.com/' },
            { platform: 'xiaohongshu', url: 'https://www.xiaohongshu.com/' },
            { platform: 'weibo', url: 'https://weibo.com/' },
            { platform: 'github', url: 'https://github.com/' },
            { platform: 'zhihu', url: 'https://www.zhihu.com/' },
          ],
        },
      },
      {
        id: 'seed-demo-illustrator-wechat',
        type: 'WECHAT',
        size: 'LG',
        config: { wechatId: 'linxiaoman', note: '合作与约稿请加微信' },
      },
    ],
  },
  {
    slug: 'demo-photographer',
    title: '陈野',
    bio: '拍人像，也拍活动与婚礼纪实。常驻杭州，全国可飞。客片即水准，价目与档期见下方，加微信聊具体需求。',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=82',
    layout: 'GRID',
    themeId: 'ink-dark',
    themeConfig: { role: '人像·活动摄影师 · 约拍开放' },
    seoTitle: '陈野｜人像与活动摄影',
    seoDesc: '杭州人像、活动与婚礼摄影，查看真实客片、约拍价目和近期档期。',
    ctaConfig: { type: 'wechat', label: '+ 加微信约拍', value: 'chenye-photo' },
    templateId: 'photographer-booking',
    blocks: [
      {
        id: 'seed-demo-photographer-link-price',
        type: 'LINK',
        size: 'LG',
        config: {
          title: '约拍套餐与价目',
          desc: '人像 / 活动 / 婚礼，明码标价不套路',
          url: 'https://example.com/chenye/pricing',
          sectionTitle: '约拍与作品',
        },
      },
      {
        id: 'seed-demo-photographer-link-work',
        type: 'LINK',
        size: 'MD',
        config: {
          title: '客片精选',
          desc: '近半年真实客片，盗图必究',
          url: 'https://example.com/chenye/portfolio',
        },
      },
      {
        id: 'seed-demo-photographer-link-calendar',
        type: 'LINK',
        size: 'MD',
        config: {
          title: '近期档期',
          desc: '每月更新，定金锁档',
          url: 'https://example.com/chenye/calendar',
        },
      },
      {
        id: 'seed-demo-photographer-social',
        type: 'SOCIAL',
        size: 'LG',
        config: {
          sectionTitle: '全网同名',
          items: [
            { platform: 'wechat', url: 'https://weixin.qq.com/' },
            { platform: 'xiaohongshu', url: 'https://www.xiaohongshu.com/' },
            { platform: 'weibo', url: 'https://weibo.com/' },
            { platform: 'bilibili', url: 'https://space.bilibili.com/' },
          ],
        },
      },
      {
        id: 'seed-demo-photographer-wechat',
        type: 'WECHAT',
        size: 'LG',
        config: { wechatId: 'chenye-photo', note: '约拍与咨询请加微信' },
      },
    ],
  },
  {
    slug: 'demo-developer',
    title: '阿枫',
    bio: '白天写代码，晚上也写代码。正在做「一链」——给中文创作者用的链接名片。开发日志公开，欢迎围观、提 Issue 和 Star。',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=82',
    layout: 'LIST',
    themeId: 'minimal-light',
    themeConfig: { role: '独立开发者 · 正在做「一链」' },
    seoTitle: '阿枫｜一链 YiLink 独立开发日志',
    seoDesc: '一链 YiLink 产品主页、公开路线图与每周开发日志。',
    ctaConfig: {
      type: 'link',
      label: '☆ GitHub 上 Star',
      value: 'https://github.com/afeng/yilink',
    },
    templateId: 'indie-maker-product',
    blocks: [
      {
        id: 'seed-demo-developer-link-product',
        type: 'LINK',
        size: 'LG',
        config: {
          title: '产品主页 · 一链 YiLink',
          desc: '三分钟搭出你的链接名片',
          url: 'https://example.com/yilink',
          sectionTitle: '产品与动态',
        },
      },
      {
        id: 'seed-demo-developer-link-changelog',
        type: 'LINK',
        size: 'MD',
        config: {
          title: '更新日志 Changelog',
          desc: '每周更新，路线图公开',
          url: 'https://example.com/yilink/changelog',
        },
      },
      {
        id: 'seed-demo-developer-social',
        type: 'SOCIAL',
        size: 'LG',
        config: {
          sectionTitle: '在这些地方找到我',
          items: [
            { platform: 'github', url: 'https://github.com/afeng' },
            { platform: 'zhihu', url: 'https://www.zhihu.com/' },
            { platform: 'bilibili', url: 'https://space.bilibili.com/' },
          ],
        },
      },
      {
        id: 'seed-demo-developer-wechat',
        type: 'WECHAT',
        size: 'LG',
        config: { wechatId: 'afeng-dev', note: '交流合作请加微信' },
      },
    ],
  },
];

async function seedPage(userId, seed) {
  const { blocks, ...pageData } = seed;
  const page = await prisma.page.upsert({
    where: { slug: seed.slug },
    update: {
      ...pageData,
      userId,
      status: 'PUBLISHED',
      hiddenReason: null,
      publishedAt: PUBLISHED_AT,
    },
    create: {
      ...pageData,
      userId,
      status: 'PUBLISHED',
      publishedAt: PUBLISHED_AT,
    },
  });

  const blockIds = blocks.map((block) => block.id);
  await prisma.block.deleteMany({
    where: { pageId: page.id, id: { notIn: blockIds } },
  });

  for (const [position, block] of blocks.entries()) {
    await prisma.block.upsert({
      where: { id: block.id },
      update: {
        pageId: page.id,
        type: block.type,
        size: block.size,
        position,
        isVisible: true,
        config: block.config,
      },
      create: {
        ...block,
        pageId: page.id,
        position,
        isVisible: true,
      },
    });
  }

  await prisma.dailyStat.upsert({
    where: { pageId_date: { pageId: page.id, date: STAT_DATE } },
    update: { views: 12_408, uniques: 9_316, clicks: 2_107 },
    create: {
      id: `seed-${page.id}-stats`,
      pageId: page.id,
      date: STAT_DATE,
      views: 12_408,
      uniques: 9_316,
      clicks: 2_107,
    },
  });
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@yilink.local' },
    update: { name: '一链演示用户', trustLevel: 1 },
    create: {
      email: 'demo@yilink.local',
      name: '一链演示用户',
      trustLevel: 1,
    },
  });

  for (const page of pages) await seedPage(user.id, page);
  console.log(`Seeded demo user and ${pages.length} published pages.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
