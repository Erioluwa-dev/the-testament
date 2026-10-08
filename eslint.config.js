import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.omo/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Plan §2: strict TypeScript — "no any" is a hard project rule, so the
      // linter enforces what the compiler alone would allow.
      '@typescript-eslint/no-explicit-any': 'error',
      // Same reason: `!` hides exactly the undefined cases noUncheckedIndexedAccess
      // exists to surface.
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Type-only imports keep Phaser (a browser-only bundle) out of Node
      // module graphs: unit tests import pure systems that only *mention*
      // Phaser in signatures.
      '@typescript-eslint/consistent-type-imports': 'error',
      // Plan §7: no silent catch — an empty catch must at least document why
      // the error was swallowed.
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
  {
    // Scripts run under bun with console as their output channel.
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
