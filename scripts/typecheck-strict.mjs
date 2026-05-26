#!/usr/bin/env node
// Runs tsc against tsconfig.strict.json (every src/**/*.ts surface that is
// strict-clean today) and gates pre-push on it. After Phase 5e clears the
// remaining template-bound consumers, the strict include can grow to all of
// `src/**` and this gating script retires when root tsconfig flips
// `strict: true`.

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  [
    'node_modules/typescript/bin/tsc',
    '-p',
    'tsconfig.strict.json',
    '--noEmit',
    '--pretty',
    'false'
  ],
  { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }
);

const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`;
const tscExitCode = result.status ?? 1;

if (result.signal) {
  process.stderr.write(
    `typecheck:strict: tsc terminated by signal ${result.signal}\n${combined}`
  );
  process.exit(2);
}

if (tscExitCode !== 0) {
  process.stderr.write(combined);
  process.stderr.write(
    `typecheck:strict: tsc exited ${tscExitCode}. See errors above.\n`
  );
  process.exit(tscExitCode);
}

process.stdout.write(
  'typecheck:strict: 0 errors across the strict-include surface.\n'
);
process.exit(0);
