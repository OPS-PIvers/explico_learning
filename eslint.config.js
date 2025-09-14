// eslint.config.js - ESLint v9 configuration format
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Logger: 'readonly',
        Utilities: 'readonly',
        HtmlService: 'readonly',
        SpreadsheetApp: 'readonly',
        DriveApp: 'readonly'
      }
    },
    rules: {
      // Basic rules
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '*.config.js',
      'webpack.config.js',
      'jest.config.js'
    ]
  }
];