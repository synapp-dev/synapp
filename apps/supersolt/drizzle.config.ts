import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_POOLER;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL (or DATABASE_URL_POOLER) is required for drizzle-kit.",
  );
}

export default defineConfig({
  out: "./drizzle",
  schema: "./server/db/schema.ts",
  schemaFilter: ["public", "auth"],
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
