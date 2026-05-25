/**
 * dependency-cruiser config. Phase 0 ships no forbidden rules: the only
 * architectural gate is the god-component LOC ceiling, which depcruise
 * 17 cannot express, so it runs as tools/check-god-components.mjs in the
 * `cruise` script. This file is the home for Phase 1+ rules (no-circular,
 * no-orphans, layered access, storeless-component).
 *
 * See MODERNIZATION_ROADMAP.md sections 3 and 4.
 */

module.exports = {
  forbidden: [],
  options: {
    doNotFollow: {
      path: ['node_modules']
    },
    exclude: {
      path: [
        'node_modules',
        '\\.spec\\.ts$',
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
