import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

type Db = ReturnType<typeof drizzle>;

let _db: Db | null = null;

/** Connect on first query, not at import, so builds work without DATABASE_URL. */
function connect(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(postgres(connectionString, { prepare: false }));
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    _db ??= connect();
    const value = Reflect.get(_db, prop);
    return typeof value === "function" ? value.bind(_db) : value;
  },
});
