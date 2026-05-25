#!/usr/bin/env node
// Phase 0 strict-typecheck wrapper. tsconfig.strict.json scopes `include` to
// `src/app/lib/**`, but tsc still transitively type-checks files that lib
// imports. This script runs the strict compile, filters diagnostics to the
// configured scope (default `src/app/lib/`), and returns a non-zero exit code
// only when in-scope errors exist.
//
// Future phases widen SCOPE_PREFIXES as each track lands its strict ratchet
// step. See MODERNIZATION_ROADMAP.md sections 3 (Phase 0), 5.

import { spawnSync } from 'node:child_process';

const SCOPE_PREFIXES = ['src/app/lib/'];
const RAW = process.argv.includes('--raw');

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

const stdout = result.stdout ?? '';
const stderr = result.stderr ?? '';
const combined = `${stdout}${stderr}`;

if (RAW) {
  process.stdout.write(combined);
  process.exit(result.status ?? 0);
}

const lines = combined.split('\n');
const inScope = [];
const errorLinePattern = /^([^()\s][^()]*)\(\d+,\d+\):\s+error\s+TS\d+:/;

for (const line of lines) {
  const match = line.match(errorLinePattern);
  if (!match) continue;
  const path = match[1].replaceAll('\\', '/');
  if (SCOPE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    inScope.push(line);
  }
}

const inScopeCount = inScope.length;
const totalErrors = lines.filter((line) => errorLinePattern.test(line)).length;
const outOfScope = totalErrors - inScopeCount;

if (inScopeCount > 0) {
  process.stderr.write(inScope.join('\n'));
  process.stderr.write(
    `\n\ntypecheck:strict: ${inScopeCount} in-scope error(s) under ${SCOPE_PREFIXES.join(', ')}` +
      ` (${outOfScope} out-of-scope error(s) suppressed)\n`
  );
  process.exit(1);
}

process.stdout.write(
  `typecheck:strict: 0 in-scope error(s) under ${SCOPE_PREFIXES.join(', ')} ` +
    `(${outOfScope} out-of-scope diagnostic(s) suppressed, scope widens per roadmap phase).\n`
);
process.exit(0);
