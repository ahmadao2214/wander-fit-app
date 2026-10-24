// Jest runs the React Native tests: components and screens that need the
// jest-expo preset (RN renderer, native module mocks, Babel via babel-preset-expo).
// Pure TypeScript tests (convex/, lib/, hooks/) run under Vitest instead; see
// vitest.config.ts. The two runners must not collect each other's files: Vitest
// files `import { describe } from 'vitest'`, which throws under Jest's CommonJS
// runtime ("Vitest cannot be imported in a CommonJS module using require()").
module.exports = {
  preset: 'jest-expo',
  testMatch: [
    '<rootDir>/app/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/components/**/__tests__/**/*.test.{ts,tsx}',
  ],
  moduleNameMapper: {
    // Map convex/_generated paths to the actual files
    '^convex/_generated/(.*)$': '<rootDir>/convex/_generated/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|tamagui|@tamagui/.*)',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  // Agent/editor worktrees live under .claude/worktrees and contain a full copy
  // of the repo (including package.json); without this Jest runs every test twice
  // and reports haste module collisions.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
}
