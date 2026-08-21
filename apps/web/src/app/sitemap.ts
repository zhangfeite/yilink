import type { MetadataRoute } from 'next';

import { db } from '@/lib/db';
import { siteOrigin } from '@/lib/origin';

/** 单张 sitemap 的公开页上限：超过再谈分片，先别为未发生的规模写复杂度。 */
const MAX_PAGE_ENTRIES = 5000;

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteOrigin();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: origin, changeFrequency: 'weekly', priority: 1 },
  ];

  // 只收已发布且未删除的页面。DRAFT/REVIEW/HIDDEN 一律不进——
  // 尤其 HIDDEN 是审核下架的，绝不能靠 sitemap 把它送回搜索引擎。
  const pages = await db.page
    .findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: MAX_PAGE_ENTRIES,
    })
    .catch((error: unknown) => {
      // 不能静默：这里曾吞掉 D1 的 DateTime 转换错，线上 sitemap 空了好几天没人知道。
      // 但也不能让整张 sitemap 500——爬虫拿到首页总好过拿到错误页。记日志、回落。
      console.error('[sitemap] failed to list published pages', error);
      return [];
    });

  return staticEntries.concat(
    pages.map((page) => ({
      url: `${origin}/p/${encodeURIComponent(page.slug)}`,
      lastModified: page.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  );
}
