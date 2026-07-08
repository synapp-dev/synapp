/**
 * Probe what the current Xero connection can actually read.
 * Reads the live token straight from the DB and hits Items + PurchaseOrders.
 *   pnpm tsx scripts/test-xero-access.ts
 */
import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function call(endpoint: string, token: string, tenant: string) {
  const res = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "xero-tenant-id": tenant,
    },
  });
  return { status: res.status, text: await res.text() };
}

async function main() {
  const rows = await sql<
    { token: string; tenant: string; expires: string }[]
  >`SELECT xero_access_token AS token, xero_tenant_id AS tenant, token_expires_at AS expires
    FROM venue_xero_connections ORDER BY updated_at DESC LIMIT 1`;
  const conn = rows[0];
  if (!conn) throw new Error("No Xero connection row");
  console.log(
    "Token expires:",
    conn.expires,
    "| valid now:",
    new Date(conn.expires) > new Date(),
  );

  // --- Items (Products & Services) — runs under accounting.settings ---
  const items = await call("Items?pageSize=10", conn.token, conn.tenant);
  console.log("\n=== GET /Items ->", items.status, "===");
  if (items.status === 200) {
    const list = (JSON.parse(items.text).Items ?? []) as Array<{
      Code?: string;
      Name?: string;
      Description?: string;
      PurchaseDetails?: { UnitPrice?: number };
    }>;
    console.log(`Items returned (first page): ${list.length}`);
    for (const it of list.slice(0, 8)) {
      console.log(
        `  ${it.Code ?? "(no code)"} | ${it.Name ?? it.Description ?? ""} | purchase $${it.PurchaseDetails?.UnitPrice ?? "-"}`,
      );
    }
  } else {
    console.log(items.text.slice(0, 300));
  }

  // --- Purchase Orders — needs broad accounting.transactions ---
  const pos = await call("PurchaseOrders?pageSize=2", conn.token, conn.tenant);
  console.log("\n=== GET /PurchaseOrders ->", pos.status, "===");
  console.log(pos.text.slice(0, 250));

  await sql.end();
}

void main();
