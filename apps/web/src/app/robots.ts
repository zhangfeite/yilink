import type { MetadataRoute } from 'next';

import { siteOrigin } from '@/lib/origin';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await siteOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 登录态区域与接口没有索引价值，且 /studio、/admin 出现在搜索结果里只会
        // 把访客送到登录墙前面。审核下架页靠公开页自身返回不可用，不依赖这里。
        disallow: ['/api/', '/studio', '/admin', '/login', '/register'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
