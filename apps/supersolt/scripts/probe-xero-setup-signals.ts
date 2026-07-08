/**
 * Throwaway probe for the inventory-setup redesign. Read-only against the venue's
 * Xero data. Refreshes the access token first (and persists the rotation back so
 * the app's stored connection stays valid), then measures the signals the redesign
 * depends on:
 *   - invoice (ACCPAY) line items: do they exist via API, are they coded (ItemCode),
 *     do they carry AccountCode?
 *   - PO lines: code/price coverage
 *   - /Items catalog: can it supply canonical names + prices for coded lines?
 *   - /Accounts: which AccountCodes are DIRECTCOSTS (COGS/inventory) vs OVERHEADS
 *     (the supplier auto-classify signal)
 *   - PO vs invoice overlap by code + description
 *
 *   pnpm tsx scripts/probe-xero-setup-signals.ts
 */
import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

type Line = {
  ItemCode?: string;
  Description?: string;
  UnitAmount?: number;
  AccountCode?: string;
};
type Doc = {
  Contact?: { Name?: string };
  LineItems?: Line[];
  Status?: string;
  Type?: string;
};

const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";

async function refreshToken(refresh: string): Promise<{ access: string; refresh: string; expiresIn: number }> {
  const id = process.env.XERO_CLIENT_ID!.trim();
  const secret = process.env.XERO_CLIENT_SECRET!.trim();
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });
  const body = (await res.json()) as Record<string, string | number>;
  if (!res.ok) throw new Error(`refresh ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return {
    access: String(body.access_token),
    refresh: String(body.refresh_token),
    expiresIn: Number(body.expires_in ?? 1800),
  };
}

async function fetchAll(
  endpoint: string,
  key: string,
  token: string,
  tenant: string,
  where?: string,
): Promise<Doc[]> {
  const out: Doc[] = [];
  let page = 1;
  for (;;) {
    const q = new URLSearchParams({ page: String(page), pageSize: "100" });
    if (where) q.set("where", where);
    const res = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}?${q}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "xero-tenant-id": tenant },
    });
    if (!res.ok) throw new Error(`${endpoint} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as Record<string, Doc[]>;
    const batch = body[key] ?? [];
    out.push(...batch);
    if (batch.length < 100) break;
    page += 1;
    if (page > 200) break;
  }
  return out;
}

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");

