// Static analysis for the API: ESLint's recommended rules plus eslint-plugin-security, which flags
// risky patterns such as eval, unsafe regular expressions, child_process use, non-literal file
// paths and object-injection sinks (ESLint, n.d.; eslint-community, n.d.). The CI pipeline runs
// "npm run lint" and fails the build on any error.
const js = require('@eslint/js');
const security = require('eslint-plugin-security');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**', 'test-results/**', 'certs/**', 'logs/**'] },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node } },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_|^(req|res|next)$', caughtErrors: 'none' }],
      'no-console': 'off',
    },
  },
  {
    // Test code is never shipped or run in production. It builds file paths and indexes arrays
    // from fixed test data, so the injection-focused security rules would only produce noise here.
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: { 'security/detect-object-injection': 'off', 'security/detect-non-literal-fs-filename': 'off' },
  },
];
