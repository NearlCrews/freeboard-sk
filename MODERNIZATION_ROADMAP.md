# Open Binnacle modernization roadmap

Date: 2026-05-24. Owner: Nearl Crews. Open Binnacle is the rebranded fork of [SignalK/freeboard-sk](https://github.com/SignalK/freeboard-sk); this roadmap is not aligned with upstream.

Synthesis of a 6-expert team review (framework, map/geo, data, build, UX, quality). Every version below was verified live against the npm registry on 2026-05-24. The build lens owns the version truth-table; if any later PR cites an older version, this document is the corrector.

---

## 1. Headline decision

**Stay on Angular 21, reshape the rest.** The Angular 21 signals story is now mature, the codebase has already absorbed signals heavily, and the marine reactivity model (delta streams, per-vessel state, signal-derived derived views) maps cleanly onto Angular's primitives. A framework swap to React, Solid, Svelte, or Qwik would be a 6 to 12 month rewrite for marginal gain.

What changes around Angular is large:

- Angular Material drops; Tailwind v4 + CDK + a hand-rolled 15-primitive design system replaces it
- RxJS retreats to the WebSocket and HTTP boundary; signals carry user-facing state
- OpenLayers 10.9 stays but the chart subsystem is reshaped (lazy splits, OffscreenCanvas night-mode, WebGLPoints for AIS above ~50 targets, drop geolib, drop simplify-ts, upgrade pmtiles 2 to 4)
- SignalK ingestion becomes a path-keyed `SignalKStore` of signals with `bufferTime(16)` rAF-aligned writes, schema-codegen from `@signalk/signalk-schema`, branded `Path`/`Context`/`SourceRef` types
- The 2002-line `app.component.ts` and 1216-line `app.facade.ts` decompose into focused shells, orchestrators, and stores
- Build moves to pnpm 11 + Corepack on Node 24 LTS, with a real 8-job CI gate (typecheck, lint, unit, build, bundle-size, e2e, Lighthouse, any-baseline), Vitest 4 for units, Playwright 1.60 for e2e, Sentry for observability
- TypeScript ratchets to strict via a parallel `tsconfig.strict.json`, ESLint 10 flat-config, axe-core a11y in CI, ~300 visual-regression baselines

---

## 2. Locked stack (all latest stable as of 2026-05-24)

| Layer             | Tool                              | Version          | Notes                                                                                     |
| ----------------- | --------------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| Runtime           | Node.js                           | 24 LTS (Active)  | `.nvmrc`; CI matrix `22 + 24`                                                             |
| Package manager   | pnpm                              | 11.2.2           | Via Corepack                                                                              |
| Language          | TypeScript                        | 5.9.3            | Held: `@angular/build@21.2.12` peer cap `<6.0`. Target 6.0.3 when Angular bumps to `<6.1` |
| Framework         | Angular                           | 21.2.14          | Ride-along bump from 21.0.5                                                               |
| Build             | `@angular/build`                  | 21.2.12          | esbuild builder                                                                           |
| Reactivity        | Angular signals + signal-forms    | 21.2.14          | RxJS 7.8.2 at boundary only (v8 still alpha)                                              |
| Map               | OpenLayers                        | 10.9.0           | Minor bump from 10.7                                                                      |
| Map style         | ol-mapbox-style                   | 13.4.1           | **Major** from 12.3.5; lazy-loaded                                                        |
| Vector tiles      | pmtiles                           | 4.4.1            | **Major** from 2.7.0; lazy-loaded                                                         |
| Projections       | proj4                             | 2.20.8           | For non-3857 charts                                                                       |
| SignalK API       | `@signalk/server-api`             | 2.24.0           | Already pinned                                                                            |
| SignalK schema    | `@signalk/signalk-schema`         | 1.8.2            | New, drives codegen                                                                       |
| Styling           | Tailwind                          | 4.3.0            | CSS-first config                                                                          |
|                   | `@tailwindcss/postcss`            | 4.3.0            |                                                                                           |
|                   | Material CDK                      | 21.2.12          | Kept                                                                                      |
|                   | Material core                     | (drops in tiers) | Tier-1: button/dialog/sheet/sidenav/FAB/menu/snackbar/icon                                |
| Icons             | Material Symbols                  | 0.44.9           | Variable font, glyphhanger subset (~60 kB)                                                |
|                   | glyphhanger                       | 5.0.0            | Node-only                                                                                 |
|                   | subset-font                       | 2.5.0            | HarfBuzz-WASM                                                                             |
| Fonts             | Inter v4.1, JetBrains Mono v2.304 | self-hosted      | Numerals, mono for coordinates                                                            |
| Color             | culori                            | 4.0.2            | Token math, contrast lints                                                                |
| Forms             | `@angular/forms/signals`          | 21.2.14          | New code; legacy reactive migrates in tier 2                                              |
| Service worker    | `@angular/service-worker`         | 21.2.14          | Real PWA (not `@angular/pwa` schematic)                                                   |
| Lint              | ESLint                            | 10.4.0           | Flat config, requires plugin updates                                                      |
|                   | typescript-eslint                 | 8.59.4           | recommended-type-checked                                                                  |
|                   | `@angular-eslint`                 | 21.4.0           |                                                                                           |
|                   | `eslint-plugin-rxjs-x`            | 1.0.2            | 1.0 stable, replaces deprecated `eslint-plugin-rxjs`                                      |
|                   | `eslint-plugin-import`            | 2.32.0           |                                                                                           |
|                   | `eslint-plugin-unicorn`           | 64.0.0           | Curated rules                                                                             |
|                   | `eslint-plugin-prettier`          | 5.5.5            |                                                                                           |
| Format            | Prettier                          | 3.8.3            |                                                                                           |
| Test runner       | Vitest                            | 4.1.7            | Via `@angular/build:unit-test`                                                            |
|                   | jsdom                             | 29.1.1           |                                                                                           |
|                   | `@testing-library/angular`        | 19.3.0           |                                                                                           |
|                   | `@vitest/coverage-v8`             | 4.1.7            |                                                                                           |
|                   | `@vitest/web-worker`              | 4.1.7            |                                                                                           |
| E2E               | `@playwright/test`                | 1.60.0           | Container `mcr.microsoft.com/playwright:v1.60.0-jammy`                                    |
| A11y              | `@axe-core/playwright`            | 4.11.3           | Hard-fail rules + grandfathered baseline                                                  |
| Type tests        | expect-type                       | 1.3.0            |                                                                                           |
| Hooks             | simple-git-hooks                  | 2.13.1           |                                                                                           |
|                   | lint-staged                       | 17.0.5           |                                                                                           |
|                   | `@commitlint/cli`                 | 21.0.1           |                                                                                           |
| Release           | release-please-action             | v5               | Requires Node 24 worker                                                                   |
| Observability     | `@sentry/angular`                 | 10.53.1          | SaaS first, GlitchTip fallback                                                            |
|                   | web-vitals                        | 5.2.0            |                                                                                           |
| Bundle gate       | size-limit                        | 12.1.0           | Current-measured baseline, ratcheted                                                      |
| Architecture lint | dependency-cruiser                | 17.4.2           | God-component prevention rule                                                             |

**Removed**: `@kolkov/angular-editor`, `signalk-client-angular` (vendor inline), `simplify-ts` (vendor inline ESM), `geolib` (replace with `ol/sphere` at 8 sites), `semver` (already inlined), `ngeohash` (already inlined).

**Held back**: TypeScript 6.0.3 (Angular peer-dep gate), RxJS 8 (still alpha).

---

## 3. Phased roadmap

Phase numbers are cross-lens; each entry names the owning lens(es). Sequencing respects dependency order across leads. Calendar estimate ~5 months single-developer pace; many phases parallelize.

### Phase 0: Floor PR (week 1, qa-lead owns)

Single coherent PR, no app code changes:

- pnpm 11.2.2 via Corepack, `package.json` `packageManager` field, `pnpm-lock.yaml`
- `.nvmrc` Node 24, CI matrix Node 22 + 24
- ESLint 10 flat config with full plugin stack
- `tsconfig.strict.json` parallel file, Phase 0 scope = `src/app/lib/`
- `.eslint-any-baseline.json` + `.eslint-rxjs-baseline.json` monotonic-decrease verifiers
- Vitest 4 + `@angular/build:unit-test` wired (no specs yet)
- Playwright 1.60 in CI matrix (no specs yet, container only)
- 8-job `ci.yml`: typecheck, lint, unit, build, size-limit (warn-only), bundle-cruiser, e2e-skeleton, lighthouse-info
- `simple-git-hooks` + `lint-staged` + `@commitlint/cli`
- `dependency-cruiser` with one rule (no god-components)
- size-limit current-measured baseline, 10% warn / 25% fail per chunk

**Outcome**: every later PR runs the gate. Nothing else can ship without it.

### Phase 1: Reactivity and data foundation (weeks 2 to 6, framework-lead + data-lead)

- Angular minor bump 21.0.5 to 21.2.14, all `@angular/*`
- Finish takeUntilDestroyed across the 9 manual-cleanup files + 17 services (`perf-followups.md` M1)
- Replace `EventEmitter` with `output<T>()` everywhere
- Vendor-inline `signalk-client-angular` into `src/lib/signalk-client/`
- Vendor-inline `simplify-ts` as ESM
- Schema codegen `tools/sk-codegen.mjs` → `src/types/signalk-generated.ts`
- Branded `Path`, `Context`, `SourceRef` types from `@signalk/server-api`
- `SignalKStore`: path-keyed `Map<Path, WritableSignal<PathState<T>>>`
- `bufferTime(16)` rAF-aligned batched writes from the WS boundary
- Worker slimmed to ~200 LOC: SimplifyAP + AIS expiry only
- `PathState<T>` carries `lastUpdate`, `age`, `state` for UX staleness display
- `signalk-client-angular` package removed
- TS strict ratchet: phases 1-2 (`src/lib/`, `src/types/`)

### Phase 2: Zoneless (week 7, framework-lead)

- Verify zero NgZone usage; flip via `provideExperimentalZonelessChangeDetection()`
- Remove `zone.js` from polyfills
- Lint rule: `no-zonejs`
- Bundle drops ~30 kB gz

### Phase 3: UI kit swap and shell decomposition (weeks 8 to 19, ux-lead + framework-lead parallel)

UX track (ux-lead, weeks 8 to 19):

- Tailwind v4 + `src/tokens.css` with three `[data-theme]` blocks (light, dark, night-red)
- Material Symbols variable font, glyphhanger subset to ~120 glyphs
- Hand-rolled CDK-based primitives, Tier 1 first (button, dialog, sheet, sidenav, FAB, menu, snackbar, icon, ~15 primitives)
- `/design-system` showcase route with all variants + a11y checks
- Notes module ships as canary (already mostly done on `refactor/notes-modernize`)
- App shell + Angular Router with `withHashLocation()`, 4 top-level routes
- Connection-state pill in status bar, two-tier alarm UX (modal critical + toast → alarm tray sub-critical)
- Tier 2 forms primitives + signal-forms migration
- Resources surfaces (routes, waypoints, AIS, charts, resourcesets) move to 3-pane Bear pattern

Framework track (framework-lead, weeks 8 to 11, parallel):

- `app.component.ts` 2002 LOC → `AppShell` + `DialogOrchestrator` + `AudioAlarmService` + `MenuController`
- `app.facade.ts` 1216 LOC → 5 focused stores (vessel, resource, course, settings, alarms)

### Phase 4: Map reshape (weeks 8 to 15, map-lead, parallel)

Phase 4a (narrow PRs, weeks 8 to 10):

- `refactor/pmtiles-v4-lazy`: bump pmtiles 2 → 4 + lazy-load
- Lazy-load `ol-mapbox-style@13.4.1`
- Fix blob URL leak in raster tile loader
- PMTiles `TileState` enum cleanup
- Drop `geolib` (8 sites → `ol/sphere`)
- Per-tile OffscreenCanvas night-mode filter (kills the `.app-night` CSS filter hack)

Phase 4b (architecture, weeks 11 to 13):

- `IMapAdapter` interface
- `LayerComponentBase` with signal-input migration (gated on Phase 1 complete)
- Lazy-load S57 bundle (~50 kB)
- `MapThemeService` for canvas-side token resolution (consumes UX tokens)
- Test helpers: `window.fb.testMode`, `window.fb.s57.preload`, `window.fb.waitTilesIdle`

Phase 4c (perf, weeks 14 to 15):

- AIS → OL WebGLPoints above ~50-target threshold (consumes data-lead's per-target signals)
- WebGLTile for raster basemap
- WebGL fragment-shader night-mode (replaces the OffscreenCanvas filter from 4a)

### Phase 5: TS strict ratchet completion (weeks 6 to 14, qa-lead + everyone, parallel)

Status (2026-05-26): COMPLETE. Root `tsconfig.json` has `strict: true`,
`noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`,
`noImplicitOverride: true`, `noPropertyAccessFromIndexSignature: true`,
`noImplicitReturns: true`, `noFallthroughCasesInSwitch: true`. Every
`.ts` file plus every Angular template TCB passes. Pre-push gate
collapsed back to `pnpm typecheck`. The parallel gating script
`scripts/typecheck-strict.mjs` and `tsconfig.strict.json` retired.

Phase 5e (template TCB sweep) landed via 3 parallel agents:

- Shell + map + settings templates (12+12+7 errors)
- Notes templates (62 errors)
- Panels + popovers + dialogs (~30 errors)
- Lead drove final cascade fixes (autopilot, fb-map wind-lines,
  vessel-popover formatSpeed nullability, waypoint-dialog
  handleIconSelected, alarm.store.spec mock tuple access).

Spec files updated to access vitest `mock.calls[i]` tuples via `!`
non-null assertion since the test arrangement guarantees the call
fired. `formatSpeed` on AppFacade and SettingsStore widened to
accept `number | null` so SKVessel.wind nullable readings flow
through without per-binding guards. The strict-mode preset is
the new project default for all .ts and template code.

### Phase 6: Forms, settings, weather, PWA (weeks 15 to 18, ux-lead + build-lead)

Status (2026-05-26): PWA + Sentry + offline banner shipped. signal-forms
and the settings/weather UX rebuild stay open for the ux-lead sprint.

- [ ] signal-forms across remaining ReactiveForms (deferred: every dialog
      form needs migration; multi-day surface)
- [ ] Settings, Weather rebuilt on tier-2 primitives (deferred: UX-track)
- [x] `@angular/service-worker@21.2.14` installed and wired via
      `provideServiceWorker(...)` in `src/main.ts`; `angular.json` build
      options point at `ngsw-config.json`. Production builds emit
      `ngsw-worker.js` and `ngsw.json`.
- [x] `ngsw-config.json` cache spec: app-shell prefetch; lazy
      assets/media; networkFirst SignalK API with 3 s timeout and 1 h
      maxAge; cacheFirst chart tiles (pmtiles, mbtiles, XYZ raster)
      with 30 d maxAge and 2000-entry maxSize.
- [x] `PwaService` wired to real `SwUpdate`; exposes `online`,
      `updateAvailable`, and `activateUpdate()`.
- [x] `OfflineBannerComponent` ships in the lib barrel: status strip
      that says "Offline. Data may be stale." when navigator.onLine
      flips false, "A new version is ready" with a Reload button when
      SwUpdate signals `VERSION_READY`. Tokens from `src/tokens.css`.
- [x] `@sentry/browser@9.0.0` installed and lazy-imported in `main.ts`
      when `window.__FB_SENTRY_DSN__` is set AND `isDevMode()` is
      false. The DSN-gate keeps the initial transfer at 45.43 KB gz
      for users without telemetry.

### Phase 7: Theming + a11y burndown (weeks 19 to 21, ux-lead + qa-lead)

Status (2026-05-26): Lighthouse gating active; axe-core baseline
harness shipped with the 4 hard-fail rules wired. The design-token
pass stays open for the UX sprint.

- [ ] Final pass on all 12 surfaces against design tokens (deferred:
      ux-lead)
- [x] Axe-core baseline harness shipped: `e2e/a11y.spec.ts` runs
      `@axe-core/playwright` against the bootstrapped app shell,
      compares the violation count to `.axe-baseline.json`
      (monotonic-decrease ratchet), and asserts that the 4 hard-fail
      rule IDs stay at zero. Seed mode: `AXE_BASELINE_SEED=1
E2E_LOCAL=1 pnpm test:e2e --grep a11y`.
- [x] 4 hard-fail rules wired in `e2e/a11y.spec.ts` `HARD_FAIL_RULES`:
      `target-size`, `keyboard`, `prefers-reduced-motion`,
      `meta-viewport`.
- [x] Lighthouse upgraded from info-only to gating: `lighthouserc.json`
      asserts categories:accessibility >= 0.85 (error), CLS <= 0.1
      (error), perf and best-practices >= 0.8/0.85 (warn). The CI job
      drops `continue-on-error` so a regression fails the build.

### Phase 8: Cleanup + perf validation (week 22)

Status (2026-05-26): every measurable Phase 0 floor budget met; the
roadmap-destination budgets are already exceeded by a wide margin so
the tighter floor stays the active gate. The Playwright AIS-burst
fixture stays open for the qa-lead sprint.

- [~] `ais-burst.skstream` fixture gate: 200 AIS targets at 10 Hz for 60
  s, p95 frame time <= 16 ms. Harness shipped (`e2e/ais-burst.spec.ts`,
  `perf` Playwright project, `e2e-perf` workflow_dispatch CI job).
  Still deferred: the signalk-server-side fixture plugin that serves
  `/signalk/v1/test-fixtures/ais-burst/{start,stop}` synthetic deltas.
- [x] size-limit budgets: 45.43 KB gz initial transfer (Phase 0 floor
      52 KB, roadmap destination 350 KB); 26.36 KB gz main (floor 32 KB,
      destination 250 KB); 19.07 KB gz styles (floor 21 KB); 1.02 MB gz
      vendor + lazy chunks (floor 1.1 MB); 148 KB gz workers (floor
      207 KB). The Phase 0 floor is the active gate because it is
      tighter than the destination spec.
- [x] Dependency-cruiser stays green: 269 modules, 617 dependencies,
      zero violations.
- [x] ESLint baseline: any 106 (from 157, -51); rxjs-x 26 (unchanged).
      Per-file regressions block via `scripts/verify-baseline.mjs`.

---

## 4. Per-lens summary

### Framework (Angular + reactivity)

- Stay on Angular 21.2.14
- Zoneless via `provideExperimentalZonelessChangeDetection()`
- Signals everywhere user-facing, RxJS confined to WS/HTTP/DOM boundaries via `SignalKStore` with `bufferTime(16)`
- `EventEmitter` banned, `output<T>()` everywhere
- Angular Router added with hash routing (4 routes), sidenav retained
- Material drops in 3 tiers, replaced by CDK + Tailwind v4 + custom 15-primitive library
- pnpm 11.2.2, TS strict per-folder ratchet
- God-component decomp: app.component 2002 LOC → AppShell + DialogOrchestrator + AudioAlarmService + MenuController

### Map / geo (OpenLayers)

- Stay on OpenLayers 10.9.0
- Drop `geolib` (use `ol/sphere`), drop `simplify-ts` (vendor-inline ESM)
- pmtiles 2 → 4, ol-mapbox-style 12 → 13, both lazy-loaded
- Per-tile OffscreenCanvas night-mode (kills CSS-filter hack); WebGL shader pass later
- AIS → OL WebGLPoints above ~50 target threshold
- `IMapAdapter` interface + `LayerComponentBase` for signal-input parity
- S57 lazy-loaded (~50 kB)
- `MapThemeService` consumes UX tokens for canvas styling
- 3 test helpers on `window.fb` bridge

### Data (SignalK)

- Schema-codegen `tools/sk-codegen.mjs` from `@signalk/signalk-schema@1.8.2`
- Branded `Path`/`Context`/`SourceRef` from `@signalk/server-api@2.24.0`
- `SignalKStore`: path-keyed `Map<Path, WritableSignal<PathState<T>>>`
- `PathState<T>`: `value`, `lastUpdate`, `age`, `state`, `sourceRef`
- `bufferTime(16)` rAF-aligned batched WS writes
- Vendor-inline `signalk-client-angular` and `simplify-ts`
- Worker slimmed to ~200 LOC (SimplifyAP + AIS expiry only)
- 5 focused stores replace AppFacade: vessel, resource, course, settings, alarms
- CPA/TCPA math lives in `lib/cpa.ts`, lazy + scoped (not in store)
- Anti-fan-out rule: AIS map signal writes only on add/remove; per-target signals carry frequent updates
- `feature.streamV2` flag gates rollout; `ais-burst.skstream` fixture as default-on gate

### Build / tooling

- Node 22 + 24 LTS matrix, default 24 in `.nvmrc`
- pnpm 11.2.2 via Corepack
- `@angular/build@21.2.12` esbuild builder retained
- Tailwind 4.3.0, glyphhanger 5 + subset-font 2.5 (Node-only)
- size-limit 12.1.0 with current-measured baseline, ratcheted
- `tools/sk-codegen.mjs` for schema codegen
- release-please v5 + conventional commits
- `@angular/service-worker@21.2.14` for PWA
- 8-phase build roadmap B0 to B8

### UX / marine

- Three themes: light, dark, night-red (true red palette, not CSS filter)
- 56 px primary touch target, 44 px secondary, codified as tokens
- Material Symbols variable font, subset to ~120 glyphs (~60 kB)
- Marine-safety tokens isolated (AIS, COG vector, depth) so theme changes can't accidentally change safety colors
- 15 hand-rolled CDK-based primitives, Tier-1 first
- Two-tier alarm UX (modal critical, toast → tray sub-critical)
- 7-phase UX work, ~13.5 weeks
- 12-surface redesign list, notes already in flight
- Gestures: pinch-rotate, pinch-zoom-anchor, heading-up auto-rotate, long-press radial menu (6 positions)
- Touch latency targets: 80 ms pointer feedback, 33 ms pan frame, 580 ms long-press, 150 ms tap-to-popover
- PWA with cacheFirst chart tiles, install prompt after ≥3 sessions

### Quality / DX

- Vitest 4 + ATL 19 + Playwright 1.60 + axe-core 4.11
- ESLint 10 flat with typescript-eslint, @angular-eslint 21, rxjs-x 1.0, import, unicorn, prettier
- 8-job CI: typecheck, lint, unit, build, size-limit, bundle-cruiser, e2e, lighthouse + any-baseline verifier
- TS strict via parallel `tsconfig.strict.json`, 7-phase ratchet
- `.skstream` NDJSON fixtures, 10-scenario corpus
- ~300 visual-regression baselines (200 showcase + 90 critical screens × 3 themes)
- 3 tolerance lanes (0.1% showcase, 1% chart, 5% S57)
- A11y hard-fail rules + grandfathered baseline
- Sentry SaaS observability, source maps in CI tag builds

---

## 5. Adjudicated open questions

1. **TypeScript 5.9.3 vs 6.0.3 today**: today's pin is **5.9.3** (Angular peer-dep gate). Bump to **6.0.3** in Phase 1 only when `@angular/build` peer-dep relaxes to `<6.1`. If not yet relaxed at Phase 1 start, hold and revisit at each subsequent phase. No code change blocks the bump; package.json swap when ready.

2. **Map major-version sequencing**: pmtiles 2→4 + ol-mapbox-style 12→13 both ride in Phase 4a as narrow PRs. pmtiles first (no dependents within the codebase). ol-mapbox-style second.

3. **Node CI matrix**: dual **22 + 24** until Node 22 EOL approaches (2027-04). CI cost is negligible, regression coverage for older boats is real.

4. **Bundle target reconciliation**: QA's 250 kB gz refers to main JS chunk; build's 300-350 kB gz refers to total initial transfer. Both reconciled: main JS ≤ 250 kB gz, OL chunk ≤ 250 kB gz when loaded, total initial transfer ≤ 350 kB gz.

5. **PWA service worker scope**: owned by **build-lead** for runtime wiring (Phase 6), **ux-lead** for offline banner + cache UX. UX's cacheFirst chart tiles (200 MB default, 2 GB max), networkFirst SignalK API with 3 s timeout, install prompt after ≥3 sessions is the locked spec.

6. **CI-first PR ownership**: single **qa-lead-owned** Phase 0 PR. Build-lead's B0 scope folds into it. No interleaving with framework-lead's standalone migration.

7. **size-limit budget shape**: current-measured baseline + 10% warn / 25% fail. Ratchet down by each major perf PR. No day-one destination budgets (would fail immediately).

---

## 6. Week 1 starting move

A single Phase 0 PR owned by qa-lead, scoped to tooling-only (no app code changes):

```
.nvmrc                            Node 24
package.json                      packageManager: pnpm@11.2.2
pnpm-lock.yaml                    new
eslint.config.mjs                 ESLint 10 flat
tsconfig.strict.json              parallel, scope src/app/lib/
.eslint-any-baseline.json         monotonic-decrease verifier seed
.eslint-rxjs-baseline.json        monotonic-decrease verifier seed
vitest.config.ts                  via @angular/build:unit-test
playwright.config.ts              container image pin
.size-limit.json                  current-measured baseline
.dependency-cruiser.cjs           one rule: no god-components
.github/workflows/ci.yml          8-job: typecheck, lint, unit, build, size-limit, cruiser, e2e (skeleton), lighthouse (info)
.husky/...  OR .simple-git-hooks  pre-commit lint-staged, pre-push tsc + vitest
.commitlintrc.json                conventional-commits
```

Every later PR runs through this gate. The roadmap can then ship Phases 1 through 8 in parallel tracks against a known-green floor.

---

## Cross-references

- Existing perf branches: see `git log` on local master, ~27 commits ahead of `upstream/master`. None block this roadmap; all stay as fork history.
- Memory: `~/.claude/projects/-home-dietpi-src-freeboard-sk/memory/` carries the prior modernization audit (`perf-modernization-top3.md`), PR norms (`freeboard-sk-pr-norms.md`), branching strategy, and notes redesign plan.
- This document is the authoritative modernization plan as of 2026-05-24. Future deviations should update it in place.
