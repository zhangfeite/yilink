import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// 本地 next dev 时也能通过 getCloudflareContext 访问 wrangler 的本地绑定（D1 等）
void initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@yilink/icons', '@yilink/moderation', '@yilink/shared'],
  // OpenNext Cloudflare 官方要求：Prisma client 保持外部依赖形态，
  // 构建期由 OpenNext patch 适配 workerd（勿让 webpack 内联）
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
