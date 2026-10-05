import fs from "fs";
import path from "path";
import { defineConfig } from "vitest/config";

/**
 * Integration tests need a migrated, disposable Postgres server that is NOT the dev database.
 * Locally: `npx prisma dev --name ceylonittours-test --detach`, then set TEST_DATABASE_URL to its
 * TCP URL and run `DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy` once.
 * (prisma dev serves a single database per instance, so a separate instance is required.)
 */
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:51218/template1?sslmode=disable";

// Never run destructive tests against the development database
const devUrl = fs.existsSync(".env.local")
  ? fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
  : undefined;
const hostOf = (url?: string) => (url ? new URL(url).host : undefined);
if (devUrl && hostOf(devUrl) === hostOf(testDatabaseUrl)) {
  throw new Error("TEST_DATABASE_URL points at the same server as DATABASE_URL in .env.local — refusing to run tests");
}

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration suites share one database, so run files sequentially
    fileParallelism: false,
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_GUARD: "1",
      ADMIN_EMAILS: "Admin@Example.test, ops@example.test",
      RESEND_API_KEY: "",
      // Empty Sanity config: content falls back to local data (no network in tests)
      NEXT_PUBLIC_SANITY_PROJECT_ID: "",
      NEXT_PUBLIC_SANITY_DATASET: "",
    },
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30_000,
  },
});
