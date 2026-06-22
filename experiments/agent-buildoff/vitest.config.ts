import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    poolOptions: { forks: { minForks: 1, maxForks: 4 } },
    testTimeout: 20000,
  },
});
