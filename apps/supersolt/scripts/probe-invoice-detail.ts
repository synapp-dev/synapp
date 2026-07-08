/**
 * Throwaway: settle whether ACCPAY invoice line items are genuinely lump-sum, or
 * whether GET /Invoices (list) hides line items that GET /Invoices/{id} reveals.
 * Read-only. In-memory token refresh (NOT persisted).
 *
 *   pnpm tsx scripts/probe-invoice-detail.ts
 */
import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

type Line = { ItemCode?: string; Description?: string; UnitAmount?: number; LineAmount?: number; AccountCode?: string };
type Inv = { InvoiceID?: string; InvoiceNumber?: string; Contact?: { Name?: string }; Total?: number; LineItems?: Line[]; Status?: string };

async function refresh(rt: string): Promise<string> {
  const id = process.env.XERO_CLIENT_ID!.trim();
  const secret = process.env.XERO_CLIENT_SECRET!.trim();
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
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

  // First page of ACCPAY bills from the LIST endpoint.
  const listBody = (await get(
    'https://api.xero.com/api.xro/2.0/Invoices?page=1&pageSize=100&where=Type=="ACCPAY"',
    token, tenant,
  )) as { Invoices?: Inv[] };
  const list = listBody.Invoices ?? [];

  // Pick a spread: prefer ones the list shows with 0–1 lines (the suspicious case).
  const candidates = list.filter((i) => i.Status !== "DELETED");
  const sample = candidates.slice(0, 10);

  console.log(`List returned ${list.length} ACCPAY bills (page 1). Spot-checking ${sample.length} via per-ID GET.\n`);
  let listLineTotal = 0;
  let detailLineTotal = 0;

  for (const inv of sample) {
    const listLines = inv.LineItems?.length ?? 0;
    const detailBody = (await get(
      `https://api.xero.com/api.xro/2.0/Invoices/${inv.InvoiceID}`,
      token, tenant,
    )) as { Invoices?: Inv[] };
    const detail = detailBody.Invoices?.[0];
    const detailLines = detail?.LineItems ?? [];
    listLineTotal += listLines;
    detailLineTotal += detailLines.length;
    const descs = detailLines
      .map((l) => `${(l.Description ?? "").slice(0, 28)}${l.UnitAmount != null ? ` @$${l.UnitAmount}` : ""}${l.ItemCode ? ` [${l.ItemCode}]` : ""}`)
      .slice(0, 4);
    console.log(
      `${(inv.InvoiceNumber ?? inv.InvoiceID ?? "?").padEnd(16)} ${(inv.Contact?.Name ?? "?").slice(0, 22).padEnd(22)} ` +
      `total $${inv.Total ?? "?"}  list:${listLines} lines  detail:${detailLines.length} lines`,
    );
    if (descs.length) console.log(`    ${descs.join(" | ")}`);
  }

  console.log(`\nSUMMARY  list lines: ${listLineTotal}   per-ID detail lines: ${detailLineTotal}`);
  console.log(
    detailLineTotal > listLineTotal * 1.5
      ? "⇒ LIST ENDPOINT HIDES LINE ITEMS — per-invoice GET reveals real itemization. PDFs may NOT be needed."
      : "⇒ List and detail agree — invoices are genuinely lump-sum. PDF parsing stays required for per-item prices.",
  );
}

main().then(() => sql.end()).catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
