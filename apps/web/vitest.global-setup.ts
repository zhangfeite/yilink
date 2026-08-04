import { execSync } from 'node:child_process';

// 在独立测试库上建 schema（幂等）；跑在 apps/web 目录下。
export default function globalSetup(): void {
  execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
    env: {
      ...process.env,
      DATABASE_URL: 'file:./data/test.db',
      XDG_CACHE_HOME: process.env.XDG_CACHE_HOME ?? '../../.cache',
    },
    stdio: 'inherit',
  });
}
