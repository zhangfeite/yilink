/** 公开页缓存标签：渲染器（spec-05）打标签，发布/审核接口（spec-04）失效它。 */
export function pageCacheTag(slug: string): string {
  return `page:${slug}`;
}

/** slug 规则与保留字：注册/建页共用（spec-04 校验，middleware 亦可复用）。 */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;
export const RESERVED_SLUGS = [
  'admin', 'api', 'app', 'studio', 'login', 'register', 'logout',
  'p', 'e', 'static', 'assets', 'health', 'www', 'about', 'templates',
  'docs', 'help', 'terms', 'privacy', 'pricing', 'blog', 'yilink', 'official',
] as const;
