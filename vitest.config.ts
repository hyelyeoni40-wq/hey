import path from "node:path";
import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // The "server-only" marker package throws unconditionally on plain
      // Node `require`; Next's bundler swaps it for a no-op via the
      // "react-server" export condition, which Vitest doesn't apply here.
      "server-only": path.resolve(__dirname, "src/tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/tests/**/*.test.ts"],
    // The local `npx prisma dev` bundled Postgres proxy doesn't reliably
    // isolate prepared statements across concurrent connections from
    // multiple test files' Prisma Client instances. Running test files
    // sequentially avoids spurious "prepared statement" driver errors.
    // Real PostgreSQL (CI/production) doesn't need this.
    fileParallelism: false,
  },
});
