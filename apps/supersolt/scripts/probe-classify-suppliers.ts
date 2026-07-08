/**
 * Validate the supplier AccountCode classifier against live Xero data. Read-only,
 * in-memory token refresh (NOT persisted). Mirrors the thresholds in
 * server/inventory-setup/classify-suppliers-by-account.ts and prints the keep/
 * exclude decision per supplier (grouped by Xero contact name).
 *
 *   pnpm tsx scripts/probe-classify-suppliers.ts
 */
import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const COGS_TYPE = "DIRECTCOSTS";
const COGS_DOMINANCE = 0.6;

type Line = { AccountCode?: string };
type Inv = { Contact?: { Name?: string }; Status?: string; LineItems?: Line[] };
type Acct = { Code?: string; Name?: string; Type?: string };

async function refresh(rt: string): Promise<string> {
  const basic = Buffer.from(`${process.env.XERO_CLIENT_ID!.trim()}:${process.env.XERO_CLIENT_SECRET!.trim()}`).toString("base64");
  const res = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: rt }),
  });
  const b = (await res.json()) as Record<string, string>;
  if (!res.ok) throw new Error(`refresh ${res.status}: ${JSON.stringify(b).slice(0, 200)}`);
  return String(b.access_token);
}

async function get(url: string, token: string, tenant: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "xero-tenant-id": tenant } });
  if (!res.ok) throw new Error(`${url} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function main() {
  const [conn] = await sql<{ rt: string; tenant: string }[]>`
    SELECT xero_refresh_token AS rt, xero_tenant_id AS tenant
    FROM venue_xero_connections ORDER BY updated_at DESC LIMIT 1`;
  if (!conn) throw new Error("No Xero connection");
  const token = await refresh(conn.rt);
  const tenant = conn.tenant;

  const acctBody = (await get("https://api.xero.com/api.xro/2.0/Accounts", token, tenant)) as { Accounts?: Acct[] };
  const acctType = new Map<string, { type: string; name: string }>();
  for (const a of acctBody.Accounts ?? []) {
    if (a.Code) acctType.set(a.Code.trim(), { type: (a.Type ?? "").toUpperCase(), name: a.Name ?? a.Code });
  }

  // 730-day window, paginated, same as the classifier.
  const invs: Inv[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const body = (await get(
      `https://api.xero.com/api.xro/2.0/Invoices?where=${encodeURIComponent('Type=="ACCPAY"')}&order=UpdatedDateUTC%20DESC&page=${page}&pageSize=100`,
      token, tenant,
    )) as { Invoices?: Inv[] };
    const batch = body.Invoices ?? [];
    invs.push(...batch);
    if (batch.length < 100) break;
  }

  type T = { coded: number; cogs: number; overheads: Map<string, number>; cogsName: string | null };
  const tallies = new Map<string, T>();
  for (const inv of invs) {
    if ((inv.Status ?? "").toUpperCase() === "DELETED") continue;
    const name = inv.Contact?.Name?.trim();
    if (!name) continue;
    let t = tallies.get(name);
    if (!t) { t = { coded: 0, cogs: 0, overheads: new Map(), cogsName: null }; tallies.set(name, t); }
    for (const li of inv.LineItems ?? []) {
      const acct = li.AccountCode ? acctType.get(li.AccountCode.trim()) : undefined;
      if (!acct) continue;
      t.coded += 1;
      if (acct.type === COGS_TYPE) { t.cogs += 1; if (!t.cogsName) t.cogsName = acct.name; }
      else t.overheads.set(acct.name, (t.overheads.get(acct.name) ?? 0) + 1);
    }
  }

  function decide(t: T): { keep: boolean | null; reason: string } {
    if (t.coded === 0) return { keep: null, reason: "No coded bills — review (default on)" };
    const frac = t.cogs / t.coded;
    if (frac >= COGS_DOMINANCE) return { keep: true, reason: `Direct Costs (${t.cogsName})` };
    if (t.cogs === 0) {
      let top: string | null = null, n = 0;
      for (const [name, c] of t.overheads) if (c > n) { top = name; n = c; }
      return { keep: false, reason: `Overheads (${top})` };
    }
    return { keep: true, reason: "Mixed coding — review (default on)" };
  }

  const keep: string[] = [], exclude: string[] = [], review: string[] = [];
  for (const [name, t] of [...tallies].sort((a, b) => a[0].localeCompare(b[0]))) {
    const d = decide(t);
    const line = `${name.padEnd(34)} coded:${String(t.coded).padStart(3)} cogs:${String(t.cogs).padStart(3)}  ${d.reason}`;
    if (d.keep === false) exclude.push(line);
    else if (t.cogs === 0 || t.coded === 0) review.push(line);
    else keep.push(line);
  }

  console.log(`\n=== KEEP (pre-ticked, ${keep.length}) ===`);
  keep.forEach((l) => console.log("  ✓ " + l));
  console.log(`\n=== AUTO-EXCLUDED (overheads, ${exclude.length}) ===`);
  exclude.forEach((l) => console.log("  ✗ " + l));
  if (review.length) {
    console.log(`\n=== REVIEW / mixed (${review.length}) ===`);
    review.forEach((l) => console.log("  ? " + l));
  }
  console.log(`\nbills scanned: ${invs.length}  suppliers with bills: ${tallies.size}`);
}

main().then(() => sql.end()).catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
