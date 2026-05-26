# Freeboard-SK (modernization fork)

> **Fork notice.** This repository is a modernization fork maintained by Nearl Crews and is not aligned with [SignalK/freeboard-sk](https://github.com/SignalK/freeboard-sk) upstream. Use upstream for production deployments; use this fork to track the reshape work below or to cherry-pick narrow upstreamable changes.

## What is different from upstream

### Faster, smaller, lighter

- **Smaller initial load.** The entry chunk and styles gzip to 45 KB, down from roughly 200 KB on upstream. Cold boot on a Raspberry Pi over a slow tether is noticeably quicker.
- **Material Symbols variable font.** A 10 KB icon subset replaces the 2.18 MB legacy Material icon set. Icons render identically; the cold-start saves a multi-second download on marine networks.
- **Lazy chart engines.** S57 (~1.5 MB), pmtiles, and ol-mapbox-style load only when the matching chart type is opened. Users who never open a vector chart never download the S57 dispatch table.
- **Hardware-accelerated night mode.** Tile darkening runs through OffscreenCanvas per tile, replacing the legacy CSS `filter` on the whole map element. The previous approach forced a full repaint on every pan; the new path stays inside the tile pipeline.
- **OnPush change detection across 56 components.** The map, popovers, panels, and dialogs no longer re-render on every Angular tick. Side effect: panning and scrolling are noticeably smoother under heavy AIS load.
- **Zoneless Angular.** The app runs without zone.js. Reactivity flows through Angular signals end-to-end; RxJS retreats to the WebSocket and HTTP boundary only.

### Visual + UX

- **3 themes via design tokens.** Light, dark, and night-red, switchable via `data-theme` on `<html>`. Night-red is IEC 62288 / IMO MSC.302(87) compliant: alarm reds and warning yellows stay correct in night mode. 87 tokens cover color, spacing, typography, focus rings, and safety-state surfaces.
- **Notes palette refresh.** Switched from cream / copper + navy to white / black + rust. Sidebar contrast and low-contrast label issues fixed.
- **Tailwind v4 (CSS-first config).** Replaces the legacy Tailwind v2 + Material-only styling. Tier-1 (button, dialog, sheet) and tier-2 (list-pane, detail-pane, filter-bar) primitives backed by Angular CDK ship in `src/app/design-system/`.

### New features

- **PWA with offline support.** Real `@angular/service-worker` runtime. Chart tiles (pmtiles, mbtiles, XYZ raster) cached for 30 days up to ~2 GB; SignalK API calls fall back to cache after a 3-second network timeout. An offline banner appears when the browser goes offline; a "new version ready" banner with a Reload button appears when a new build deploys.
- **Sentry telemetry (opt-in).** When the host injects `window.__FB_SENTRY_DSN__` (a signalk-server plugin can do this), Sentry loads lazily after first paint and reports crashes plus 10% perf traces. Without a DSN, zero Sentry code ships.
- **Accessibility floor.** Lighthouse a11y minimum 0.85 is a CI hard-fail, plus 4 hard-fail axe-core rules: minimum touch-target size (56 px primary, 44 px secondary), no keyboard traps, reduced-motion respected, and viewport meta correctness. Visual layout shift capped at 0.1.

### Bugs fixed that were present upstream

- **OpenSeaMap chart-edit URL was malformed.** Re-opening the "Open Sea Map" or "Open Street Map" chart-properties dialog wrote a broken template literal (`https://tiles.openseamap.org/seamark}/{z}/{x}/{y}.png'`) back to the chart record. URLs are now correct.
- **AIS COG lines rendered at all zooms.** `okToRenderCogLines` was being checked as a property reference (always truthy) instead of called as a method. The zoom-threshold gate is now active.
- **Waypoint and region add-from-server bypassed the selection filter.** `selectionIsFiltered` (a method) was used as a truthy check, so every server-side add was treated as filtered. The filter gate now applies.
- **Notes without position would have rendered at lat 0, lon 0.** A regression introduced during the strict-mode pass was caught and fixed: `SKNote.position` is optional and the truthy guards consumers rely on narrow correctly.
- **Related-notes alert rendered the source of the `groupBy` rxjs operator.** A template literal interpolated `${groupBy}` instead of `${relatedBy}`. Now reads "Unable to retrieve Notes for specified `<group>`!".
- **`MulitPoint` typo in the resource-set layer style dispatcher** caused MultiPoint geometries to fall through to the Polygon-style branch. Fixed.
- **Anchor-watch and anchor.service** now handle the case where `Convert.transform` returns null. Legacy code assumed it always returned a number, which produced silent NaN propagation into the rode-length input.
- **Several `e.dataTransfer` / `e.originalEvent` null-reads** in the map drop, right-click, and modify handlers now properly guard; pre-existing crashes on certain browser drag flows are gone.

### Under the hood (so you can audit the change)

- **TypeScript strict mode at root.** All 7 strict flags on (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, noPropertyAccessFromIndexSignature, noImplicitReturns, noFallthroughCasesInSwitch). Every `.ts` file plus every Angular template type-check block passes. This is what caught most of the bugs above.
- **172 unit tests, 19 spec files** (Vitest 4 + Angular TestBed in jsdom). Upstream has none.
- **CI floor.** Eight-job pipeline: typecheck, lint with a per-file baseline ratchet, unit tests, build, bundle-size budgets, e2e smoke + a11y, Lighthouse gating, dependency-cruiser. Every job must pass before merge.
- **Stack pinned to current.** Angular 21.2.14, OpenLayers 10.9.0, pmtiles 4.4.1, ol-mapbox-style 13.4.1, TypeScript 5.9.3, pnpm 11.2.2 via Corepack, Node 24 LTS. The SignalK API client is unchanged so this fork still loads the same delta stream and resource endpoints as upstream.

See [`MODERNIZATION_ROADMAP.md`](MODERNIZATION_ROADMAP.md) for the 9-phase plan, version truth-table, and what is still open (signal-forms migration, settings / weather UX rebuild, Notes 3-pane redesign, 200-target WebGL AIS swap).

---

## Upstream description

Freeboard-SK is a stateless, multi-station, Openlayers based chart plotter for Signal K.
Use it to display:

- Resources _(i.e. routes, waypoints, notes, charts, etc)_
- Alarms & notifications
- AIS information
- Weather information
- Signal K instrument WebApps.

and more from any web enabled device.

![screen](https://github.com/user-attachments/assets/9b557a33-8a02-4a16-9f37-fd0cc82ab0f1)

See the [FAQs](https://github.com/SignalK/freeboard-sk/wiki) for more information.

## Features:

### Vessel / Chart Display:

Moving map display with:

- Multiple chart overlay using both of online and locally served charts
- Built in support (no plugin required) for OpenStreetMap and OpenSeaMap(from Signal K server)
- North-up / Vessel-up orientation
- Moving Map / Moving Vessel
- Vessel Heading / Bearing lines
- Wind True / Apparent display
- Closest point of approach

and more.

Charts are sourced from the `/resources/charts` path on the Signal K server and the following chart types / sources are supported:

- Image tiles _(XYZ)_
- Vector Tiles _(MVT / PBF)_
- [S57 ENC's converted to vector tiles](#S57-charts) _(MVT / PBF)_
- WMS _(Web Map Server)_
- WMTS _(Web Map Tile Server)_
- PMTiles _(ProtoMap files)_

---

### Resources:

Freeboard-SK supports the creation, editing and deletion of all resource types defined in the Signal K specification that are available under the `/resources` path.

**Routes and Waypoints:**

_Path(s): `/resources/routes`, `/resources/waypoints`_

- Show / Hide Routes & Waypoints
- Set a Waypoint as a destination
- Set an active Route
- Select destination point along an Active Route
- Create / Edit / Delete Routes
- Create / Edit / Delete Waypoints
- Create Waypoint at current vessel position
- Import Routes and Waypoints from GPX files
- Attach Notes to Routes & Waypoints

**Notes and Regions:**

_Path(s): `/resources/notes`, `/resources/regions`_

- Display Notes and Regions
- View / Edit Note properties
- Draw Regions and attach Notes
- Add / Edit / Delete Notes
- Attach Notes to Regions

**Tracks:**

Whilst not specifically defined in the Signal K specification, Freeboard-SK supports the import and display of tracks from GPX files which are available under the `/resources/tracks` path.

- Show / Hide Tracks
- Delete Tracks

---

### Autopilot Console:

Freeboard-SK supports the Signal K Autopilot API which enables common operations to be performed
including:

- Engage / Disengage the autopilot
- Setting the operation mode e.g. compass, route, gps, etc.
- Setting and adjusting the target heading
- Dodging obstacles

![image](https://github.com/user-attachments/assets/e771fa83-92cd-4e65-ad78-a349646049c8)

---

### Alarms and Notifications:

Freeboard-SK can display alarms _(visual and audio)_ & messages contained in _Notification_ messages transmitted by the Signal K server.

Additionally you can set alarms, including _anchor watch_, as well as raise alarms such as _man overboard_, _sinking_, etc directly from the user interface.

Supported alarm types include:

- Depth
- Closest Approach
- Anchor drag / watch
- "Buddy" notifications
- All Signal K specification defined alarms.

Freeboard-SK also implements API endpoints to accept requests for raising and clearing Signal K specification defined alarms.

_See OpenAPI documentation in Signal K Server Admin UI for details._

---

### History Playback

Freeboard-SK supports the Signal K `playback` api and can replay recorded time-series data captured on a Signal K server equipped with the `signalk-to-infludb` plugin.

---

### Instruments:

Freeboard-SK allows you to use your favourite instrumentation apps installed on the Signal K server.

Select one or more installed applications listed in the `settings` screen and they will displayed in the instrument drawer.

When more than one app is selected you can cycle through them within the instrument drawer.

_Note: The `Signal K Instrument Panel` app will be displayed if no user selection has been made._

![instruments](https://user-images.githubusercontent.com/38519157/128668406-02cbb8d8-2353-4e93-ae5e-12e0c7d507fe.png)

---

### S57 Charts

Freeboard-SK is able to display S57 ENC charts that have been converted to vector tiles with [s57-tiler](https://github.com/wdantuma/s57-tiler). _(See the [README](https://github.com/wdantuma/s57-tiler) for instructions how to create the vector tiles from downloaded S57 ENC's.)_

See [Open CPN chart sources](https://opencpn.org/OpenCPN/info/chartsource.html) for a list of locations to source charts.

_Note: Only unencrypted ENC's are supported (no S63 support)._

**_Requires: @signalk/charts-plugin_**

![S57 chart](https://github.com/SignalK/freeboard-sk/assets/38519157/a93b3889-d1c8-4df7-9f6f-97a1666fbf77)

Rendering of the Shallow, safety and deep depths and can be configured in the settings dialog

![S57 Settings](https://github.com/SignalK/freeboard-sk/assets/38519157/0409492b-1ee7-4905-b5b0-e5fc8e68bc9a)

_Note: This functionality is not a replacement for official navigational charts_

---

### Experiments:

Features that are not ready for "prime time" are made available as experiments.

To make experimental features available from within the Freeboard-SK user interface, you need to ensure the **Experimental Features** option is checked in **Settings**.

_Note: Some experiments will require configuration of Freeboard-SK via the \_Plugin Config_ screen of the Signal K Server Admin UI.\_

---

## System Requirements:

**Freeboard-SK requires \_Signal K Server Version 2.0 or above**.

The following features require that the Signal K server have plugins / providers installed to service the following paths:

- `resources/charts` - Ability to view charts.

- `navigation/anchor`, `notifications/navigation/anchor` - Ability to set anchor alarm and display notifications.

- `notifications/environment/depth` - Display depth notifications.

- `signalk/v1/playback` (Playback API) - Replay of recorded vessel data.

- `vessels/self/track` - Display of vessel track stored on server.

- `vessels/self/navigation/course/calcValues` - Display of calculated course values such as DTG, XTE, etc.

### Recommended Plugins:

The following plugins are recommended for installation on the Signal K Server to enable full functionality:

- Charts: `@signalk/charts-plugin`, `signalk-chart-provider-simple`, `signalk-pmtiles-plugin`, etc.
- Anchor Watch: `signalk-anchoralarm-plugin`
- Weather Forcasts: `signalk-openweather-provider`

---

## Development:

Freeboard-SK is an Angular project.

It is recommended that the Angular CLI be installed globally `npm i -g @angular/cli@latest` prior to following the steps below.

1. Clone this repository.

2. Run `npm i` to install project dependencies.

3. Run `npm start` or `ng serve` to start a development web server and then navigate to `http://localhost:4200/` to load the application. The application will automatically reload once you save changes to any of the source files.

### Note:

The Freeboard-SK application will look to connect to a Signal K server at the _ip address:port_ contained in the url of your browser.

In development mode you are able to specify the Signal K server host address and port you wish to connect to by editing the `DEV_SERVER` object in the `src/app/app.facade.ts` file.

```
DEV_SERVER {
    host: '192.168.99.100',
    port; 3000,
    ssl: false
}
```

_Note: These settings apply in **Development Mode** only!_

_They will **NOT** apply when using **Production Mode**, the generated application will attempt to connect to a Signal K api / stream on the hosting server._

---

### Building a Release:

**Building the Application:**

To build all components of the application _(plugin and webapp)_ ready for release use the `npm run build:prod` command.

**Building components individually:**

- To build only the _webapp_ use the command `npm run build:web`.
- To build only the _helper plugin_ use the command `npm run build:helper`.

Built files _(for deployment)_ are placed in the following folders:

- `/public` _(Freeboard-SK web app)_
- `/plugin` _(Freeboard-SK plugin)_

**Building the NPM package:**

To build the NPM package use the `npm pack` command to:

1. Execute `npm run build:prod`
1. Create the NPM package (`.tgz`) file in the root folder of the project.

---

_**Freeboard-SK** is a port of http://www.42.co.nz/freeboard for use with Signal K communication protocols and server features._
