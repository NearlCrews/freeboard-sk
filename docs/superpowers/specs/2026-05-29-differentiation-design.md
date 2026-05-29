# Open Binnacle differentiation design

Date: 2026-05-29
Owner: Nearl Crews
Status: Design draft, autopilot-completed brainstorming pass

## 1. What this document is

The Material removal and modernization track has been about NOT being upstream Freeboard-SK in code shape. This document is about NOT being upstream in identity. It picks a target user, a stance, and the concrete decisions about default map, UI shell, aesthetic, and feature set that follow.

The terminal state is a sentence a user can finish: "Open Binnacle is the chart plotter for \_**\_ that does \_\_**." Upstream Freeboard-SK cannot finish that sentence. After this work lands, Open Binnacle can.

## 2. Target user

**Primary: bluewater cruiser.** Long offshore passages, days from shore, redundancy-minded, dark-cabin night watches, lives by AIS + weather + the depth sounder. Doesn't trust a UI that hasn't earned trust. Cannot tolerate features that fail silently.

**Day-job adjacent: liveaboard.** Same person, at anchor or in the marina between passages. Uses the plotter as a boat dashboard: anchor watch, batteries, bilge, fridge, cameras. The plotter is always-on, not "boot when leaving the dock."

**Explicitly NOT primary:**

- **Racers.** They use Expedition or B&G H5000. Polars, laylines, start-line countdowns are a different product. Open Binnacle can render a polar overlay later, but tactical racing is not the design center.
- **Day sailors / weekenders.** They use Navionics on a phone. Light-touch UI is a different product. Open Binnacle will be too dense for them.
- **Power boaters.** They use Garmin or Raymarine. Different sensor mix, different ergonomics, different price point.

The decision to scope down is the decision. Upstream tries to serve all five and serves none of them sharply. Open Binnacle picks one and stays on it.

## 3. The sentence

> **Open Binnacle is the chart plotter for the offshore watch and the swinging anchor:** the place a bluewater cruiser checks during a 02:00 watch and the place a liveaboard checks before turning in. It works offline, preserves dark adaptation, surfaces danger before it asks for input, and treats the boat as a state to be inhabited rather than an app to be opened.

Everything below is downstream of that sentence.

## 4. Differentiation pillars

Four pillars. Every concrete decision later in the spec must justify itself against one of these. Anything that doesn't is YAGNI.

### Pillar 1: Trust through state-not-app posture

