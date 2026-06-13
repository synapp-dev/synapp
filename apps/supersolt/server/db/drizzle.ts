import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/drizzle/schema";
import * as relations from "@/drizzle/relations";

export const schemaWithRelations = { ...schema, ...relations };

const globalForPostgres = globalThis as unknown as {
  postgresRlsClient?: ReturnType<typeof postgres>;
  postgresAdminClient?: ReturnType<typeof postgres>;
};

function createPostgresClient(connectionString: string) {
  return postgres(connectionString, { prepare: false });
}

function getRlsConnectionString(): string {
  const url =
    process.env.DATABASE_URL ?? process.env.DATABASE_URL_POOLER ?? "";
  if (!url) {
    throw new Error(
      "DATABASE_URL (or DATABASE_URL_POOLER) is required for Drizzle.",
    );
  }
  return url;
}

function getAdminConnectionString(): string {
  return (
    process.env.DATABASE_URL_ADMIN ??
    process.env.DATABASE_URL ??
    process.env.DATABASE_URL_POOLER ??
    ""
  );
}

export const rlsClient =
  globalForPostgres.postgresRlsClient ??
  createPostgresClient(getRlsConnectionString());

export const adminClient =
  globalForPostgres.postgresAdminClient ??
  createPostgresClient(getAdminConnectionString());

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.postgresRlsClient = rlsClient;
  globalForPostgres.postgresAdminClient = adminClient;
}

export const rlsDb = drizzle(rlsClient, { schema: schemaWithRelations });
export const adminDb = drizzle(adminClient, { schema: schemaWithRelations });

/** @deprecated Use `rlsDb` / `adminDb` via `createAppDb`. */
export const db = rlsDb;
export const client = rlsClient;

export type RlsDb = typeof rlsDb;
export type AdminDb = typeof adminDb;
export type RlsTx = Parameters<Parameters<RlsDb["transaction"]>[0]>[0];
