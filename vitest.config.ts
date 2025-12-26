import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test environment
    environment: "node",
    
    // Include test files
    include: [
      "convex/__tests__/**/*.test.ts",
      "lib/__tests__/**/*.test.ts",
    ],
    
    // Exclude patterns
    exclude: ["node_modules", "dist"],
    
    // Coverage settings (optional)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["convex/**/*.ts", "lib/**/*.ts"],
      exclude: ["convex/_generated/**", "convex/__tests__/**", "lib/__tests__/**"],
    },
    
    // Global test settings
    globals: true,
  },
});

