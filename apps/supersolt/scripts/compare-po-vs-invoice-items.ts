/**
 * Testbed: compare the items listed on Xero Purchase Orders vs Invoices (bills).
 * Read-only — pulls both straight from the Xero API and reports coverage + overlap.
 *
 *   pnpm tsx scripts/compare-po-vs-invoice-items.ts
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
};
type Doc = {
  Contact?: { Name?: string };
  LineItems?: Line[];
  Status?: string;
};

async function fetchAll(
  endpoint: string,
  key: "PurchaseOrders" | "Invoices",
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
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "xero-tenant-id": tenant,
      },
    });
    if (!res.ok) {
      throw new Error(`${endpoint} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const body = (await res.json()) as Record<string, Doc[]>;
    const batch = body[key] ?? [];
    out.push(...batch);
    if (batch.length < 100) break;
    page += 1;
    if (page > 200) break;
  }
  return out;
}

const norm = (s: string | undefined) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function analyse(label: string, docs: Doc[]) {
  let lines = 0;
  let withCode = 0;
  let withPrice = 0;
  const codes = new Set<string>();
  const descs = new Set<string>();
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
      descs.add(norm(name));
    }
  }
  console.log(`\n--- ${label} ---`);
  console.log(`docs: ${docs.length}  lines: ${lines}`);
  console.log(`  with ItemCode: ${withCode} (${pct(withCode, lines)})`);
  console.log(`  with price>0:  ${withPrice} (${pct(withPrice, lines)})`);
  console.log(`  unique item codes: ${codes.size}`);
  console.log(`  unique descriptions: ${descs.size}`);
  return { codes, descs };
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");

function diff(label: string, a: Set<string>, b: Set<string>, sampleN = 15) {
  const onlyA = [...a].filter((x) => !b.has(x));
  const both = [...a].filter((x) => b.has(x));
  console.log(`\n${label}`);
  console.log(`  in both: ${both.length}`);
  console.log(`  only in first: ${onlyA.length}  e.g. ${onlyA.slice(0, sampleN).join(", ")}`);
}

async function main() {
  const rows = await sql<{ token: string; tenant: string }[]>`
    SELECT xero_access_token AS token, xero_tenant_id AS tenant
    FROM venue_xero_connections ORDER BY updated_at DESC LIMIT 1`;
  const conn = rows[0];
  if (!conn) throw new Error("No Xero connection");

  console.log("Fetching purchase orders…");
  const pos = await fetchAll("PurchaseOrders", "PurchaseOrders", conn.token, conn.tenant, 'Status!="DELETED"');
  console.log("Fetching invoices (ACCPAY bills)…");
  const invs = await fetchAll("Invoices", "Invoices", conn.token, conn.tenant, 'Type=="ACCPAY"');

  const po = analyse("PURCHASE ORDERS", pos);
  const inv = analyse("INVOICES (ACCPAY)", invs);

  // --- Xero Items catalog: does it fill the PO price gap? ---
  console.log("\nFetching Items (Products & Services)…");
  const itemsRes = await fetch(
    "https://api.xero.com/api.xro/2.0/Items",
    {
      headers: {
        Authorization: `Bearer ${conn.token}`,
        Accept: "application/json",
        "xero-tenant-id": conn.tenant,
      },
    },
  );
  const itemsBody = (await itemsRes.json()) as {
    Items?: Array<{ Code?: string; Name?: string; PurchaseDetails?: { UnitPrice?: number } }>;
  };
  const items = itemsBody.Items ?? [];
  const itemPriceByCode = new Map<string, number>();
  let itemsWithPrice = 0;
  for (const it of items) {
    const price = it.PurchaseDetails?.UnitPrice ?? 0;
    if (it.Code) itemPriceByCode.set(it.Code.toLowerCase(), price);
    if (price > 0) itemsWithPrice += 1;
  }
  console.log(`\n--- XERO ITEMS ---`);
  console.log(`items: ${items.length}  with purchase price>0: ${itemsWithPrice} (${pct(itemsWithPrice, items.length)})`);

  // For every PO item code, can Items supply a price?
  let poCodesPriced = 0;
  for (const code of po.codes) {
    if ((itemPriceByCode.get(code) ?? 0) > 0) poCodesPriced += 1;
  }
  console.log(
    `PO item codes (${po.codes.size}) that get a price from Items: ${poCodesPriced} (${pct(poCodesPriced, po.codes.size)})`,
  );

  console.log("\n=== OVERLAP BY ITEM CODE ===");
  diff("PO codes vs Invoice codes:", po.codes, inv.codes);
  diff("Invoice codes vs PO codes:", inv.codes, po.codes);

  console.log("\n=== OVERLAP BY DESCRIPTION ===");
  diff("PO descriptions vs Invoice descriptions:", po.descs, inv.descs);
  diff("Invoice descriptions vs PO descriptions:", inv.descs, po.descs);

  await sql.end();
}

void main();
