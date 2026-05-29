#!/usr/bin/env node
//
// Monotonic-decrease verifier for the Open Binnacle Phase 0 floor.
//
// Tracks per-file violation counts for two rule families:
//   @typescript-eslint/no-explicit-any  -> .eslint-any-baseline.json
//   rxjs-x/*                            -> .eslint-rxjs-baseline.json
//
// Usage:
//   node scripts/verify-baseline.mjs            verify counts <= baselines (full scan)
//   node scripts/verify-baseline.mjs --seed     rewrite baselines from current
//   node scripts/verify-baseline.mjs --report   print current counts, no diff
//   node scripts/verify-baseline.mjs --changed  only relint files changed vs origin/main; safe for local pre-push
//
// Scope defaults to src/**/*.ts. Override with --scope <glob> (single arg) for
// ad-hoc narrower views; committed baselines should stay at the default so the
// ratchet covers the whole app. ESLint caching is enabled by default; the cache
// lives at .eslintcache-baseline at the repo root. Delete the cache or pass
// --no-cache to force a clean lint.
//
// Exit codes:
//   0  no regression (or seed/report mode)
//   1  regression: at least one file's count went up
//   2  config, I/O, or argument error
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import rxjsX from 'eslint-plugin-rxjs-x';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const ANY_RULE = '@typescript-eslint/no-explicit-any';
const RXJS_PREFIX = 'rxjs-x/';
const ANY_BASELINE = resolve(ROOT, '.eslint-any-baseline.json');
const RXJS_BASELINE = resolve(ROOT, '.eslint-rxjs-baseline.json');
const CACHE_LOCATION = resolve(ROOT, '.eslintcache-baseline');
const DEFAULT_SCOPE = 'src/**/*.ts';

const argv = process.argv.slice(2);
const SEED = argv.includes('--seed');
const REPORT = argv.includes('--report');
const CHANGED = argv.includes('--changed');
const NO_CACHE = argv.includes('--no-cache');

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

function gitListChanged(args) {
  // execFileSync to avoid any shell interpretation of refs/paths.
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function changedFilesVsMain() {
  try {
    const base = gitListChanged(['merge-base', 'HEAD', 'origin/main']).trim();
    const committed = gitListChanged([
      'diff',
      '--name-only',
      '--diff-filter=ACMR',
      base,
      'HEAD'
    ]);
    const working = gitListChanged([
      'diff',
      '--name-only',
      '--diff-filter=ACMR'
    ]);
    const files = new Set();
    for (const line of `${committed}\n${working}`.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (!trimmed.endsWith('.ts')) continue;
      if (!trimmed.startsWith('src/')) continue;
      files.add(trimmed);
    }
    return [...files];
  } catch (err) {
    process.stderr.write(
      `verify-baseline: --changed could not compute diff vs origin/main (${err.message}); falling back to full scan\n`
    );
    return null;
  }
}

// Minimal flat-config used only by this verifier. It enables exactly the
// two rule families tracked in the baselines (no-explicit-any and
// rxjs-x/*) and uses parserOptions.projectService for fast incremental
// TS-program loading, instead of the full eslint.config.mjs (which would
// load all ~40 recommendedTypeChecked rules and reload the program on
// every run). On the Pi5 this drops a clean verifier run from ~10 minutes
// to roughly 30 seconds; cached runs land in a few seconds.
const VERIFIER_CONFIG = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'public/**',
      'coverage/**',
      '.angular/**',
      'font_resources/**',
      'out-tsc/**',
      'src/assets/**',
      '**/*.min.js'
    ]
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: ROOT
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'rxjs-x': rxjsX
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      // Mirror the rxjs-x rule set that eslint.config.mjs activates for
      // src/**/*.ts. Verifier rule list must match exactly or the
      // baseline counts diverge between this script and `pnpm lint`.
      'rxjs-x/no-async-subscribe': 'warn',
      'rxjs-x/no-create': 'error',
      'rxjs-x/no-ignored-takewhile-value': 'warn',
      'rxjs-x/no-nested-subscribe': 'warn',
      'rxjs-x/no-unbound-methods': 'warn',
      'rxjs-x/no-unsafe-takeuntil': 'warn'
    }
  },
  // Match eslint.config.mjs spec-file overrides so the verifier scores
  // the same warnings as the full config does.
  {
    files: ['**/*.spec.ts'],
    rules: {
      'rxjs-x/no-nested-subscribe': 'off',
      'rxjs-x/no-async-subscribe': 'off',
      'rxjs-x/no-create': 'off',
      'rxjs-x/no-ignored-takewhile-value': 'off',
      'rxjs-x/no-unbound-methods': 'off',
      'rxjs-x/no-unsafe-takeuntil': 'off'
    }
  }
];

async function gatherCounts() {
  const eslint = new ESLint({
    cwd: ROOT,
    errorOnUnmatchedPattern: false,
    overrideConfigFile: true,
    overrideConfig: VERIFIER_CONFIG,
    cache: !NO_CACHE,
    cacheLocation: CACHE_LOCATION,
    cacheStrategy: 'content'
  });

  let lintTargets = [SCOPE];
  let changedList = null;
  if (CHANGED) {
    changedList = changedFilesVsMain();
    if (changedList && changedList.length > 0) {
      lintTargets = changedList;
      process.stdout.write(
        `verify-baseline: --changed mode, scanning ${changedList.length} file(s) vs origin/main\n`
      );
    } else if (changedList && changedList.length === 0) {
      process.stdout.write(
        'verify-baseline: --changed mode, no .ts files changed vs origin/main; nothing to verify\n'
      );
      return { anyCounts: {}, rxjsCounts: {}, changedList: [] };
    }
  }

  const results = await eslint.lintFiles(lintTargets);

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
  return { anyCounts, rxjsCounts, changedList };
}

function diff(label, baselineMap, currentMap, scopedFiles) {
  const regressions = [];
  const improvements = [];
  // In --changed mode, only compare the files we actually scanned. Files
  // outside the scan are treated as unknown (skipped), not as zeroed-out
  // improvements that would mask a regression elsewhere on the next run.
  const fileKeys = scopedFiles
    ? new Set(scopedFiles)
    : new Set([...Object.keys(baselineMap), ...Object.keys(currentMap)]);
  for (const file of fileKeys) {
    const before = baselineMap[file] ?? 0;
    const after = currentMap[file] ?? 0;
    if (after > before) regressions.push({ file, before, after });
    else if (after < before) improvements.push({ file, before, after });
  }
  const baseTotal = Object.values(baselineMap).reduce((s, n) => s + n, 0);
  const currTotal = scopedFiles
    ? scopedFiles.reduce((s, f) => s + (currentMap[f] ?? 0), 0)
    : Object.values(currentMap).reduce((s, n) => s + n, 0);
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

  if (SEED && CHANGED) exit(2, 'Use --changed only with verify, not --seed.');

  const { anyCounts, rxjsCounts, changedList } = await gatherCounts();

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

  const scoped = CHANGED && changedList ? changedList : null;
  const anyDiff = diff('any', anyBaseline, anyCounts, scoped);
  const rxjsDiff = diff('rxjs-x', rxjsBaseline, rxjsCounts, scoped);

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
