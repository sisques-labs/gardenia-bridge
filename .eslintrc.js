module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'boundaries'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/**'],
  settings: {
    // Resolve the @contexts/* TS path alias so boundaries can classify import targets.
    'import/resolver': {
      typescript: { project: 'tsconfig.json' },
    },
    // Bounded-context boundary enforcement — see the `architecture` skill.
    'boundaries/include': ['src/contexts/**/*.ts'],
    'boundaries/elements': [
      // The ONLY place allowed to import another bounded context's
      // domain/application — the anti-corruption seam.
      {
        type: 'context-adapter',
        mode: 'full',
        pattern: 'src/contexts/*/infrastructure/adapters/**',
        capture: ['context', 'path'],
      },
      // Everything else inside a bounded context.
      {
        type: 'context',
        mode: 'full',
        pattern: 'src/contexts/*/**',
        capture: ['context', 'path'],
      },
    ],
  },
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // A bounded context may only import its OWN context. Reaching another
    // context's domain/application is allowed exclusively from
    // infrastructure/adapters/ (the port implementation).
    'boundaries/element-types': [
      'error',
      {
        default: 'allow',
        rules: [
          {
            from: ['context'],
            disallow: [
              ['context', { context: '!${from.context}' }],
              ['context-adapter', { context: '!${from.context}' }],
            ],
            message:
              "Cross-context import is not allowed: '${from.context}' must reach '${target.context}' through a port (application/ports) + adapter (infrastructure/adapters).",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['src/**/*.spec.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '@nestjs/testing',
                message:
                  'Unit tests must use manual instantiation (jest.Mocked<T>). @nestjs/testing is allowed only in test/integration/ and test/**/*.e2e-spec.ts.',
              },
            ],
          },
        ],
      },
    },
  ],
};
