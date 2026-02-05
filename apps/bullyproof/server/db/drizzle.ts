import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode. connect_timeout fails fast if DB is unreachable.
export const client = postgres(connectionString, {
  prepare: false,
  connect_timeout: 10,
});
export const db = drizzle(client);
