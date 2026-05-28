# OpenHelm

A modernized Signal K chart plotter, forked from
[SignalK/freeboard-sk](https://github.com/SignalK/freeboard-sk).

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> **Beta.** OpenHelm is an actively-evolving modernization fork. It is not
> aligned with upstream Freeboard-SK and is not certified for safety-of-
> life navigation. Always carry redundant means of navigation and treat
> all displays as advisory. The authors and contributors assume no
> liability for how this software is used; see the
> [warranty disclaimer](#license) for the full Apache 2.0 terms.

## What it does

OpenHelm is a stateless, multi-station, OpenLayers-based chart plotter for
[Signal K](https://signalk.org). It runs in any modern browser and shows
your vessel against:

- Image tile (XYZ), vector tile (MVT / PBF), WMS, WMTS, and PMTiles charts
- S57 ENCs converted to vector tiles
- Routes, waypoints, notes, regions, tracks, and resource groups
- AIS and other vessel targets, with closest point of approach
- Alarms, notifications, and weather forecasts
- Embedded Signal K instrument webapps

Charts are sourced from the `/resources/charts` Signal K path. The app
itself is stateless: open it on a phone, a tablet, and a chartplotter
panel at the same time and they all show the same vessel.

## What's different from upstream

### Smaller and faster

- **45 KB initial transfer** (down from roughly 200 KB upstream). Cold
  boot on a Raspberry Pi over a slow tether is noticeably quicker.
- **10 KB Material Symbols icon subset** replaces the 2.18 MB legacy
  Material icon font.
- **Lazy chart engines.** S57 (~1.5 MB), PMTiles, and ol-mapbox-style
  load only when the matching chart type is opened. Users who never
  open a vector chart never download the S57 dispatch table.
- **Hardware-accelerated night mode.** Tile darkening runs through
  OffscreenCanvas per tile instead of a CSS filter on the whole map.
  Pan and zoom no longer force full-canvas repaints.
- **Zoneless Angular.** The app runs without zone.js. Reactivity flows
  through Angular signals end to end; RxJS retreats to the WebSocket
  and HTTP boundary only.
- **OnPush across 56 components.** Maps, popovers, panels, and dialogs
  no longer re-render on every Angular tick. Pan and scroll stay
  smooth under heavy AIS load.
- **Hot-path GC pressure removed.** Per-frame `Style`, `Stroke`,
  `Fill`, and `Text` allocations across 12 OpenLayers layer components
  are hoisted to module constants or cached by resolved color. Fleets
  of 100+ AIS targets no longer churn the GC on every label refresh.

### Visual and UX

- **Three themes via design tokens.** Light, dark, and night-red,
  switchable via `data-theme` on `<html>`. Night-red is IEC 62288 /
  IMO MSC.302(87) compliant: alarm reds and warning yellows stay
  correct under night mode. 87 tokens cover color, spacing, typography,
  focus rings, and safety-state surfaces.
- **Hand-rolled primitive library.** Tier-1 (button, dialog, sheet,
  sidenav, FAB, menu, snackbar, icon), Tier-2 (input, select,
  form-field, search-input, list-pane, detail-pane), and Tier-3
  (card, divider, hint, toolbar, progress-bar, list, tabs, expansion-
  panel, stepper, datepicker, tree, switch-row) live in
  `src/app/design-system/primitives/`.
- **Resources 3-pane shell.** Routes, waypoints, and regions share a
  Bear / Notes style three-pane layout: left nav with live counts,
  filter bar, middle list, and right detail.
- **Accessibility floor.** Lighthouse a11y minimum 0.85 hard-fails CI,
  plus four axe-core hard-fail rules: minimum touch-target size
  (56 px primary, 44 px secondary), no keyboard traps, reduced-motion
  respected, and viewport meta correctness. Visual layout shift is
  capped at 0.1.

### New features

- **PWA with offline support.** Real `@angular/service-worker` runtime.
  Chart tiles (PMTiles, MBTiles, XYZ raster) cached for 30 days up to
  ~2 GB. Signal K API calls fall back to cache after a 3-second
  network timeout. An offline banner appears when the browser is
  offline; a "new version ready" banner appears when a new build
  deploys.
- **Sentry telemetry (opt-in).** When the host injects
  `window.__FB_SENTRY_DSN__`, Sentry loads lazily after first paint
  and reports crashes plus 10% perf traces. Without a DSN, zero
  Sentry code ships.

### Bug fixes carried over from upstream

- OpenSeaMap chart-edit URL was a malformed template literal; now
  writes correct URLs.
- AIS COG lines rendered at all zooms because `okToRenderCogLines`
  was being checked as a property reference instead of called as a
  method. The zoom-threshold gate is now active.
- Waypoint and region add-from-server bypassed the selection filter
  (`selectionIsFiltered` used as a truthy reference instead of a call).
- Notes without `position` would have rendered at lat 0, lon 0.
- Related-notes alert message interpolated the wrong variable.
- `MulitPoint` typo in the resource-set layer style dispatcher caused
  MultiPoint geometries to fall through to the Polygon branch.
- Anchor-watch and anchor.service now handle the case where
  `Convert.transform` returns null.
- Several `e.dataTransfer` / `e.originalEvent` null-reads in the map
  drop, right-click, and modify handlers now properly guard.
- Signal K subscription `minPeriod` was being clobbered by `period`
  in the vendored stream-API copy.
- `AlarmState` enum was missing the `nominal` state in two vendored
  copies; both copies now match the spec.
- Notification path detection used substring match (`includes`); now
  uses `startsWith` everywhere.

### Under the hood

- **TypeScript strict mode at root.** All seven strict flags on. Every
  `.ts` file and every Angular template type-check block passes.
- **400+ unit tests** (Vitest 4 + Angular TestBed in jsdom) plus
  Playwright a11y and AIS-burst e2e harnesses.
- **Eight-job CI pipeline:** typecheck, lint with a per-file baseline
  ratchet, unit tests, build, bundle-size budgets, e2e smoke and
  a11y, Lighthouse gating, and dependency-cruiser god-component gate.
- **Stack pinned to current.** Angular 21.2.14, OpenLayers 10.9.0,
  PMTiles 4.4.1, ol-mapbox-style 13.4.1, TypeScript 5.9.3, pnpm 11
  via Corepack, Node 24 LTS. The Signal K API client surface is
  unchanged, so OpenHelm consumes the same delta stream and resource
  endpoints as upstream.

See [`MODERNIZATION_ROADMAP.md`](MODERNIZATION_ROADMAP.md) for the
nine-phase plan, version truth-table, and the open items
(signal-forms migration across remaining ReactiveForms, datepicker
adoption in playback-dialog, form validation in waypoint-dialog,
`fb-icon` svgIcon support to cover the last 28 Material icon sites).

## Install

From source against a local Signal K server:

```bash
git clone https://github.com/NearlCrews/openhelm.git
cd openhelm
pnpm install
pnpm build
ln -s "$(pwd)" ~/.signalk/node_modules/openhelm
```

Update `~/.signalk/package.json` so the server loads it:

```json
{
  "dependencies": {
    "openhelm": "file:../path/to/openhelm"
  }
}
```

Then restart Signal K and open
`http://your-sk-server:3000/openhelm/` in a browser.

## Configuration

The plotter reads everything from Signal K. There is no separate
configuration file: open Settings inside the app to set units,
preferred colors, AIS filters, the COG vector length, the active
chart set, and so on. Settings persist to your Signal K user-config.

Themes are switched via the `data-theme` attribute on `<html>`:

| `data-theme` | Use                                                         |
| ------------ | ----------------------------------------------------------- |
| `light`      | Daytime helm                                                |
| `dark`       | Dusk, indoor, or overcast helm                              |
| `night-red`  | Full night helm. IEC 62288 / IMO MSC.302(87) compliant red. |

A theme toggle lives inside Settings; the value is also forwarded to
the `environment.mode` Signal K path so co-installed surfaces like
`@signalk/app-dock` can mirror it.

## Develop

```bash
pnpm install      # one-time, via Corepack
pnpm start        # dev server on :4200 with HMR
pnpm typecheck    # tsc -p tsconfig.app.json --noEmit
pnpm test         # Vitest 4 + Angular TestBed (jsdom)
pnpm lint         # ESLint 10 flat config
pnpm build        # production build to public/
pnpm test:e2e     # Playwright (needs PI_HOST or a local SK server)
```

The Pi-resident dev install symlinks `~/.signalk/node_modules/openhelm`
to the repo so `pnpm build` output is picked up on the next Signal K
restart. The roadmap document explains the autopilot teaming policy,
the per-gate verification chain, and the Pi memory budget (one heavy
verification process at a time on an 8 GB Pi 5).

## Credits

OpenHelm is a fork of [SignalK/freeboard-sk](https://github.com/SignalK/freeboard-sk).
The upstream project is the canonical Signal K chart plotter, authored
and maintained by **Adrian P (panaaj)** with contributions from Robert
Huitema and the Signal K community. OpenHelm carries that work
forward; every line that did not change since the fork remains theirs.
The upstream repo, project history, and issue tracker are the source
of truth for the canonical product.

We also stand on the shoulders of:

- [Signal K](https://signalk.org) for the protocol and server
- [OpenLayers](https://openlayers.org/) for the map engine
- [Angular](https://angular.dev/) for the application framework
- [Tailwind CSS](https://tailwindcss.com/) and
  [Angular CDK](https://material.angular.io/cdk/) for styling and
  primitives
- The [OpenBridge](https://www.openbridge.no/) marine-bridge UI
  guidelines and
  [IEC 62288 / IMO MSC.302(87)](https://www.iec.ch/) for the night-
  mode and safety-color contracts

Detailed third-party attribution lives in the dependency manifest
(`package.json`) and the licenses bundled by each dependency under
`node_modules/`.

## License

Apache-2.0. See [LICENSE](LICENSE) for the full text.

> Per Apache 2.0 Sections 7 and 8: the software is provided "AS IS",
> without warranty of any kind, and the authors are not liable for
> any claim, damages, or other liability arising from its use. This
> includes loss of property at sea, injury, and any other consequence
> of relying on the software for navigation. Treat all on-screen
> information as advisory and always carry independent means of
> position-fixing.

## Support

- **Bug reports and feature requests:** open an issue at
  [github.com/NearlCrews/openhelm](https://github.com/NearlCrews/openhelm/issues).
- **Upstream questions** about the canonical Signal K chart plotter
  belong in the
  [SignalK/freeboard-sk](https://github.com/SignalK/freeboard-sk/issues)
  tracker, not here.
- **Security issues:** please contact the maintainer privately rather
  than opening a public issue; a SECURITY policy will land alongside
  the first non-beta release.
