import { sql } from "drizzle-orm";

import { adminDb, rlsDb, type RlsTx } from "@/server/db/drizzle";
import type { SupabaseJwtClaims } from "@/server/db/jwt-claims";

export type { SupabaseJwtClaims } from "@/server/db/jwt-claims";

export type AppDb = {
  admin: typeof adminDb;
  rls: <T>(transaction: (tx: RlsTx) => T | Promise<T>) => Promise<T>;
};

async function applyRlsContext(
  tx: RlsTx,
  token: SupabaseJwtClaims,
): Promise<void> {
  const role = token.role ?? "authenticated";
  await tx.execute(
    sql`select set_config('request.jwt.claims', ${JSON.stringify(token)}, TRUE)`,
  );
  await tx.execute(
    sql`select set_config('request.jwt.claim.sub', ${token.sub ?? ""}, TRUE)`,
  );
  await tx.execute(sql`set local role ${sql.raw(role)}`);
}

function createRlsRunner(token: SupabaseJwtClaims): AppDb["rls"] {
  return (async (transaction, ...rest) => {
    return rlsDb.transaction(async (tx) => {
      await applyRlsContext(tx, token);
      return await transaction(tx);
      // LOCAL set_config + SET LOCAL role reset automatically at transaction end.
    }, ...rest);
  }) as AppDb["rls"];
}

export function createAppDb(token: SupabaseJwtClaims): AppDb {
  return {
    admin: adminDb,
    rls: createRlsRunner(token),
  };
}

/** Admin-only DB access for cron jobs and webhooks (no RLS user context). */
export function createServiceAppDb(): AppDb {
  return {
    admin: adminDb,
    rls: (async () => {
      throw new Error("RLS is not available on service AppDb");
    }) as AppDb["rls"],
  };
}

export { supabaseClaimsFromJwtPayload } from "@/server/db/jwt-claims";