function analyse(label: string, docs: Doc[], accountType: Map<string, string>) {
  let lines = 0;
  let withCode = 0;
  let withPrice = 0;
  let withAccount = 0;
  const codes = new Set<string>();
  const descs = new Set<string>();
  const acctLineCounts = new Map<string, number>();
  for (const d of docs) {
    if (d.Status === "DELETED") continue;
    for (const li of d.LineItems ?? []) {
      const name = (li.Description ?? "").trim() || (li.ItemCode ?? "").trim();
      if (!name) continue;
      lines += 1;
      const code = li.ItemCode?.trim();
      if (code) {
        withCode += 1;
        codes.add(code.toLowerCase());
      }
      if ((li.UnitAmount ?? 0) > 0) withPrice += 1;
      if (li.AccountCode?.trim()) {
        withAccount += 1;
        acctLineCounts.set(li.AccountCode.trim(), (acctLineCounts.get(li.AccountCode.trim()) ?? 0) + 1);
      }
      descs.add(norm(name));
    }
  }
  console.log(`\n--- ${label} ---`);
  console.log(`docs: ${docs.length}  lines: ${lines}`);
  console.log(`  with ItemCode:   ${withCode} (${pct(withCode, lines)})`);
  console.log(`  with price>0:    ${withPrice} (${pct(withPrice, lines)})`);
  console.log(`  with AccountCode:${withAccount} (${pct(withAccount, lines)})`);
  console.log(`  unique item codes: ${codes.size}  unique descriptions: ${descs.size}`);
  const top = [...acctLineCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (top.length) {
    console.log(`  top account codes (lines):`);
    for (const [code, n] of top) {
      const t = accountType.get(code) ?? "?";
      console.log(`    ${code.padEnd(8)} ${String(n).padStart(5)}  ${t}`);
    }
  }
  return { codes, descs };
}

function diff(label: string, a: Set<string>, b: Set<string>, sampleN = 12) {
  const onlyA = [...a].filter((x) => !b.has(x));
  const both = [...a].filter((x) => b.has(x));
  console.log(`\n${label}`);
  console.log(`  in both: ${both.length}  only in first: ${onlyA.length}`);
  console.log(`  e.g. only-first: ${onlyA.slice(0, sampleN).join(" | ")}`);
}

async function main() {
  const rows = await sql<{ refresh: string; tenant: string; venue: string }[]>`
    SELECT xero_refresh_token AS refresh, xero_tenant_id AS tenant, venue_id AS venue
    FROM venue_xero_connections ORDER BY updated_at DESC LIMIT 1`;
  const conn = rows[0];
  if (!conn) throw new Error("No Xero connection");

  console.log("Refreshing access token (in-memory only — NOT persisted to DB)…");
  const fresh = await refreshToken(conn.refresh);
  const token = fresh.access;
  const tenant = conn.tenant;

  // Chart of accounts: code -> "Type (Class)" so we can read COGS vs overhead.
  console.log("Fetching Accounts (chart of accounts)…");
  const acctRes = await fetch("https://api.xero.com/api.xro/2.0/Accounts", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "xero-tenant-id": tenant },
  });
  const acctBody = (await acctRes.json()) as { Accounts?: Array<{ Code?: string; Name?: string; Type?: string; Class?: string }> };
  const accountType = new Map<string, string>();
  for (const a of acctBody.Accounts ?? []) {
    if (a.Code) accountType.set(a.Code, `${a.Type ?? "?"} (${a.Class ?? "?"})  ${a.Name ?? ""}`.trim());
  }

  console.log("Fetching purchase orders…");
  const pos = await fetchAll("PurchaseOrders", "PurchaseOrders", token, tenant, 'Status!="DELETED"');
  console.log("Fetching invoices (ACCPAY bills)…");
  const invs = await fetchAll("Invoices", "Invoices", token, tenant, 'Type=="ACCPAY"');

  const po = analyse("PURCHASE ORDERS", pos, accountType);
  const inv = analyse("INVOICES (ACCPAY)", invs, accountType);

  console.log("\nFetching Items (Products & Services)…");
  const itemsRes = await fetch("https://api.xero.com/api.xro/2.0/Items", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "xero-tenant-id": tenant },
  });
  const itemsBody = (await itemsRes.json()) as {
    Items?: Array<{ Code?: string; Name?: string; PurchaseDetails?: { UnitPrice?: number } }>;
  };
  const items = itemsBody.Items ?? [];
  const itemPriceByCode = new Map<string, number>();
  const itemNameByCode = new Map<string, string>();
  let itemsWithPrice = 0;
  let itemsWithName = 0;
  for (const it of items) {
    const price = it.PurchaseDetails?.UnitPrice ?? 0;
    if (it.Code) {
      itemPriceByCode.set(it.Code.toLowerCase(), price);
      if (it.Name?.trim()) { itemNameByCode.set(it.Code.toLowerCase(), it.Name.trim()); itemsWithName += 1; }
    }
    if (price > 0) itemsWithPrice += 1;
  }
  console.log(`\n--- XERO ITEMS ---`);
  console.log(`items: ${items.length}  with name: ${itemsWithName}  with purchase price>0: ${itemsWithPrice} (${pct(itemsWithPrice, items.length)})`);

  let poCodesNamed = 0;
  let poCodesPriced = 0;
  for (const code of po.codes) {
    if (itemNameByCode.has(code)) poCodesNamed += 1;
    if ((itemPriceByCode.get(code) ?? 0) > 0) poCodesPriced += 1;
  }
  console.log(`PO item codes (${po.codes.size}) resolvable via /Items → name: ${poCodesNamed} (${pct(poCodesNamed, po.codes.size)}), price: ${poCodesPriced} (${pct(poCodesPriced, po.codes.size)})`);

  console.log("\n=== OVERLAP BY ITEM CODE ===");
  diff("PO codes vs Invoice codes:", po.codes, inv.codes);
  console.log("\n=== OVERLAP BY DESCRIPTION ===");
  diff("PO descriptions vs Invoice descriptions:", po.descs, inv.descs);
}

main()
  .then(() => sql.end())
  .catch(async (e) => {
    console.error(e);
    await sql.end();
    process.exit(1);
  });
