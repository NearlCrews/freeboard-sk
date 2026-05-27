# freeboard-sk Playwright suite

All specs in this directory are **opt-in**. CI does not start a
signalk-server, so every spec gates on `E2E_LOCAL=1`. The AIS-burst
fixture gates additionally on `AIS_BURST=1` because it needs a
fixture-feed plugin on the server.

## Specs

| Spec                | Gate                      | Purpose                                                                        |
| ------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `smoke.spec.ts`     | `E2E_LOCAL=1`             | Confirms the shell bootstraps and the OpenLayers canvas mounts.                |
| `a11y.spec.ts`      | `E2E_LOCAL=1`             | axe-core scan against a monotonic-decrease baseline (`.axe-baseline.json`).    |
| `ais-burst.spec.ts` | `E2E_LOCAL=1 AIS_BURST=1` | Phase 8 perf gate: 200 AIS targets at 10 Hz for 60 s, p95 frame time <= 16 ms. |

## Running

Start signalk-server first (port 3000 by default) with
`@signalk/freeboard-sk` loaded. Then from the repo root:

```bash
# Shell smoke
E2E_LOCAL=1 pnpm test:e2e --project=chromium --grep smoke

# a11y baseline (read)
E2E_LOCAL=1 pnpm test:e2e --project=chromium --grep a11y

# a11y baseline (re-seed after intentional improvement)
AXE_BASELINE_SEED=1 E2E_LOCAL=1 pnpm test:e2e --project=chromium --grep a11y

# AIS burst perf gate (Phase 8). Runs in the dedicated `perf` project so
# it is excluded from chromium/firefox/webkit runs.
E2E_LOCAL=1 AIS_BURST=1 pnpm test:e2e --project=perf
```

`E2E_BASE_URL` overrides the default `http://localhost:3000` if the
server lives elsewhere.

## AIS-burst fixture: server-side requirement

`ais-burst.spec.ts` posts to two endpoints on the signalk-server:

- `POST /signalk/v1/test-fixtures/ais-burst/start` with JSON body
  `{ count, hz, durationSec }`. The plugin must begin emitting
  `count` synthetic vessel deltas at `hz` Hz for `durationSec`
  seconds, addressing each vessel by a stable
  `vessels.urn:mrn:imo:mmsi:<id>` context so the freeboard-sk
  `dfeat.ais` Map fills to `count` entries.
- `POST /signalk/v1/test-fixtures/ais-burst/stop` to halt the feed.

A reference plugin is not yet checked in. Recommended shape: a
small signalk-server plugin that owns a `setInterval` loop, emits
position + COG + SOG updates over the existing delta bus, and
exposes the two HTTP endpoints above. Keep it local-only; never
ship to production servers.

## Frame-time collection

The spec installs a `requestAnimationFrame` collector in the page,
bridges each frame delta out via `page.exposeFunction`, then sorts
and computes p95 and p99 in the test process. The console output
line is the long-running metric: track it across runs to spot
regressions.

```
AIS burst (200 vessels, 10 Hz, 60s): 3582 frames, mean=12.31ms, p95=15.40ms, p99=18.92ms
```

The hard assertion is `p95 <= 16 ms`. p99 is informational for now;
promote to a gate once the WebGLPoints swap lands and the floor
proves stable.
