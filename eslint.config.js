import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // SvelteKit owns routing — resolve() is not applicable here
      'svelte/no-navigation-without-resolve': 'off',
      // Allow _-prefixed identifiers as intentionally unused (e.g. `as _, i` in each blocks)
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      // Allow empty catch blocks with a comment; flag truly empty ones as warnings
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Informational: SvelteSet is preferred for reactive sets but not required
      'svelte/prefer-svelte-reactivity': 'warn',
    },
  },
  {
    // Old standalone tracker files not part of the SvelteKit app
    ignores: ['build/', '.svelte-kit/', 'dist/', 'tracker-data.js', 'Combat Tracker.html', 'cdk/cdk.out/'],
  },
];
