import { defineConfig } from "vitest/config";

export default defineConfig({
  // `@/*` path aliases from tsconfig.json, resolved natively by Vite.
  resolve: { tsconfigPaths: true },
  test: {
    // Default to node; the localStorage-backed stores opt into jsdom with a
    // `@vitest-environment jsdom` docblock at the top of their test file.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["__tests__/**/*.test.ts"],
  },
});
