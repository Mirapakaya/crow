import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import next from 'eslint-config-next'

export default tseslint.config(
  { ignores: ['dist', '.next', 'coverage', 'node_modules', 'public/sw.js', 'public/workbox-*.js', 'public/worker-*.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...next.configs['core-web-vitals'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Crow never talks to HTTP origins it does not control. Use the relay pool.' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Repo tooling runs in Node, not the browser.
    files: ['scripts/**/*.mjs', '*.config.{js,ts,mjs}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        crypto: 'readonly',
        WebSocket: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        performance: 'readonly',
      },
    },
    rules: { 'no-console': 'off', 'no-restricted-globals': 'off' },
  },
  {
    files: ['tests/**/*.ts', 'src/core/util/log.ts'],
    rules: { 'no-console': 'off', 'no-restricted-globals': 'off', '@typescript-eslint/no-explicit-any': 'off' },
  },
)
