#!/usr/bin/env node
/**
 * Build a subset of the Material Symbols Outlined variable font containing
 * only the glyphs (ligature names) freeboard-sk actually uses.
 *
 * Why this exists: the upstream Material Symbols Outlined woff2 is ~3.8 MB
 * uncompressed. After subsetting to the ~110 ligature names this app uses,
 * the output is dramatically smaller. Same icons, two orders of magnitude
 * smaller bundle.
 *
 * Why the harfbuzzjs FFI dance instead of subset-font with text input: the
 * upstream library's text-only API pulls in GSUB layout closure for the
 * ASCII letters of every ligature name. Material Symbols ligature names
 * cover the entire alphabet, so closure-based subsetting drags in roughly
 * every icon glyph in the font (~250 KB). This script shapes each icon
 * name first to discover its glyph id, then drives harfbuzz subset
 * directly with HB_SUBSET_FLAGS_NO_LAYOUT_CLOSURE plus an explicit glyph
 * set, which is the only way to land near the 60 KB Phase 3 target.
 *
 * Regenerate (run from repo root):
 *   node font_resources/material/build-subset.mjs
 *
 * When to regenerate:
 *   - You added or removed a <mat-icon>name</mat-icon> ligature in a template.
 *   - You added a new dynamic icon name in a .ts file (e.g. icon = 'foo';).
 *   - You changed help/index.html icon usage.
 *
 * How to find missing names quickly:
 *   grep -rEoh "<mat-icon[^>]*>[a-z_]+</mat-icon>" src/ \
 *     | grep -oE ">[a-z_]+<" | tr -d '<>' | sort -u
 *
 * The list below MUST stay sorted alphabetically; new names go in the
 * matching alphabetical slot. SVG icons (registered via MatIconRegistry,
 * see src/app/modules/icons/app.icons.ts) are NOT part of this font and
 * do NOT belong in the list.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

// fontverter ships as a transitive dependency of subset-font; resolve it
// through the subset-font package so we don't have to add a direct dep.
const require = createRequire(import.meta.url);
const fontverter = require(
  require.resolve('fontverter', { paths: [require.resolve('subset-font')] })
);
const harfbuzz = require(
  require.resolve('harfbuzzjs', { paths: [require.resolve('subset-font')] })
);

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const sourceFont = resolve(
  repoRoot,
  'node_modules',
  'material-symbols',
  'material-symbols-outlined.woff2'
);
const outputFont = resolve(here, 'material-symbols-subset.woff2');

// Curated glyph list. Keep alphabetical. Marine glyphs (anchor, explore,
// near_me, directions_boat, route, navigation, location_on, place, flag,
// waves, water_drop) are mandatory: see Phase 3 task #2 description.
const ICON_NAMES = [
  'access_time',
  'account_circle',
  'adb',
  'add',
  'add_location',
  'add_location_alt',
  'air',
  'airplanemode_active',
  'anchor',
  'apps',
  'apps_outage',
  'archive',
  'arrow_back',
  'arrow_back_ios',
  'arrow_downward',
  'arrow_forward',
  'arrow_forward_ios',
  'arrow_right_alt',
  'arrow_upward',
  'av_timer',
  'beenhere',
  'border_color',
  'brightness_auto',
  'cancel',
  'category',
  'center_focus_strong',
  'center_focus_weak',
  'check',
  'check_box',
  'chevron_left',
  'chevron_right',
  'clear_all',
  'close',
  'cloud_off',
  'compare_arrows',
  'compress',
  'crop_square',
  'dark_mode',
  'dataset',
  'delete',
  'description',
  'device_thermostat',
  'directions',
  'directions_boat',
  'download',
  'drag_indicator',
  'draw',
  'eco',
  'edit',
  'edit_location',
  'explore',
  'file_upload',
  'filter_drama',
  'filter_list',
  'flag',
  'flight',
  'fullscreen',
  'group_add',
  'group_remove',
  'help',
  'highlight_alt',
  'history',
  'import_export',
  'info',
  'insights',
  'invert_colors',
  'invert_colors_off',
  'key_off',
  'keyboard_arrow_down',
  'keyboard_arrow_left',
  'keyboard_arrow_right',
  'label',
  'language',
  'layers',
  'light_mode',
  'list_alt',
  'local_gas_station',
  'local_offer',
  'location_on',
  'lock',
  'map',
  'menu',
  'message',
  'more_horiz',
  'multiple_stop',
  'my_location',
  'navigation',
  'near_me',
  'note_alt',
  'notification_important',
  'opacity',
  'open_in_new',
  'person',
  'place',
  'public',
  'refresh',
  'remove',
  'replay',
  'room',
  'route',
  'save',
  'schedule',
  'science',
  'search',
  'settings',
  'show_chart',
  'skip_next',
  'skip_previous',
  'square_foot',
  'star',
  'straighten',
  'style',
  'swap_vertical_circle',
  'system_update_alt',
  'tab_unselected',
  'touch_app',
  'tour',
  'tune',
  'upload',
  'videocam',
  'view_list',
  'visibility',
  'visibility_off',
  'volume_mute',
  'volume_off',
  'warning',
  'water_drop',
  'waves',
  'zoom_in_map'
];

// HB_SUBSET_SETS_LAYOUT_FEATURE_TAG (keep no extra features, only liga + dflt)
const HB_SUBSET_SETS_LAYOUT_FEATURE_TAG = 6;
const HB_SUBSET_FLAGS_NO_LAYOUT_CLOSURE = 0x00000200;
const HB_MEMORY_MODE_WRITABLE = 2;

function hbTag(s) {
  return (
    ((s.charCodeAt(0) & 0xff) << 24) |
    ((s.charCodeAt(1) & 0xff) << 16) |
    ((s.charCodeAt(2) & 0xff) << 8) |
    (s.charCodeAt(3) & 0xff)
  );
}

async function discoverGlyphIds(fontBuffer) {
  // Use the harfbuzzjs shaper to map each icon name to its post-ligature
  // glyph id. The shaper expects raw SFNT (ttf/otf), so let fontverter
  // convert the upstream woff2 first.
  const sfnt = await fontverter.convert(fontBuffer, 'truetype');
  const hb = await harfbuzz;
  const blob = hb.createBlob(sfnt);
  const face = hb.createFace(blob, 0);
  const font = hb.createFont(face);
  font.setScale(1000, 1000);
  const seen = new Map();
  for (const name of ICON_NAMES) {
    const buffer = hb.createBuffer();
    buffer.addText(name);
    buffer.guessSegmentProperties();
    hb.shape(font, buffer);
    const infos = buffer.json();
    if (infos.length !== 1) {
      // After ligature substitution every icon name should collapse to a
      // single glyph; if it doesn't, Material Symbols dropped that name
      // (e.g. info_outline became info). Skip it and warn so the build
      // still produces a usable subset; the template will need updating.
      process.stderr.write(
        `WARN: icon "${name}" did not collapse to a single glyph (got ${infos.length}); skipping. Update templates to use a current Material Symbols name.\n`
      );
      buffer.destroy();
      continue;
    }
    seen.set(name, infos[0].g);
    buffer.destroy();
  }
  font.destroy();
  face.destroy();
  blob.destroy();
  return { sfnt: Buffer.from(sfnt), glyphIds: seen };
}

async function subsetWithExplicitGlyphs(sfnt, glyphIds) {
  // Drive the harfbuzz subset wasm directly so we can use
  // HB_SUBSET_FLAGS_NO_LAYOUT_CLOSURE together with an explicit glyph
  // set. The text-only convenience wrapper in subset-font does not
  // expose either, which is why this script can't reuse it.
  // harfbuzzjs is hoisted under pnpm's content-addressed store; resolve
  // it via the same dependency path subset-font uses so we don't have to
  // care about the exact on-disk layout.
  const subsetWasmPath = require.resolve('harfbuzzjs/hb-subset.wasm', {
    paths: [require.resolve('subset-font')]
  });
  const wasmBytes = await readFile(subsetWasmPath);
  const { instance } = await WebAssembly.instantiate(wasmBytes);
  const exports = instance.exports;
  const heapu8 = new Uint8Array(exports.memory.buffer);

  const fontBuffer = exports.malloc(sfnt.byteLength);
  heapu8.set(sfnt, fontBuffer);
  const blob = exports.hb_blob_create(
    fontBuffer,
    sfnt.byteLength,
    HB_MEMORY_MODE_WRITABLE,
    0,
    0
  );
  const face = exports.hb_face_create(blob, 0);
  exports.hb_blob_destroy(blob);

  const input = exports.hb_subset_input_create_or_fail();
  if (input === 0) {
    throw new Error('hb_subset_input_create_or_fail returned null');
  }

  // Keep all OpenType layout features (matches subset-font default and
  // ensures the `liga` feature mat-icon relies on stays enabled).
  const layoutFeatures = exports.hb_subset_input_set(
    input,
    HB_SUBSET_SETS_LAYOUT_FEATURE_TAG
  );
  exports.hb_set_clear(layoutFeatures);
  exports.hb_set_invert(layoutFeatures);

  exports.hb_subset_input_set_flags(
    input,
    exports.hb_subset_input_get_flags(input) | HB_SUBSET_FLAGS_NO_LAYOUT_CLOSURE
  );

  // Add the ASCII letters that appear in our icon names plus underscore.
  // These need to live in cmap so the browser can map `<mat-icon>anchor`
  // to glyph ids before GSUB ligature substitution runs.
  const unicodeSet = exports.hb_subset_input_unicode_set(input);
  const letters = new Set();
  for (const name of ICON_NAMES) {
    for (const ch of name) letters.add(ch.codePointAt(0));
  }
  for (const code of letters) {
    exports.hb_set_add(unicodeSet, code);
  }

  // Add the icon target glyph ids that ligature substitution maps to.
  const glyphSet = exports.hb_subset_input_glyph_set(input);
  for (const gid of glyphIds.values()) {
    exports.hb_set_add(glyphSet, gid);
  }

  // Pin every variation axis to a single instance.
  const axisDefaults = { wght: 400, FILL: 0, GRAD: 0, opsz: 24 };
  for (const [axis, value] of Object.entries(axisDefaults)) {
    if (!exports.hb_subset_input_pin_axis_location(input, face, hbTag(axis), value)) {
      throw new Error(`failed to pin variation axis ${axis}=${value}`);
    }
  }

  const subset = exports.hb_subset_or_fail(face, input);
  exports.hb_subset_input_destroy(input);
  if (subset === 0) {
    exports.hb_face_destroy(face);
    exports.free(fontBuffer);
    throw new Error('hb_subset_or_fail returned null');
  }

  const result = exports.hb_face_reference_blob(subset);
  const offset = exports.hb_blob_get_data(result, 0);
  const len = exports.hb_blob_get_length(result);
  if (len === 0) {
    exports.hb_blob_destroy(result);
    exports.hb_face_destroy(subset);
    exports.hb_face_destroy(face);
    exports.free(fontBuffer);
    throw new Error('subset output blob was empty');
  }
  const out = Buffer.from(heapu8.subarray(offset, offset + len));
  exports.hb_blob_destroy(result);
  exports.hb_face_destroy(subset);
  exports.hb_face_destroy(face);
  exports.free(fontBuffer);
  return out;
}

async function main() {
  const upstream = await readFile(sourceFont);
  const { sfnt, glyphIds } = await discoverGlyphIds(upstream);
  const subsetSfnt = await subsetWithExplicitGlyphs(sfnt, glyphIds);
  const woff2 = await fontverter.convert(subsetSfnt, 'woff2', 'truetype');
  await writeFile(outputFont, woff2);
  const fmt = (n) => `${(n / 1024).toFixed(1)} KB`;
  process.stdout.write(
    `material-symbols subset: ${glyphIds.size} glyphs, ${fmt(upstream.byteLength)} -> ${fmt(woff2.byteLength)} (${((1 - woff2.byteLength / upstream.byteLength) * 100).toFixed(1)}% smaller)\n`
  );
  process.stdout.write(`output: ${outputFont}\n`);
}

main().catch((err) => {
  process.stderr.write(`subset build failed: ${err.stack ?? err.message}\n`);
  process.exit(1);
});
