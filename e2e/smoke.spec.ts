// Phase 0 floor: ONE smoke spec that proves the e2e harness is wired.
// It is intentionally skipped unless `E2E_LOCAL=1` is set, because CI does not
// run a signalk-server with this plugin loaded. Phase 1 adds fixture-driven
// behavior coverage (see MODERNIZATION_ROADMAP.md section 3, Phase 1).
//
// To run locally:
//   1. Start signalk-server with `@signalk/freeboard-sk` loaded (port 3000 by default).
//   2. `E2E_LOCAL=1 pnpm test:e2e --project=chromium`.

import { expect, test } from '@playwright/test';

const RUN_LOCAL = process.env.E2E_LOCAL === '1';

test.describe('freeboard-sk app shell', () => {
  test.skip(
    !RUN_LOCAL,
    'Phase 0 harness; requires a running signalk-server. Set E2E_LOCAL=1 to run.'
  );

  test('loads the shell and renders the map host', async ({ page }) => {
    await page.goto('/@signalk/freeboard-sk/');

    // Angular bootstraps into <app-root>; presence is the cheapest landmark.
    await expect(page.locator('app-root')).toBeVisible();

    // OpenLayers mounts a canvas inside the map container once the first tile
    // request resolves. 15s budget covers cold-start tile loads on slow boxes.
    await expect(page.locator('app-root canvas').first()).toBeVisible({
      timeout: 15_000
    });
  });
});
