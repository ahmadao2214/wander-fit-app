// One Jest run, two projects:
// - node: Convex functions, lib/ utilities, hook logic, the scripts/ tools and
//   the babel/ plugins. No React Native runtime.
// - react-native: components and screens, on the jest-expo preset (RN renderer,
//   native module mocks, Babel via babel-preset-expo).

// Agent/editor worktrees live under .claude/worktrees and contain a full copy
// of the repo (including package.json); without this Jest runs every test twice
// and reports haste module collisions.
const modulePathIgnorePatterns = ['<rootDir>/.claude/']

const moduleNameMapper = {
  // Map convex/_generated paths to the actual files
  '^convex/_generated/(.*)$': '<rootDir>/convex/_generated/$1',
  // babel/lucide-direct-imports.js imports each icon's own file, which the package's "exports"
  // doesn't list; point Jest at the file directly.
  '^@tamagui/lucide-icons/dist/esm/icons/(.*)$': '<rootDir>/node_modules/@tamagui/lucide-icons/dist/esm/icons/$1',
}

module.exports = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/convex/__tests__/**/*.test.ts',
        '<rootDir>/lib/__tests__/**/*.test.ts',
        '<rootDir>/hooks/__tests__/**/*.test.ts',
        '<rootDir>/scripts/**/*.test.mjs',
        '<rootDir>/babel/__tests__/**/*.test.mjs',
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'cjs', 'json'],
      // Its own Babel setup, not babel.config.js: babel-preset-expo rewrites
      // process.env for the app bundle, which breaks the Node scripts. Node 22
      // runs modern syntax as is, so this only strips types and turns ESM
      // (including import() and import.meta) into CommonJS.
      transform: {
        '\\.(m?js|tsx?)$': [
          'babel-jest',
          {
            configFile: false,
            babelrc: false,
            presets: ['@babel/preset-typescript'],
            plugins: [
              require.resolve('./jest/importMetaPlugin'),
              '@babel/plugin-transform-dynamic-import',
              '@babel/plugin-transform-modules-commonjs',
            ],
          },
        ],
      },
      // convex-test ships ESM only.
      transformIgnorePatterns: ['/node_modules/(?!convex-test/)'],
      moduleNameMapper,
      modulePathIgnorePatterns,
    },
    {
      displayName: 'react-native',
      preset: 'jest-expo',
      testMatch: [
        '<rootDir>/app/**/__tests__/**/*.test.{ts,tsx}',
        '<rootDir>/components/**/__tests__/**/*.test.{ts,tsx}',
      ],
      moduleNameMapper: {
        ...moduleNameMapper,
        '^react-native/react-private-interface$': '<rootDir>/node_modules/react-native/src/react-private-interface.js',
        '^react-native/setup-env$': '<rootDir>/node_modules/@react-native/jest-preset/jest/mocks/InitializeCore.js',
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|tamagui|@tamagui/.*)',
      ],
      testPathIgnorePatterns: ['/node_modules/'],
      modulePathIgnorePatterns,
    },
  ],
}