The plotter is a place the user inhabits, not an app they open. Boot is implicit (it's already running on the helm display, the nav-station tablet, the cabin tablet). Sessions cross devices: pick up the watch on the nav-station tablet at 02:00, hand off to the next watch on the helm display at 06:00.

### Pillar 2: Night-watch first, daylight second

Dark adaptation is a real, biological constraint that takes 20-30 minutes to acquire and is destroyed by a single bright pixel. The night-red theme already in the codebase exists for this. The pillar says: every screen, every dialog, every modal, every newly-introduced surface MUST be designed night-red-first, with daylight as the secondary mode. The current behavior (daylight-first, night-red as an override that some surfaces still leak white pixels through) gets inverted.

### Pillar 3: Offline-first, always

The boat may be 1,500 nm from a cell tower. Charts, weather, tides, almanac data, S57 ENCs, and the entire UI must work with zero network. The "first" in "offline-first" means default: the app behaves as if there is no network and treats internet as an opportunistic enhancement, never a prerequisite.

### Pillar 4: Active danger surfacing

The plotter must surface relevant danger BEFORE the user asks. The user does not "check AIS" — AIS targets in CPA / TCPA range raise themselves. The user does not "check depth" — shallowing depth raises itself. The user does not "check anchor" — the anchor alarm is always on when the rode is set. This is the difference between a navigation tool and a navigation companion.

## 5. Concrete decisions

### 5.1 Default chart sources

**Current behavior:** `openstreetmap` + `openseamap` (raster XYZ from osm.org / openseamap.org). Generic, requires internet, no offline cache, identical to upstream Freeboard-SK.

**New default:**

1. **OpenSeaMap MVT vector overlay (lazy-loaded)** on top of a token-aware nautical raster baseline that ships with the project as a pre-tiled bundle covering the user's "home cruising area" (user-configured during first-run).
2. **First-run wizard** asks the user one question: "what's your current cruising area?" with a world map and a draggable bounding box. The selected box gets pre-tiled (offline-first) at zoom 0-10 at install time, with the user's stored bounding box re-pre-tiled when they update the app or change the box.
3. **Online enhancement (opportunistic):** when network is available, render OpenSeaMap MVT on top with the depth contours and aids-to-navigation glyphs styled against the night-red and dark themes. Cache aggressively.
4. **S57 ENC support (already present)** gets first-class billing: the chart-source selector defaults to "ENCs" when ENCs are loaded, rather than the current "everything is a chart source, you pick" model.

Why this matters: upstream's openstreetmap default is the same default a tutorial would pick. Open Binnacle's default tells the user "this app expects to work offline." That's a one-glance signal of identity.

### 5.2 UI shell

**Current shell:** Three-pane (left info-panel, main map, right plugin instruments). Centered on the chart.

**New shell:** Three-mode shell. The chart is always present; the foreground surface rotates. Modes are first-class, not buried behind menus.

1. **Watch mode (default at night, or when the boat is moving):** chart is the surface, with a non-collapsible danger strip across the bottom showing AIS-CPA-alert, depth, wind, COG/SOG, heading deviation from course-line. The strip is sized to be readable from the cockpit.
2. **Anchor mode (default when SOG < 0.5 kt for > 5 min OR anchor watch is armed):** the chart zooms to anchor radius, the watch circle dominates the view, and the strip shows: anchor bearing/range, scope, wind, swing alarm state.
3. **Inhabit mode (default at the dock OR when explicitly selected):** the chart goes background, the foreground becomes the SK instrument dashboard (batteries, tanks, bilge, fridge, cameras, NMEA-2000 device health). This is the liveaboard mode.

Mode switching is automatic via SK state but always user-overridable with a one-tap mode pill in the top bar. No mode is "the right one" — they're contextual.

**Why three modes, not configurable everything:** upstream is configurable everything, which means every user sees a different layout and the second-station shows a different screen than the helm. Three named modes mean every Open Binnacle user, on any device, can describe what they're looking at: "I'm in watch mode, do you see the AIS target at 045?"

### 5.3 Identity and aesthetic

**Visual identity:**

- **Name origin:** A binnacle is the housing for a ship's compass and instruments. The name is deliberately archaic-marine. Lean into it. The app icon, splash, and About dialog should evoke a brass-and-glass binnacle, not a generic chart icon.
- **Typography:** Inter for UI text (already chosen in roadmap), JetBrains Mono for coordinates and instrument readouts (already chosen). Lat/lon, COG/SOG, depth, wind speed all render in JetBrains Mono so the eye locks on numbers under low light.
- **Color stance:** OKLCH tokens (already done). Night-red is not a "mode" — it's the canonical theme. Light and dark are the "during daytime, in a marina, with the cabin lit" themes.
- **Motion:** Reduced-motion is the default during watch mode. Animations are an indulgence the cabin allows, not a feature the chart needs.

**Tone of voice:**

- Confirmation dialogs that respect the user as a competent mariner: "Anchor down" not "Are you sure you want to set anchor?"
- Error messages that name the constraint, not the technical failure: "No GPS fix" not "navigation.position not received."
- Help text that assumes seamanship: "Set rode length" not "How much rope is your anchor on?"

### 5.4 Distinctive features

These are the features that, combined with pillars and aesthetic, finish the sentence in section 3. Ordered by what most clearly separates Open Binnacle from upstream Freeboard-SK and from commercial chart plotters.

#### 5.4.1 Multi-station watch handoff

A first-class concept (not a side effect of "stateless"). At the start of a watch:

- "Take the watch" button on any open Open Binnacle session marks that device as the active station for the watch.
- Other Open Binnacle sessions on the boat get a watch-passive indicator and a dimmed UI.
- The active station shows the danger strip + alarms; passive stations show "off-watch" with critical alarms still surfacing but quieter.
- At handoff, the outgoing watch logs a short note (weather, traffic, sail config), the incoming watch acknowledges it. Both are persisted to a watch log.

Why this matters: SK is multi-station by design; nobody has made the multi-station BEHAVIOR explicit. Watch handoff is the most concrete answer to "what does multi-station mean."

#### 5.4.2 Active danger surfacing (already pillar 4, mechanism)

- **AIS CPA/TCPA cascade:** any AIS target with CPA < 0.5 nm AND TCPA < 30 min becomes a banner over the chart, with auto-zoom on tap.
- **Depth alarm tiers:** shallow alarm (user-set), shoaling alarm (depth decreasing at > 0.5 m/min), aground alarm (depth < draft + safety).
- **Anchor drag detection:** position outside swing circle for > N seconds (already exists), plus rate-of-drift detection (position moving consistently in one direction = dragging, distinct from swinging).
- **Wind gust banner:** apparent wind > N kt above 5-minute trailing mean (user-set sail-configuration threshold).
- **Lee-shore alert:** course-over-ground projected forward > T minutes intersects a charted coastline.

These are all driven by SK signals that are already streaming. The work is the surfacing logic + UX.

#### 5.4.3 Offline-first chart bundles

- "Cruising area bundle" is a first-class resource. User can have multiple (Atlantic, Med, Caribbean). Each bundle is a pre-tiled XYZ pyramid covering the user's bounding box.
- Bundles include OpenSeaMap data baked in at install time, not fetched live.
- The first-run wizard creates the first bundle.
- A bundle update is a single download-and-restart operation; never partial.
- Bundle status (last-updated, size, coverage box) is surfaced in Settings.

#### 5.4.4 Weather and routing as a chart layer, not a modal

- Wind, current, pressure, and significant-wave-height GRIB layers as toggleable chart overlays, with a time scrubber for forecast time.
- Route-with-weather: when planning a route, the route gets ETAs at each waypoint computed against current GRIB. Weather windows appear as colored sections of the route.
- Source: opportunistic when online (PredictWind, Windy API, OpenWeatherMap); cached for offline replay.

#### 5.4.5 Anchor watch as a primary surface (not a dialog)

- Anchor mode (5.2) makes this the foreground.
- Rode length, scope, bottom type, charted depth at anchor position all persist with the anchor "set" action.
- Anchor log: every set/raise event is logged with position, time, weather, bottom, holding rating (user-recorded next morning). Builds a long-term anchorage database keyed to the boat.
- Drag predictions when forecast wind shifts > 30° from current.

#### 5.4.6 NMEA-2000 sensor health board

- The Inhabit mode dashboard is not a generic widget grid. It's a fixed set: batteries, tanks, bilge, fridge, AC, watermaker, refrigeration, engine. Each is a SK-path-bound tile.
- Each tile shows current value, trend (last 24 h sparkline), and an "is this healthy" indicator (red/amber/green) based on user-configured thresholds.
- Sensor health: a separate tile-grid section shows which NMEA-2000 devices are reporting, which have gone quiet, last-seen timestamps. Catches a failed sensor before the user notices.

## 6. Out of scope (explicitly)

- **Racing tactics:** polars, laylines, start-line countdowns, race-clock. Not for this user.
- **Touch-first phone UI:** the design target is helm display + nav-station tablet. Phones get the same UI, slightly scaled, but the design center is the 10-inch tablet at the chart table.
- **Social / sharing features:** no fleet tracking, no public position broadcasting, no "share your anchorage." This user values privacy at sea.
- **Integration with proprietary chart formats** (BSB, KAP, etc.) beyond what upstream already supports. Stay focused on S57 ENCs + OpenSeaMap + user-supplied raster tiles.
- **Vessel-class scaling beyond bluewater cruiser** (e.g., commercial fishing, passenger ferry). Different regulatory + ergonomic envelope.

## 7. Success criteria

- A new user (bluewater cruiser, never seen the app before) lands on the home screen and within 30 seconds can answer: "what app is this for?" They can finish the sentence in section 3 without help text.
- Default install works completely offline. Cellular off, wifi off, plotter still shows charts, weather (cached), AIS, depth, anchor watch.
- Night-watch usability passes a real-world test: open the app at 02:00 in a dark cabin with night-red active, the brightest pixel on screen does not break dark adaptation (measurable: peak pixel luminance under 0.5 cd/m² at min brightness).
- Multi-station watch handoff demonstrably works: open three devices, take the watch on one, alarm rings on the active device, off-watch indicator on the others, handoff round-trips with a log entry.
- At least three concrete features from 5.4 ship before this design is considered "delivered." Below three, it's a polish pass, not a differentiation.

## 8. Build order (rough)

Not a plan yet — that's writing-plans' job. Rough sequence:

1. First-run wizard + cruising-area bundle infrastructure (offline baseline)
2. Three-mode shell (watch / anchor / inhabit) wiring + automatic mode detection
3. Danger strip + AIS-CPA + lee-shore surfacing
4. Multi-station watch handoff
5. Anchor mode as a primary surface + anchor log
6. Inhabit mode dashboard (NMEA-2000 sensor tiles + health)
7. Weather and routing as a chart layer
8. Identity pass: icon, splash, About, tone-of-voice copy review

Roadmap-level estimate is 6-12 months of focused work for a single developer, longer with quality gates. Each numbered item gets its own design + plan via the same brainstorming → writing-plans cycle.

## 9. Relationship to MODERNIZATION_ROADMAP.md

This document is orthogonal to the modernization roadmap. The modernization roadmap is HOW the codebase is built (Angular 21, Tailwind, fb-\* primitives, CDK, tokens). This document is WHAT the product is. Both are needed. The modernization makes this design implementable; this design tells the modernization what to prioritize next.

Specifically:

- The fb-\* primitive library can now ship modes (5.2), surfaces (5.4.5), and dashboards (5.4.6) without leaning on Material.
- The OKLCH tokens (especially night-red) directly support pillar 2.
- The "stateless, multi-station" architecture is a precondition for 5.4.1.
- Phase 8 of the modernization roadmap (Lighthouse / a11y) gets a new constraint: night-mode peak luminance is now in scope.

## 10. Open questions left to the implementation plans

- Which weather/GRIB provider is the primary integration? (5.4.4)
- What is the watch log's storage backend: SK resources, IndexedDB, or both? (5.4.1)
- Does the cruising-area bundle pre-tiling happen client-side at install time, server-side via a tile builder, or out-of-band via a separate tool? (5.4.3)
- How does the user pick between cruising-area bundles when they change ocean basins? (5.4.3, 6)

Each of these is a separate brainstorming → plan cycle.
