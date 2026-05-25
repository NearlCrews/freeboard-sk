#!/usr/bin/env node
/*
 * Signal K schema codegen.
 *
 * Reads @signalk/signalk-schema and emits src/types/signalk-generated.ts with:
 *   - Branded `Path`, `Context`, and `SourceRef` string types (zero runtime cost)
 *   - Zero-cost cast helpers asPath, asContext, and asSourceRef
 *   - `KnownPath` string-literal and template-literal union of every Signal K
 *     path declared under `vessels.*`
 *   - `PathValueOf<P>` conditional type mapping a subset of known paths to
 *     their leaf value shapes (number, string, position, attitude, and datetime)
 *
 * Run with `pnpm codegen`. The generated file is committed so CI does not
 * need to invoke the codegen; PRs show drift when a contributor forgets.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SCHEMA_PKG = resolve(REPO_ROOT, 'node_modules/@signalk/signalk-schema');
const OUTPUT = resolve(REPO_ROOT, 'src/types/signalk-generated.ts');

const pkg = JSON.parse(
  readFileSync(resolve(SCHEMA_PKG, 'package.json'), 'utf8')
);
const SCHEMA_VERSION = pkg.version;

const keys = JSON.parse(
  readFileSync(resolve(SCHEMA_PKG, 'dist/keyswithmetadata.json'), 'utf8')
);

const ENVELOPE_LEAVES = new Set(['value', 'timestamp', '$source']);
const ENVELOPE_BRANCHES = new Set(['meta', 'values']);

// Filter a key from keyswithmetadata.json down to "this is a real
// vessel-scoped Signal K path", stripping value envelope and meta children.
function isCleanVesselKey(key) {
  if (!key.startsWith('/vessels/*/')) return false;
  const parts = key.split('/').slice(3);
  if (parts.length === 0) return false;
  if (ENVELOPE_LEAVES.has(parts.at(-1))) return false;
  for (const part of parts) {
    if (ENVELOPE_BRANCHES.has(part)) return false;
  }
  return true;
}

// Convert a keyswithmetadata key into a Signal K dotted path.
// `RegExp` segments are placeholders for instance ids; emit ${string}.
function toDottedPath(key) {
  return key
    .split('/')
    .slice(3)
    .map((s) => (s === 'RegExp' ? '${string}' : s))
    .join('.');
}

const rawKeys = Object.keys(keys).filter(isCleanVesselKey);
const dottedPathSet = new Set(rawKeys.map(toDottedPath));
const dottedPaths = [...dottedPathSet].sort();

const literalPaths = dottedPaths.filter((p) => !p.includes('${string}'));
const templatePaths = dottedPaths.filter((p) => p.includes('${string}'));

// ---- Value typing via group-schema traversal ----

const definitions = JSON.parse(
  readFileSync(resolve(SCHEMA_PKG, 'schemas/definitions.json'), 'utf8')
).definitions;

const GROUPS = [
  'communication',
  'design',
  'electrical',
  'environment',
  'navigation',
  'notifications',
  'performance',
  'propulsion',
  'resources',
  'sails',
  'sensors',
  'steering',
  'tanks'
];

const groupSchemas = {};
for (const g of GROUPS) {
  try {
    groupSchemas[g] = JSON.parse(
      readFileSync(resolve(SCHEMA_PKG, `schemas/groups/${g}.json`), 'utf8')
    );
  } catch {
    // Group missing from this schema version; skip silently.
  }
}

// Map the trailing definition name of a $ref to a TypeScript leaf type.
// Anything not in this table recurses through the resolved definition.
const VALUE_TYPE_LEAVES = {
  numberValue: 'number',
  stringValue: 'string',
  datetimeValue: 'string',
  nullValue: 'null',
  position: 'PositionValue',
  attitude: 'AttitudeValue',
  blob: 'string'
};

function refTail(ref) {
  const idx = ref.lastIndexOf('/');
  return idx === -1 ? ref : ref.slice(idx + 1);
}

function resolveRef(ref, currentGroup) {
  if (ref.startsWith('#/definitions/')) {
    const name = ref.slice('#/definitions/'.length);
    return groupSchemas[currentGroup]?.definitions?.[name];
  }
  if (ref.startsWith('../definitions.json#/definitions/')) {
    const name = ref.slice('../definitions.json#/definitions/'.length);
    return definitions[name];
  }
  return undefined;
}

const valueTypeByPath = new Map();
const MAX_WALK_DEPTH = 14;

