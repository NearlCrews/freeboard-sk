#!/usr/bin/env node
// Phase 0 architectural floor: block any TS file under src/app/ that exceeds
// the god-component LOC ceiling. Rule lives outside .dependency-cruiser.cjs
// because depcruise 17 does not check per-file LOC; the cruise script chains
// both gates.

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const TARGET = 'src/app';
const LOC_CEILING = 1500;

// Grandfathered files: pre-existing god components above the ceiling. Each
// gets its own decomposition PR in a later phase, listed in
// MODERNIZATION_ROADMAP.md sections 3 (Phase 3) and 4 (Framework lens).
const EXCLUDE = new Set(['src/app/modules/map/fb-map.component.ts']);

const SKIP_DIRS = new Set(['node_modules', '.angular', 'dist', 'public']);

function walk(dir, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const { name } = entry;
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

const files = walk(join(ROOT, TARGET), []);
const offenders = [];

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join('/');
  if (EXCLUDE.has(rel)) continue;
  const lines = readFileSync(file, 'utf8').split('\n').length;
  if (lines > LOC_CEILING) {
    offenders.push({ rel, lines });
  }
}

if (offenders.length > 0) {
  console.error(
    `god-component rule violated: ${offenders.length} file(s) exceed ${LOC_CEILING} LOC under ${TARGET}/`
  );
  for (const { rel, lines } of offenders) {
    console.error(`  ${lines} LOC  ${rel}`);
  }
  console.error(
    '\nIf this is intentional and unavoidable, add the path to the EXCLUDE set in tools/check-god-components.mjs with a roadmap-phase reference.'
  );
  process.exit(1);
}

console.log(
  `god-component rule OK: 0 files exceed ${LOC_CEILING} LOC under ${TARGET}/ (${EXCLUDE.size} grandfathered, ${files.length} scanned)`
);
