#!/usr/bin/env node
// Scope prefixes widen per phase as each modernization track lands its strict
// ratchet step. See MODERNIZATION_ROADMAP.md sections 3 (Phases 0, 1, and 2+), 5.
//
// Two scope sets:
//   NEW_PREFIXES:    surfaces required to be strict-clean (gating).
//   LEGACY_PREFIXES: surfaces with pre-existing strict errors (info only).
//
// Flags:
//   --raw     pass tsc output through unchanged (debugging).
//   --legacy  report errors under LEGACY_PREFIXES only, info-only mode.
//             Without --legacy, the script gates on NEW_PREFIXES.
//   --all     report combined in-scope (new + legacy), gates on new being zero.

import { spawnSync } from 'node:child_process';

// All of src/app/lib/ entered NEW_PREFIXES in Phase 5 after five
// burndown chunks cleared the legacy strict errors. The next ratchet
// targets are src/app/modules/skstream/, src/app/modules/map/, and
// src/app/modules/skresources/ per the roadmap; until each lands, the
// LEGACY_PREFIXES list stays narrow so a regression in app code under
// src/app/ does not silently pass the gate.
const NEW_PREFIXES = [
  'src/lib/',
  'src/types/',
  'src/app/lib/',
  'src/app/modules/skstream/'
];
const LEGACY_PREFIXES = [];

const RAW = process.argv.includes('--raw');
const LEGACY = process.argv.includes('--legacy');
const ALL = process.argv.includes('--all');

const ERROR_LINE = /^([^()\s][^()]*)\(\d+,\d+\):\s+error\s+TS\d+:/;

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
const newScope = [];
const legacyScope = [];
let totalErrors = 0;

for (const line of lines) {
  const match = line.match(ERROR_LINE);
  if (!match) continue;
  totalErrors += 1;
  const path = match[1].replaceAll('\\', '/');
  if (NEW_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    newScope.push(line);
  } else if (LEGACY_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    legacyScope.push(line);
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

const newLabel = NEW_PREFIXES.join(', ');
const legacyLabel = LEGACY_PREFIXES.join(', ');
const outOfScope = totalErrors - newScope.length - legacyScope.length;

if (LEGACY) {
  // Info-only report of legacy surfaces.
  if (legacyScope.length > 0) {
    process.stdout.write(legacyScope.join('\n'));
    process.stdout.write('\n\n');
  }
  process.stdout.write(
    `typecheck:strict (legacy): ${legacyScope.length} in-scope error(s) under ${legacyLabel} ` +
      `(${newScope.length} new-scope, ${outOfScope} out-of-scope suppressed).\n`
  );
  process.exit(0);
}

if (ALL) {
  // Print everything, gate on NEW being zero.
  if (newScope.length > 0) {
    process.stderr.write(newScope.join('\n'));
    process.stderr.write('\n\n');
  }
  if (legacyScope.length > 0) {
    process.stdout.write(legacyScope.join('\n'));
    process.stdout.write('\n\n');
  }
  process.stdout.write(
    `typecheck:strict: ${newScope.length} new-scope error(s) under ${newLabel}, ` +
      `${legacyScope.length} legacy-scope error(s) under ${legacyLabel}, ` +
      `${outOfScope} out-of-scope suppressed.\n`
  );
  process.exit(newScope.length > 0 ? 1 : 0);
}

// Default: gate on NEW_PREFIXES being zero. The legacy count is suppressed
// from stderr so a regression in new code is the only failure signal.
if (newScope.length > 0) {
  process.stderr.write(newScope.join('\n'));
  process.stderr.write(
    `\n\ntypecheck:strict: ${newScope.length} in-scope error(s) under ${newLabel}` +
      ` (${legacyScope.length} legacy-scope and ${outOfScope} out-of-scope suppressed; ` +
      `re-run with --legacy or --all for the full picture)\n`
  );
  process.exit(1);
}

process.stdout.write(
  `typecheck:strict: 0 in-scope error(s) under ${newLabel} ` +
    `(${legacyScope.length} legacy-scope diagnostic(s) suppressed under ${legacyLabel}, ` +
    `${outOfScope} out-of-scope; scope widens per roadmap phase).\n`
);
process.exit(0);