function walk(node, dotted, currentGroup, depth, seenRefs) {
  if (!node || typeof node !== 'object') return;
  if (depth > MAX_WALK_DEPTH) return;

  if (node.$ref) {
    const tail = refTail(node.$ref);
    const leaf = VALUE_TYPE_LEAVES[tail];
    if (leaf) {
      if (dotted) valueTypeByPath.set(dotted, leaf);
      return;
    }
    if (seenRefs.has(node.$ref)) return;
    const next = new Set(seenRefs);
    next.add(node.$ref);
    const resolved = resolveRef(node.$ref, currentGroup);
    if (resolved) walk(resolved, dotted, currentGroup, depth + 1, next);
    return;
  }

  if (node.properties && typeof node.properties === 'object') {
    for (const [k, v] of Object.entries(node.properties)) {
      const nextDotted = dotted ? `${dotted}.${k}` : k;
      walk(v, nextDotted, currentGroup, depth + 1, seenRefs);
    }
  }

  // Pattern properties and `additionalProperties: <schema>` model
  // open-ended instance ids; emit a template-literal slot for them.
  const wildNext = dotted ? `${dotted}.\${string}` : '${string}';
  if (node.patternProperties && typeof node.patternProperties === 'object') {
    for (const v of Object.values(node.patternProperties)) {
      walk(v, wildNext, currentGroup, depth + 1, seenRefs);
    }
  }
  if (
    node.additionalProperties &&
    typeof node.additionalProperties === 'object'
  ) {
    walk(
      node.additionalProperties,
      wildNext,
      currentGroup,
      depth + 1,
      seenRefs
    );
  }

  for (const key of ['allOf', 'anyOf', 'oneOf']) {
    if (Array.isArray(node[key])) {
      for (const sub of node[key]) {
        walk(sub, dotted, currentGroup, depth + 1, seenRefs);
      }
    }
  }
}

for (const [g, schema] of Object.entries(groupSchemas)) {
  walk(schema, g, g, 0, new Set());
}

const typedEntries = [...valueTypeByPath.entries()]
  .filter(([p]) => dottedPathSet.has(p))
  .sort(([a], [b]) => a.localeCompare(b));

// ---- Emit ----

const out = [];
const push = (s = '') => out.push(s);

push('// AUTO-GENERATED, do not edit by hand. Run pnpm codegen.');
push(`// Source: @signalk/signalk-schema v${SCHEMA_VERSION}`);
push('//');
push('// Brand semantics: Path, Context, and SourceRef are nominal string');
push('// types. The brand is a phantom property keyed by a unique symbol, so');
push(
  '// every brand is erased by tsc and there is zero runtime cost. Construct'
);
push('// branded values with the as* helpers below or with `as Path` casts at');
push('// trust boundaries (delta ingestion, REST request handlers, and WS).');
push('//');
push(
  `// Coverage: ${literalPaths.length} literal paths, ${templatePaths.length} template paths, and ${typedEntries.length} typed leaves.`
);
push('');
push('// ---- Brand helpers ----');
push('');
push('declare const PathBrand: unique symbol;');
push('declare const ContextBrand: unique symbol;');
push('declare const SourceRefBrand: unique symbol;');
push('');
push('export type Path = string & { readonly [PathBrand]: never };');
push('export type Context = string & { readonly [ContextBrand]: never };');
push('export type SourceRef = string & { readonly [SourceRefBrand]: never };');
push('');
push('export const asPath = (s: string): Path => s as Path;');
push('export const asContext = (s: string): Context => s as Context;');
push('export const asSourceRef = (s: string): SourceRef => s as SourceRef;');
push('');
push('// ---- Value shapes referenced by PathValueOf ----');
push('');
push('export interface PositionValue {');
push('  latitude: number;');
push('  longitude: number;');
push('  altitude?: number;');
push('}');
push('');
push('export interface AttitudeValue {');
push('  yaw?: number;');
push('  pitch?: number;');
push('  roll?: number;');
push('}');
push('');
push('// ---- Known Signal K paths ----');
push('//');
push('// LiteralKnownPath: every fully-qualified path the schema declares.');
push(
  '// TemplateKnownPath: paths under instance-id slots like propulsion.<id>.'
);
push(
  '// The slot uses TypeScript template literals so any non-empty string is'
);
push('// assignment-compatible. KnownPath is the union of both.');
push('');

if (literalPaths.length === 0) {
  push('export type LiteralKnownPath = never;');
} else {
  push('export type LiteralKnownPath =');
  for (let i = 0; i < literalPaths.length; i++) {
    const sep = i === literalPaths.length - 1 ? ';' : '';
    push(`  | '${literalPaths[i]}'${sep}`);
  }
}
push('');

if (templatePaths.length === 0) {
  push('export type TemplateKnownPath = never;');
} else {
  push('export type TemplateKnownPath =');
  for (let i = 0; i < templatePaths.length; i++) {
    const sep = i === templatePaths.length - 1 ? ';' : '';
    // Template literal type literal: backticks around the dotted path.
    push(`  | \`${templatePaths[i]}\`${sep}`);
  }
}
push('');
push('export type KnownPath = LiteralKnownPath | TemplateKnownPath;');
push('');
push('// ---- PathValueOf<P> ----');
push('//');
push('// Maps a known Signal K path to its expected leaf value shape. Paths');
push('// not covered (or with heterogeneous shapes) resolve to `unknown`, so');
push('// callers always have a usable type and a narrowing point.');
push('');

if (typedEntries.length === 0) {
  push('export type PathValueOf<_P extends string> = unknown;');
} else {
  push('export type PathValueOf<P extends string> =');
  for (const [p, t] of typedEntries) {
    const literal = p.includes('${string}') ? `\`${p}\`` : `'${p}'`;
    push(`  P extends ${literal} ? ${t} :`);
  }
  push('  unknown;');
}
push('');

writeFileSync(OUTPUT, out.join('\n'));

process.stdout.write(
  `sk-codegen: wrote ${OUTPUT}\n` +
    `  schema:           @signalk/signalk-schema@${SCHEMA_VERSION}\n` +
    `  literal paths:    ${literalPaths.length}\n` +
    `  template paths:   ${templatePaths.length}\n` +
    `  typed leaves:     ${typedEntries.length}\n`
);
