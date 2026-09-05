// Flat ESLint config. The lint rules here ARE the team's code standard for automation:
// they exist to stop the three defects that generate most flaky-test debt —
// hard sleeps, unconditional skips, and floating promises on locator actions.
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['node_modules/', 'playwright-report/', 'blob-report/', 'test-results/'] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // Tooling files that sit outside tsconfig's include: still linted, just
        // without a typed project behind them.
        projectService: {
          allowDefaultProject: ['eslint.config.mjs', 'scripts/screenshot-report.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Node tooling scripts, not framework code. They legitimately use CommonJS,
    // so the TypeScript-flavoured import rule does not apply — everything else,
    // including the floating-promise rule, still does.
    files: ['scripts/**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    // `setup(...)` in tests/setup is a Playwright test block under an alias.
    settings: { playwright: { globalAliases: { test: ['setup'] } } },
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/no-conditional-in-test': 'warn',
      // Team convention, enforced rather than documented: an assertion helper on a
      // page object is named `expect*`. Listing them keeps this rule an error
      // instead of switched off — a test with genuinely no assertion is still
      // caught, while a test whose assertions live in the object layer is not
      // punished for good structure.
      'playwright/expect-expect': [
        'error',
        {
          assertFunctionNames: [
            'expect',
            'expectLoaded',
            'expectOpen',
            'expectClosed',
            'expectVisible',
            'expectEmpty',
            'expectContains',
            'expectPath',
            'expectLoggedInAs',
            'expectLoggedOut',
          ],
        },
      ],
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
      'playwright/require-top-level-describe': 'off',
    },
  },
  prettier,
);
