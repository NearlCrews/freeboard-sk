#!/usr/bin/env node
// Phase 0 architectural floor: block any TS file under src/app/ that exceeds
// the god-component LOC ceiling. Grandfathered files are tracked here with a
// TODO link to the Phase 3 decomposition.
//
// Rule lives outside .dependency-cruiser.cjs because dependency-cruiser 17.4.2
// does not natively check per-file LOC; the cruise script chains both gates.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const TARGET = 'src/app';
const LOC_CEILING = 1500;

// Grandfathered files: pre-existing god components. Phase 3 (UX track) splits
// app.component.ts into AppShell + DialogOrchestrator + AudioAlarmService +
// MenuController. Phase 3 (data track) splits app.facade.ts into vessel,
// resource, course, settings, and alarms stores.
// See MODERNIZATION_ROADMAP.md sections 3 (Phase 3) and 4 (Framework lens).
const EXCLUDE = new Set([
  'src/app/app.component.ts',
  'src/app/app.facade.ts',
  // Additional pre-existing offenders. Each gets its own Phase 3 or Phase 4
  // breakout PR; listed here so the gate stays green for the rest of the tree.
  'src/app/modules/skresources/resources.service.ts',
  'src/app/modules/map/fb-map.component.ts',
  'src/app/modules/skstream/skstream.worker.ts'
]);

const SKIP_DIRS = new Set(['node_modules', '.angular', 'dist', 'public']);

function walk(dir, acc) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, acc);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
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
