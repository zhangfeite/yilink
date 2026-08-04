import { defineConfig } from 'vitest/config';

// API handler 测试直连 SQLite：独立 test.db + 串行执行（用例含全表清空，并行会互踩）。
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: 'file:./data/test.db',
    },
    globalSetup: './vitest.global-setup.ts',
  },
});
