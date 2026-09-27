import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    include: ['tests/**/*.test.ts'],
    setupFiles: [],
    env: {
      NODE_ENV: 'test',
    },
  },
});
