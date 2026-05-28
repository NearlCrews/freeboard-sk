/**
 * Signal K plugin contract pin (Phase 3 simplify, Lens 3).
 *
 * Open Binnacle ships as a signalk-server plugin AND webapp. The signalk-server
 * plugin loader discovers it via npm by reading package.json. Three fields
 * are load-bearing: `main` (the plugin entry), `signalk-plugin-enabled-by-default`
 * (auto-enable on first install), and the `signalk` block (admin UI metadata).
 * The `signalk-webapp` and `signalk-node-server-plugin` keywords are how the
 * Appstore categorises the package. The `prepack` script must build the
 * helper + web bundle so `npm pack` produces a runnable artefact.
 *
 * This spec fails fast if any of those drift, so a refactor that removes
 * `main` or renames `prepack` does not silently break the production install
 * path under ~/.signalk/node_modules/signalk-open-binnacle.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface PluginPkg {
  name: string;
  version: string;
  main: string;
  keywords: string[];
  scripts: Record<string, string>;
  ['signalk-plugin-enabled-by-default']?: boolean;
  signalk?: { appIcon?: string; displayName?: string };
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as PluginPkg;

describe('signalk plugin contract (package.json)', () => {
  it('keeps the published name signalk-open-binnacle', () => {
    expect(pkg.name).toBe('signalk-open-binnacle');
  });

  it('points `main` at plugin/index.js (server entry)', () => {
    expect(pkg.main).toBe('plugin/index.js');
  });

  it('auto-enables on install (signalk-plugin-enabled-by-default)', () => {
    expect(pkg['signalk-plugin-enabled-by-default']).toBe(true);
  });

  it('declares signalk.appIcon and signalk.displayName for the admin UI', () => {
    expect(pkg.signalk?.appIcon).toMatch(/^\.\/assets\/icons\//);
    expect(pkg.signalk?.displayName).toBeTruthy();
  });

  it('keywords include signalk-webapp and signalk-node-server-plugin so the Appstore can find it', () => {
    expect(pkg.keywords).toContain('signalk-webapp');
    expect(pkg.keywords).toContain('signalk-node-server-plugin');
  });

  it('prepack runs build:all so npm pack produces a runnable artefact', () => {
    expect(pkg.scripts['prepack']).toContain('build:all');
  });

  it('declares a semver-shaped version (signalk-server admin UI surfaces it from package.json)', () => {
    // The plugin loader assigns plugin.version from package.json.version
    // (signalk-server src/interfaces/plugins.ts). A missing or malformed
    // version leaves the admin UI showing "undefined" next to the plugin
    // card, so pin the field shape here.
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(?:[-+].*)?$/);
  });
});
