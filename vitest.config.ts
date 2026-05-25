// Phase 0 floor: Vitest 4 configuration consumed by `@angular/build:unit-test`
// (architect `test` in angular.json sets `runnerConfig: true` which causes the
// builder to pick this file up). jsdom env, threads pool, v8 coverage scoped
// to src/.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['vitest.setup.ts', '@vitest/web-worker'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**'],
      exclude: [
        'node_modules/**',
        'public/**',
        'dist/**',
        'src/**/*.spec.ts',
        'src/**/*.d.ts'
      ]
    }
  }
});
