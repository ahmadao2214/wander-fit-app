module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    // Map convex/_generated paths to the actual files
    '^convex/_generated/(.*)$': '<rootDir>/convex/_generated/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|tamagui|@tamagui/.*)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    // Ignore vitest tests when running with jest
    '.*\\.vitest\\.test\\.(ts|tsx)$',
  ],
}
