module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:import/recommended', 'plugin:import/typescript', 'prettier'],
  settings: {
    'import/resolver': {
      typescript: {}
    }
  },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-misused-promises': 'error',
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
        alphabetize: { order: 'asc', caseInsensitive: true }
      }
    ]
  }
};
