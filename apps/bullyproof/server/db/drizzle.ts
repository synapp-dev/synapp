import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode. connect_timeout fails fast if DB is unreachable.
function createClient() {
  return postgres(connectionString, {
    prepare: false,
    connect_timeout: 10,
    max: 10,             // Allow up to 10 connections (Supavisor multiplexes these)
    idle_timeout: 20,    // Close idle connections after 20 seconds
    max_lifetime: 300,   // Recycle connections every 5 minutes
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
