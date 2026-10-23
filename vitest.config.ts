import { defineConfig } from "vitest/config";

// Vitest runs the pure TypeScript tests: Convex functions, lib/ utilities and
// hook logic. React Native component and screen tests run under Jest (jest-expo);
// see jest.config.js. Keep the two `include`/`testMatch` lists disjoint.
export default defineConfig({
  test: {
    // Test environment
    environment: "node",

    // Include test files
    include: [
      "convex/__tests__/**/*.test.ts",
      "lib/__tests__/**/*.test.ts",
      "hooks/__tests__/**/*.test.ts",
    ],

    // Allow importing from tamagui.config.ts
    alias: {
      "tamagui": "@tamagui/core",
    },

    // Exclude patterns (.claude/worktrees holds full copies of the repo)
    exclude: ["node_modules", "dist", ".claude"],

    // Coverage settings (optional)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["convex/**/*.ts", "lib/**/*.ts"],
      exclude: ["convex/_generated/**", "convex/__tests__/**", "lib/__tests__/**"],
    },

    // No globals: Vitest files import describe/it/expect/vi from 'vitest'
    // explicitly, so the only global test types in the project are Jest's.
    globals: false,
  },
});
