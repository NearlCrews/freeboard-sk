#!/usr/bin/env node
//
// Monotonic-decrease verifier for the Open Binnacle Phase 0 floor.
//
// Tracks per-file violation counts for two rule families:
//   @typescript-eslint/no-explicit-any  -> .eslint-any-baseline.json
//   rxjs-x/*                            -> .eslint-rxjs-baseline.json
//
// Usage:
//   node scripts/verify-baseline.mjs            verify counts <= baselines
//   node scripts/verify-baseline.mjs --seed     rewrite baselines from current
//   node scripts/verify-baseline.mjs --report   print current counts, no diff
//
// Scope defaults to src/**/*.ts. Override with --scope <glob> (single arg) for
// ad-hoc narrower views; committed baselines should stay at the default so the
// ratchet covers the whole app.
//
// Exit codes:
//   0  no regression (or seed/report mode)
//   1  regression: at least one file's count went up
//   2  config, I/O, or argument error
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const ANY_RULE = '@typescript-eslint/no-explicit-any';
const RXJS_PREFIX = 'rxjs-x/';
const ANY_BASELINE = resolve(ROOT, '.eslint-any-baseline.json');
const RXJS_BASELINE = resolve(ROOT, '.eslint-rxjs-baseline.json');
const DEFAULT_SCOPE = 'src/**/*.ts';

const argv = process.argv.slice(2);
const SEED = argv.includes('--seed');
const REPORT = argv.includes('--report');

const scopeIdx = argv.indexOf('--scope');
let SCOPE = DEFAULT_SCOPE;
if (scopeIdx > -1) {
  const value = argv[scopeIdx + 1];
  if (!value || value.startsWith('--')) {
    exit(
      2,
      'verify-baseline: --scope requires a glob argument, e.g. --scope "src/**/*.ts"'
    );
  }
  SCOPE = value;
}

function exit(code, msg) {
  if (msg) {
    const stream = code === 0 ? process.stdout : process.stderr;
    stream.write(msg.endsWith('\n') ? msg : `${msg}\n`);
  }
  process.exit(code);
}

function loadBaseline(path) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    exit(2, `Failed to parse ${relative(ROOT, path)}: ${error.message}`);
  }
}

function sortObjectKeys(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
  );
}

function writeBaseline(path, counts) {
  const sorted = sortObjectKeys(counts);
  const total = Object.values(sorted).reduce((sum, n) => sum + n, 0);
  const payload = {
    '//': 'Phase 0 monotonic-decrease baseline. See scripts/verify-baseline.mjs.',
    seededAt: new Date().toISOString().slice(0, 10),
    totalViolations: total,
    fileCount: Object.keys(sorted).length,
    perFile: sorted
  };
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function readBaselineMap(payload) {
  // Tolerate both `{perFile: {...}}` (current schema) and a bare `{file: count}` map.
  if (
    payload &&
    typeof payload === 'object' &&
    payload.perFile &&
    typeof payload.perFile === 'object'
  ) {
    return payload.perFile;
  }
  return payload && typeof payload === 'object' ? payload : {};
}

async function gatherCounts() {
  const eslint = new ESLint({
    cwd: ROOT,
    errorOnUnmatchedPattern: false
  });
  const results = await eslint.lintFiles([SCOPE]);

  const anyCounts = Object.create(null);
  const rxjsCounts = Object.create(null);

  for (const result of results) {
    const rel = relative(ROOT, result.filePath).replaceAll('\\', '/');
    for (const msg of result.messages) {
      if (!msg.ruleId) continue;
      if (msg.ruleId === ANY_RULE) {
        anyCounts[rel] = (anyCounts[rel] ?? 0) + 1;
      } else if (msg.ruleId.startsWith(RXJS_PREFIX)) {
        rxjsCounts[rel] = (rxjsCounts[rel] ?? 0) + 1;
      }
    }
  }
  return { anyCounts, rxjsCounts };
}

function diff(label, baselineMap, currentMap) {
  const regressions = [];
  const improvements = [];
  const fileKeys = new Set([
    ...Object.keys(baselineMap),
    ...Object.keys(currentMap)
  ]);
  for (const file of fileKeys) {
    const before = baselineMap[file] ?? 0;
    const after = currentMap[file] ?? 0;
    if (after > before) regressions.push({ file, before, after });
    else if (after < before) improvements.push({ file, before, after });
  }
  const baseTotal = Object.values(baselineMap).reduce((s, n) => s + n, 0);
  const currTotal = Object.values(currentMap).reduce((s, n) => s + n, 0);
  return { label, regressions, improvements, baseTotal, currTotal };
}

function reportDiff({
  label,
  regressions,
  improvements,
  baseTotal,
  currTotal
}) {
  const delta = currTotal - baseTotal;
  const arrow = delta > 0 ? '+' : '';
  process.stdout.write(
    `${label}: ${currTotal} (baseline ${baseTotal}, ${arrow}${delta})\n`
  );
  if (improvements.length) {
    process.stdout.write(`  improvements: ${improvements.length} file(s)\n`);
  }
  if (regressions.length) {
    process.stderr.write(`  regressions: ${regressions.length} file(s)\n`);
    for (const { file, before, after } of regressions) {
      process.stderr.write(`    ${file}: ${before} -> ${after}\n`);
    }
  }
  return regressions.length === 0;
}

async function main() {
  if (SEED && REPORT) exit(2, 'Use only one of --seed or --report.');

  const { anyCounts, rxjsCounts } = await gatherCounts();

  if (SEED) {
    const a = writeBaseline(ANY_BASELINE, anyCounts);
    const r = writeBaseline(RXJS_BASELINE, rxjsCounts);
    exit(
      0,
      `Seeded baselines: any=${a.totalViolations} across ${a.fileCount} file(s), rxjs-x=${r.totalViolations} across ${r.fileCount} file(s).`
    );
  }

  if (REPORT) {
    const aTot = Object.values(anyCounts).reduce((s, n) => s + n, 0);
    const rTot = Object.values(rxjsCounts).reduce((s, n) => s + n, 0);
    exit(
      0,
      `Current: any=${aTot} (${Object.keys(anyCounts).length} files), rxjs-x=${rTot} (${Object.keys(rxjsCounts).length} files).`
    );
  }

  const anyBaseline = readBaselineMap(loadBaseline(ANY_BASELINE));
  const rxjsBaseline = readBaselineMap(loadBaseline(RXJS_BASELINE));

  const anyDiff = diff('any', anyBaseline, anyCounts);
  const rxjsDiff = diff('rxjs-x', rxjsBaseline, rxjsCounts);

  const okAny = reportDiff(anyDiff);
  const okRxjs = reportDiff(rxjsDiff);

  if (!okAny || !okRxjs) {
    exit(
      1,
      '\nBaseline regression. Either fix the new violations or, if intentional, re-seed with: pnpm lint:baseline -- --seed'
    );
  }
  exit(0, '\nBaseline check OK (no per-file regressions).');
}

main().catch((error) => {
  exit(2, `verify-baseline crashed: ${error?.stack ?? error}`);
});
