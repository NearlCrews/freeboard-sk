// @ts-check
//
// ESLint 10 flat config for freeboard-sk Phase 0 floor.
//
// Design notes:
// - typescript-eslint recommendedTypeChecked is the strict spine. Rules the
//   repo can't yet satisfy are downgraded to 'warn', and the any-baseline
//   plus rxjs-x-baseline files (scripts/verify-baseline.mjs) enforce a
//   monotonic decrease so no regression slips through.
// - eslint-plugin-unicorn is curated, not the full preset. Marine domain
//   code has legitimate cases for short identifiers, switch fallthrough in
//   nav state machines, and similar patterns the full preset would flag.
// - Prettier runs separately (`pnpm format`, `pnpm format:check`).
//   eslint-config-prettier loads last to disable conflicting formatting
//   rules; eslint-plugin-prettier is intentionally not used.

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';
import rxjsX from 'eslint-plugin-rxjs-x';
import importPlugin from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

const TYPED_PROJECTS = [
  './tsconfig.app.json',
  './tsconfig.worker.json',
  './tsconfig.spec.json',
  './tsconfig-helper.json'
];

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'public/**',
      'coverage/**',
      '.angular/**',
      'font_resources/**',
      'out-tsc/**',
      'playwright-report/**',
      'playwright-results/**',
      'helper/openApi.json',
      'src/assets/**',
      '**/*.min.js'
    ]
  },

  // Source TypeScript: typed-lint, Angular component rules, RxJS, imports, unicorn.
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        project: TYPED_PROJECTS,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      '@angular-eslint': angular,
      'rxjs-x': rxjsX,
      import: importPlugin,
      unicorn
    },
    rules: {
      // Angular component / directive conventions.
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['fb', 'ap'], style: 'kebab-case' }
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: ['fb', 'ap'], style: 'camelCase' }
      ],
      '@angular-eslint/no-empty-lifecycle-method': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/no-output-on-prefix': 'error',

      // RxJS hygiene (rxjs-x is the maintained replacement for eslint-plugin-rxjs).
      // These are tracked by the rxjs-x baseline; raise to 'error' once baseline is zero.
      'rxjs-x/no-async-subscribe': 'warn',
      'rxjs-x/no-create': 'error',
      'rxjs-x/no-ignored-takewhile-value': 'warn',
      'rxjs-x/no-nested-subscribe': 'warn',
      'rxjs-x/no-unbound-methods': 'warn',
      'rxjs-x/no-unsafe-takeuntil': 'warn',
      'rxjs-x/no-implicit-any-catch': 'off', // typescript-eslint owns this

      // Import hygiene.
      'import/no-duplicates': 'error',
      'import/no-self-import': 'error',
      // `import/order` 2.32.0 crashes in `makeNewlinesBetweenReport` against
      // some TS files in this repo (legacy formatting around mixed type +
      // value imports). Phase 0 leaves it off; a later phase can re-enable
      // once formatting is normalised or after a plugin upgrade.
      'import/order': 'off',

      // Curated unicorn rules. The full preset is too opinionated for this codebase;
      // we adopt the high-signal subset and skip the abbreviation/file-naming churn.
      'unicorn/no-array-for-each': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/no-null': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/no-useless-undefined': 'warn',
      'unicorn/prefer-set-has': 'warn',
      'unicorn/prefer-string-starts-ends-with': 'warn',
      'unicorn/prefer-includes': 'warn',
      'unicorn/no-array-push-push': 'warn',
      'unicorn/prefer-array-some': 'warn',
      'unicorn/prefer-date-now': 'warn',
      'unicorn/throw-new-error': 'error',
      'unicorn/error-message': 'error',

      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { fixStyle: 'separate-type-imports' }
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      // Recommended-type-checked errors on these. Hundreds of legacy
      // violations exist today, so downgrade to 'warn' and let
      // scripts/verify-baseline.mjs (any-baseline, rxjs-x-baseline) enforce
      // a monotonic decrease.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      // Style rules from stylistic-type-checked. Keep as warn so the baseline
      // verifier surfaces them without breaking `pnpm lint`. Phase 1+ phases
      // clean these up file by file as code is touched.
      '@typescript-eslint/array-type': 'warn',
      '@typescript-eslint/consistent-indexed-object-style': 'warn',
      '@typescript-eslint/consistent-type-definitions': 'warn',
      '@typescript-eslint/dot-notation': 'warn',
      '@typescript-eslint/non-nullable-type-assertion-style': 'warn',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-function-type': 'warn',
      // Rules that REQUIRE strictNullChecks in tsconfig to function. The
      // strict ratchet (typecheck:strict) is the path to that flag; until
      // then these rules error out the parser. Re-enable once strict lands.
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-unnecessary-template-expression': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',

      // Plain ESLint hygiene the recommended preset doesn't cover at the level we want.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error'
    }
  },

  // Angular HTML templates. angular-eslint v21 exposes only eslintrc-shaped
  // configs (`configs.recommended` uses the legacy `parser`/`plugins` string
  // form), so we wire the template plugin manually for flat config.
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angularTemplateParser
    },
    plugins: {
      '@angular-eslint/template': angularTemplate
    },
    rules: {
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/eqeqeq': 'warn',
      '@angular-eslint/template/no-negated-async': 'warn'
    }
  },

  // Worker files: add WebWorker globals (`self`, `importScripts`, and so on)
  // on top of the browser plus node set already merged by the TS layer above.
  {
    files: ['src/**/*.worker.ts'],
    languageOptions: {
      globals: {
        ...globals.worker
      }
    }
  },

  // Test files: Vitest + Playwright. Relax the typed-lint rules that fight
  // legitimate test idioms (any-mocks, non-null assertions, etc.).
  {
    files: [
      '**/*.spec.ts',
      '**/*.test.ts',
      'tests/**/*.ts',
      'e2e/**/*.ts',
      'vitest.setup.ts'
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'unicorn/no-useless-undefined': 'off',
      'rxjs-x/no-nested-subscribe': 'off'
    }
  },

  // Config and script files are JS or not part of any tsconfig project.
  // Detach from the typed-lint project graph and turn off the type-aware
  // rule sets that would otherwise crash for lack of type services.
  // vitest.setup.ts is intentionally NOT matched here; it is covered by
  // tsconfig.spec.json and the test-files override above.
  {
    files: ['*.config.{ts,mjs,js}', 'scripts/**/*.{mjs,js}'],
    languageOptions: {
      globals: {
        ...globals.node
      },
      parserOptions: {
        project: null,
        projectService: false
      }
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      'rxjs-x/no-async-subscribe': 'off',
      'rxjs-x/no-create': 'off',
      'rxjs-x/no-ignored-takewhile-value': 'off',
      'rxjs-x/no-nested-subscribe': 'off',
      'rxjs-x/no-unbound-methods': 'off',
      'rxjs-x/no-unsafe-takeuntil': 'off',
      'no-console': 'off'
    }
  },

  // Prettier compatibility layer goes last to disable formatting rules that
  // would otherwise conflict with Prettier output.
  prettierConfig
);
