module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
  ],
  rules: {
    // TypeScript rules - relaxed for MVP
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-var-requires': 'warn', // Allow require() for now
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    
    // React rules
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react/display-name': 'off',
    
    // General rules - relaxed for development
    'no-console': 'warn', // Allow console logs in development
    'no-debugger': 'warn', // Warn but don't error on debugger
    'prefer-const': 'warn',
    'no-var': 'warn',
    
    // Best practices - relaxed
    'eqeqeq': ['warn', 'always'],
    'curly': ['warn', 'all'],
    'no-eval': 'error', // Keep this as error
    'no-implied-eval': 'error', // Keep this as error
    'prefer-promise-reject-errors': 'warn',
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    '*.config.js',
  ],
}; 