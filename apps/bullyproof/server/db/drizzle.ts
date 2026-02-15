import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode.
// Using library defaults for connection timeouts (30s) to avoid prod connection timeouts.
function createClient() {
  return postgres(connectionString, {
    prepare: false,
  });
}

// In development, Next.js hot-reloads modules which would leak connections.
// Use globalThis to reuse the same client across reloads.
const globalForPostgres = globalThis as unknown as {
  postgresClient: ReturnType<typeof createClient> | undefined;
};

export const client = globalForPostgres.postgresClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.postgresClient = client;
}

export const db = drizzle(client);
