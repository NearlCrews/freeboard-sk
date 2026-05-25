// Vitest 4 config consumed by `@angular/build:unit-test`. The test runner
// uses Angular's own file discovery, so `test.include` is not set here:
// Angular emits a warning if it is. `pool: 'threads'` overrides the v4
// default of `forks`; Angular tests run faster in shared workers than
// in isolated processes.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts', '@vitest/web-worker'],
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.d.ts']
    }
  }
});
