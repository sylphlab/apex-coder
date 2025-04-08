import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Vitest configuration options
    globals: true, // Use global APIs (describe, it, expect, etc.)
    environment: "node", // Specify the test environment (e.g., 'node', 'jsdom')
    include: ["src/test/**/*.test.ts"], // Pattern to find test files
    exclude: [
      "node_modules",
      "dist",
      ".idea",
      ".git",
      ".cache",
      "src/test/extension.test.ts", // Exclude VS Code specific tests
    ],
    // setupFiles: ['./src/test/setup.ts'], // Setup files before tests run
  },
});
