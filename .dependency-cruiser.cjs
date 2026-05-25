/**
 * dependency-cruiser config, Phase 0 floor.
 *
 * Scope: this file is the home for architectural dependency rules. The
 * Phase 0 charter ships exactly one architectural gate: no god-components
 * (per-file LOC ceiling of 1500). Because dependency-cruiser 17.4.2 does
 * not expose per-module LOC as a matchable attribute, that rule lives in
 * tools/check-god-components.mjs and is chained via the `cruise` script.
 *
 * This file scaffolds the cruiser config so later phases (Phase 1+) can
 * land forbidden rules like no-circular, no-orphans, layered access, and
 * the storeless-component pattern as they come online.
 *
 * Roadmap: MODERNIZATION_ROADMAP.md sections 3, 4.
 */

module.exports = {
  forbidden: [
    // Phase 0 ships no forbidden dependency rules. The god-component LOC
    // gate runs in tools/check-god-components.mjs ahead of depcruise inside
    // the `cruise` script. Future rules land here.
  ],
  options: {
    doNotFollow: {
      path: ['node_modules', '\\.spec\\.ts$']
    },
    exclude: {
      path: [
        'node_modules',
        '\\.spec\\.ts$',
        '\\.test\\.ts$',
        '^public/',
        '^dist/',
        '^\\.angular/',
        '^helper/'
      ]
    },
    tsConfig: {
      fileName: 'tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['module', 'main', 'types', 'typings']
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)',
        theme: {
          graph: {
            splines: 'ortho'
          }
        }
      },
      archi: {
        collapsePattern:
          '^(?:packages|src|lib|app|test|spec)/[^/]+|node_modules/(?:@[^/]+/[^/]+|[^/]+)'
      }
    }
  }
};
