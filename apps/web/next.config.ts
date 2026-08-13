import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// 本地 next dev 时也能通过 getCloudflareContext 访问 wrangler 的本地绑定（D1 等）。
// E2E/基线测试需要确定性的 SQLite 夹具库，此时跳过绑定注入（否则 D1 会压过 DATABASE_URL）。
if (process.env.YILINK_FORCE_SQLITE !== '1') {
  void initOpenNextCloudflareForDev();
}

const baseSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@yilink/icons', '@yilink/moderation', '@yilink/shared'],
  // OpenNext Cloudflare 官方要求：Prisma client 保持外部依赖形态，
  // 构建期由 OpenNext patch 适配 workerd（勿让 webpack 内联）
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  async headers() {
    return [
      {
        // 默认全站禁止被 iframe：studio/admin/登录注册是点击劫持的主要标的
        source: '/:path*',
        headers: [
          ...baseSecurityHeaders,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        ],
      },
      {
        // 公开页允许同源嵌入：营销首页 hero 用 iframe 实时预览 /p/demo-*；
        // 同 key 的规则后者覆盖前者（Next headers 匹配语义）
        source: '/p/:path*',
        headers: [
          ...baseSecurityHeaders,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
