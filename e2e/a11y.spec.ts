// Phase 7 a11y baseline. Runs axe-core against the shell once Angular
// bootstraps. The "baseline" mode counts violations and writes the count
// to `.axe-baseline.json`; CI fails when new violations exceed the
// baseline (monotonic-decrease ratchet matching the lint baseline).
//
// To run locally:
//   1. Start signalk-server with `signalk-open-binnacle` loaded.
//   2. `E2E_LOCAL=1 pnpm test:e2e --project=chromium -- --grep a11y`.
//
// To seed/refresh the baseline:
//   AXE_BASELINE_SEED=1 E2E_LOCAL=1 pnpm test:e2e --project=chromium -- --grep a11y

import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RUN_LOCAL = process.env.E2E_LOCAL === '1';
const SEED = process.env.AXE_BASELINE_SEED === '1';
const BASELINE_PATH = resolve(__dirname, '..', '.axe-baseline.json');

interface AxeBaseline {
  violations: number;
  hardFailRules: string[];
}

const HARD_FAIL_RULES = [
  // The 4 Phase 7 hard-fail rules per the roadmap. Even with a
  // grandfathered baseline of non-zero violations, these IDs must stay
  // at zero or the CI lighthouse + axe gate fails.
  'target-size',
  'keyboard',
  'prefers-reduced-motion',
  'meta-viewport'
];

function loadBaseline(): AxeBaseline {
  if (!existsSync(BASELINE_PATH)) {
    return { violations: 0, hardFailRules: HARD_FAIL_RULES };
  }
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as AxeBaseline;
}

function saveBaseline(baseline: AxeBaseline): void {
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
}

test.describe('Open Binnacle a11y baseline', () => {
  test.skip(
    !RUN_LOCAL,
    'Requires a running signalk-server. Set E2E_LOCAL=1 to run.'
  );

  test('axe-core scan does not regress the baseline', async ({ page }) => {
    await page.goto('/signalk-open-binnacle/');
    await expect(page.locator('app-root')).toBeVisible();
    await expect(page.locator('app-root canvas').first()).toBeVisible({
      timeout: 15_000
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const total = results.violations.length;
    const hardFails = results.violations.filter((v) =>
      HARD_FAIL_RULES.includes(v.id)
    );

    if (SEED) {
      saveBaseline({ violations: total, hardFailRules: HARD_FAIL_RULES });
      console.log(`axe baseline seeded with ${total} violations.`);
      return;
    }

    const baseline = loadBaseline();

    // Hard-fail rules block regardless of the grandfathered baseline.
    expect(
      hardFails,
      `Hard-fail a11y rules MUST be 0: ${hardFails.map((v) => v.id).join(', ')}`
    ).toHaveLength(0);

    // Total violations must not exceed the baseline (monotonic-decrease
    // ratchet). If you intentionally improved things, seed a new baseline.
    expect(
      total,
      `axe-core violations regressed from baseline ${baseline.violations} to ${total}`
    ).toBeLessThanOrEqual(baseline.violations);
  });
});
