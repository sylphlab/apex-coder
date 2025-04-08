import js from '@eslint/js';
import * as tseslint from 'typescript-eslint';

export default [
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      'esbuild.js',
      '.vscode-test.mjs'
    ]
  },

  // Base recommended configs
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Project-specific rules
  {
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      'no-prototype-builtins': 'off'
    }
  },
  // Test-specific overrides
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
];
