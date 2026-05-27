// Phase 8 AIS-burst perf fixture. Drives 200 AIS targets at 10 Hz for 60 s
// against a running signalk-server and asserts p95 frame time <= 16 ms.
//
// Opt-in: skipped unless BOTH E2E_LOCAL=1 AND AIS_BURST=1 are set, because
// it needs a signalk-server with a fixture-feed plugin (see e2e/README.md).
// The spec lives in the dedicated `perf` Playwright project so it never
// runs as part of `--project=chromium`. CI invokes it from the `e2e-perf`
// job (workflow_dispatch only).
//
// To run locally:
//   1. Start signalk-server with `@signalk/freeboard-sk` loaded plus a
//      fixture plugin that responds to the /signalk/v1/test-fixtures/ais-burst
//      endpoints with synthetic AIS deltas.
//   2. `E2E_LOCAL=1 AIS_BURST=1 pnpm test:e2e --project=perf`

import { expect, test } from '@playwright/test';

const RUN_LOCAL = process.env.E2E_LOCAL === '1';
const RUN_AIS_BURST = process.env.AIS_BURST === '1';

const BURST_COUNT = 200;
const BURST_HZ = 10;
const BURST_DURATION_SEC = 60;
const FRAME_BUDGET_MS = 16;

test.describe('AIS burst perf gate', () => {
  test.skip(
    !RUN_LOCAL || !RUN_AIS_BURST,
    'Requires E2E_LOCAL=1 AIS_BURST=1 and a SignalK server with a fixture-feed plugin.'
  );

  test('200 AIS targets at 10 Hz for 60 s holds p95 frame time <= 16 ms', async ({
    page,
    request
  }) => {
    test.setTimeout(120_000);

    await page.goto('/@signalk/freeboard-sk/');
    await expect(page.locator('app-root')).toBeVisible();
    await expect(page.locator('app-root canvas').first()).toBeVisible({
      timeout: 15_000
    });

    const frameTimes: number[] = [];

    // Bridge each rAF delta from the page into the test process. The page
    // posts every frame; the test collects them for offline p95 / p99.
    await page.exposeFunction('__recordFrame', (delta: number) => {
      frameTimes.push(delta);
    });

    await page.evaluate(() => {
      const w = window as unknown as {
        __recordFrame(d: number): void;
        __aisBurstStop?: boolean;
      };
      let last = performance.now();
      const tick = (now: number) => {
        const delta = now - last;
        last = now;
        w.__recordFrame(delta);
        if (!w.__aisBurstStop) {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });

    const startResponse = await request.post(
      '/signalk/v1/test-fixtures/ais-burst/start',
      {
        data: {
          count: BURST_COUNT,
          hz: BURST_HZ,
          durationSec: BURST_DURATION_SEC
        }
      }
    );
    expect(
      startResponse.ok(),
      `Fixture start endpoint must return 2xx. Got ${startResponse.status()}. Is the fixture plugin loaded?`
    ).toBe(true);

    await page.waitForTimeout(BURST_DURATION_SEC * 1000);

    await request.post('/signalk/v1/test-fixtures/ais-burst/stop');

    await page.evaluate(() => {
      (window as unknown as { __aisBurstStop: boolean }).__aisBurstStop = true;
    });

    expect(
      frameTimes.length,
      'rAF collector recorded no frames; check that the page stayed visible.'
    ).toBeGreaterThan(0);

    const sorted = [...frameTimes].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;
    const mean =
      sorted.reduce((sum, d) => sum + d, 0) / Math.max(sorted.length, 1);

    console.log(
      `AIS burst (${BURST_COUNT} vessels, ${BURST_HZ} Hz, ${BURST_DURATION_SEC}s): ` +
        `${sorted.length} frames, mean=${mean.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, p99=${p99.toFixed(2)}ms`
    );

    expect(
      p95,
      `p95 frame time ${p95.toFixed(2)}ms exceeds budget ${FRAME_BUDGET_MS}ms`
    ).toBeLessThanOrEqual(FRAME_BUDGET_MS);
  });
});
