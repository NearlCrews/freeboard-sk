#!/usr/bin/env node
// SCOPE_PREFIXES widens per phase as each modernization track lands its strict
// ratchet step. See MODERNIZATION_ROADMAP.md sections 3 (Phase 0), 5.

import { spawnSync } from 'node:child_process';

const SCOPE_PREFIXES = ['src/app/lib/'];
const RAW = process.argv.includes('--raw');
const ERROR_LINE = /^([^()\s][^()]*)\(\d+,\d+\):\s+error\s+TS\d+:/;
const SCOPE_LABEL = SCOPE_PREFIXES.join(', ');

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

if (RAW) {
  process.stdout.write(combined);
  process.exit(tscExitCode);
}

const lines = combined.split('\n');
const inScope = [];
let totalErrors = 0;

for (const line of lines) {
  const match = line.match(ERROR_LINE);
  if (!match) continue;
  totalErrors += 1;
  const path = match[1].replaceAll('\\', '/');
  if (SCOPE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    inScope.push(line);
  }
}

// tsc failed but we recognized zero diagnostics: likely a config error or an
// output format we don't parse. Surface it rather than swallowing the failure.
if (tscExitCode !== 0 && totalErrors === 0) {
  process.stderr.write(
    `typecheck:strict: tsc exited ${tscExitCode} with no parseable diagnostics. Raw output:\n${combined}`
  );
  process.exit(2);
}

const outOfScope = totalErrors - inScope.length;

if (inScope.length > 0) {
  process.stderr.write(inScope.join('\n'));
  process.stderr.write(
    `\n\ntypecheck:strict: ${inScope.length} in-scope error(s) under ${SCOPE_LABEL}` +
      ` (${outOfScope} out-of-scope error(s) suppressed)\n`
  );
  process.exit(1);
}

process.stdout.write(
  `typecheck:strict: 0 in-scope error(s) under ${SCOPE_LABEL} ` +
    `(${outOfScope} out-of-scope diagnostic(s) suppressed, scope widens per roadmap phase).\n`
);
process.exit(0);
