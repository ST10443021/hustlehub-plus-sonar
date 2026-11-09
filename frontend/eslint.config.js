// Static analysis for the React app: ESLint recommended rules, React and React Hooks rules, and
// eslint-plugin-security (ESLint, n.d.; eslint-community, n.d.). The React rules include
// react/no-danger, which blocks dangerouslySetInnerHTML, the usual route to cross-site scripting
// in React (React, n.d.; OWASP, 2021). The CI pipeline runs "npm run lint" and fails on any warning.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-danger': 'error',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['src/tests/**/*.{js,jsx}', 'src/setupTests.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.vitest, vi: 'readonly' } },
    rules: { 'security/detect-object-injection': 'off' },
  },
  {
    // Node-side config files (Vite config, header helper, Playwright config). These run in Node,
    // where "process" exists, so they get Node globals instead of browser globals.
    files: ['vite.config.js', 'securityHeaders.js', 'eslint.config.js', 'playwright.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
