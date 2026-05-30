# CHANGELOG: Open Binnacle

### Unreleased

- **New**: `fb-rich-text-editor` design-system primitive. Tier-3 Tiptap-backed
  WYSIWYG editor with a marine-curated text-color palette mapped to design
  tokens, an inline link-edit popover (replaces `window.prompt`), bold,
  italic, underline, undo, and redo. Two-way `[(value)]` HTML string binding.
- **New**: Tiptap-based note editor with feature parity over the prior
  `@kolkov/angular-editor` integration, plus inline link editing, color
  swatches, and reactive Remove-link state. Migration also fixed a
  data-loss bug where saving a Markdown note would overwrite the source
  with Tiptap's HTML rendering.
- **Changed**: Replaced `@kolkov/angular-editor` with Tiptap 3 +
  `ngx-tiptap` 14 (`@tiptap/core`, `@tiptap/starter-kit`,
  `@tiptap/extension-color`, `@tiptap/extension-link`,
  `@tiptap/extension-text-style`, `@tiptap/extension-underline`).
- **Changed**: Replaced `xml2js` with `fast-xml-parser` 5 in the chart
  capabilities worker, the GPX import worker, and the S57 chartsymbols
  loader. Resolves the persistent CommonJS ESM-bailout build warnings;
  also drops `buffer`, `events`, `stream`, `string_decoder`, and `timers`
  Node polyfills that only existed to keep `xml2js` building for the
  browser.
- **Changed**: Swapped `jsdom` for `happy-dom` in the Vitest test runner.
  Cumulative environment setup time across 407 specs went from 63.55 s
  to 32.83 s.
- **Changed**: Bumped runtime majors after compatibility verification:
  `@sentry/browser` 9 to 10, `proj4` 2.6 to 2.20 (also dropped the
  `require(...) as any` escape hatch since 2.20 ships bundled types),
  `uuid` 11 to 14, and `@types/express` 4 to 5.
- **Changed**: Bumped safe patches: `@angular/*` 21.2.12/14 to 21.2.13/15,
  `@signalk/server-api` 2.24 to 2.25, `@typescript-eslint` 8.59 to 8.60,
  `material-symbols` 0.44.9 to 0.44.10.
- **Changed**: `signalk.recommends` now cross-links three companion
  Signal K plugins authored alongside Open Binnacle:
  `signalk-crows-nest`, `signalk-virtual-weather-sensors`, and
  `signalk-nmea2000-emitter-cannon`.
- **Fix**: S-57 SAFCON depth-contour selection no longer mutates
  `selectedSafeContour` from inside an OpenLayers sort comparator. The
  comparator visited an order-dependent subset of feature pairs (TimSort
  across V8 / SpiderMonkey / JSC), so two runs could pick different
  contours as "the safety contour" against the same chart, with the wrong
  DEPCN line emphasized. Moved the running-min to `getStyle`, which OL
  invokes once per visible feature deterministically.
- **Fix**: Note dialog's Format dropdown now correctly recreates the
  editor when the user toggles between Markdown and HTML mid-edit. The
  previous behavior built the editor once in `ngOnInit` and stranded
  the user with no editor on a Markdown to HTML switch, or left an
  orphan editor instance on the reverse switch.
- **Fix**: Tiptap toolbar's Link button no longer silently swallows
  rejected URLs. `applyLink` now prepends `https://` for bare hosts
  (the common case of `example.com`) and only closes the popover on
  successful `setLink`.
- **Fix**: Duplicate Tiptap extension registration. StarterKit 3.x
  bundles Underline and Link by default; the explicit registrations
  were doubling event handlers and emitting a duplicate-extension
  warning. `StarterKit.configure({ link: false, underline: false })`
  now lets the explicit Link + Underline be the sole source.
- **Fix**: 6-agent full-codebase quality sweep surfaced and fixed a
  handful of real bugs: a Beaufort wind-speed conversion that used `^`
  (XOR) where `**` (exponentiation) was intended (`Bf(25 m/s)` was
  returning 29 instead of 9.634); shared-state mutation of a
  module-level vessel icon scale across all vessel instances; an
  `addFeatureUrls` signal mutation in the non-array branch; a leaked
  `setInterval` in `watchSKLogin`; inverted "no groups defined"
  prompts in three resource panels; `length < 0` (always false) guards
  on two OL directives; and `updateParams` receiving a signal function
  instead of its value.
- **Removed**: 5 leftover Node polyfills (`buffer`, `events`, `stream`,
  `string_decoder`, `timers`), `google-protobuf` (zero usage), and
  `@kolkov/angular-editor`. Dropped `jsdom` (replaced by `happy-dom`).

### v2.23.0

- **New**: Information panel providing a more complete display of resource details and actions. Includes support for displaying formatted markdown content in resource descriptions. (#373)
- **Added**: Settings to enable configuration COG and Heading line styles. (#375)
- **Fix**: S-57 popover to tolerate chart attributes in differing formats. (#372)
- **Removed**: Experimental mode and the unfinished Radar API integration.
