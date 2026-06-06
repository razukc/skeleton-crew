import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vite cache directory (fixes deprecation warning)
  cacheDir: './node_modules/.vite',
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'demo/**', 'example/**'],
    // Performance optimizations
    pool: 'forks',
    poolOptions: {
      forks: {
        // Use `forks` instead of `threads` so each test file runs in its
        // own child process. tests/integration/memory-leak.test.ts samples
        // process.memoryUsage().heapUsed across init/shutdown cycles and
        // asserts heap growth stays below ~3000 KB; under the `threads`
        // pool, multiple test files share one process and heap samples
        // are polluted by other workers' allocations — the assertion
        // deterministically failed at ~4400 KB. Forks isolates the
        // measurement: the same test now lands consistently at 1.4–2.3 MB.
        //
        // Note we deliberately do NOT pass `execArgv: ['--expose-gc']`.
        // The test's `if (global.gc) { global.gc() }` calls are no-ops
        // either way (vitest's pool ignores execArgv on this version),
        // and the assertion passes without them. If a future change to
        // the test requires forced collection, this is the place to add
        // the flag back — but verify with the DIAG probe in #3 first.
        minForks: 1,
        maxForks: 4
      }
    },
    // Optimize for CI/local development
    reporter: process.env.CI ? 'dot' : 'default',
    // Reduce memory usage for property tests
    testTimeout: 10000,
    hookTimeout: 10000
  },
  esbuild: {
    // Faster transpilation
    target: 'es2022'
  }
});
