import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // 三个 spec 文件共用一个 dev server：并发会让它的按需编译触发 HMR 整页刷新，
  // 打断别的测试正在进行的导航（ERR_ABORTED）或清掉弹窗状态。串行换确定性。
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm db:deploy && pnpm dev --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: 'file:./data/yilink-e2e.db',
      YILINK_FORCE_SQLITE: '1',
      AUTH_SECRET: 'yilink-e2e-secret-with-at-least-32-bytes',
      AUTH_URL: 'http://127.0.0.1:3000',
    },
  },
});
