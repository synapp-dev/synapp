# Inventory-Setup Flow Rework — Handoff / Continuation Brief

> Purpose: hand this work to a fresh chat. It captures the goal, the approved plan, what's
> already changed in the working tree, the **critical infra gotchas**, and the **exact next
> steps**. Read this top-to-bottom before touching anything.

App: `apps/supersolt` (Next.js, Drizzle/Postgres, Supabase). Running locally at
`http://localhost:3005`, venue path `piccolo-panini-bar/hawthorn-vic`.
Full design plan: `C:\Users\User\.claude\plans\moonlit-chasing-penguin.md` (read it too).

---

## The goal (user's vision)

When a user clicks **Import from Xero** in inventory setup, the pipeline currently runs straight
through: sync suppliers → sync invoice headers (365 days) → AI-parse **every** invoice PDF with
OpenAI `gpt-4o` → aggregate raw items → infer delivery. For a venue like Piccolo Panini only 2 of
5 Xero contacts actually deliver inventory, so we waste time/tokens parsing irrelevant suppliers
and a full year of bills.

Rework, in 3 phases (backend-first; user-approved):

1. **Cheaper parsing** — swap the parser to **Anthropic Haiku** and only pull/parse the **last 8
   weeks** of bills. Also, in the same pass, AI-tag each line as inventory vs not, **and** extract
   the supplier header (ABN, address, email, phone) to enrich the supplier record from its most
   recent invoice.
2. **Supplier-selection gate** — after suppliers sync, stop and let the user pick which suppliers
   actually deliver inventory; persist it; only parse those.
3. **Guided supplier drawer** — replace the drawer's top tabs with an in-dialog left **sidebar**
   (`@workspace/ui/components/sidebar`) with steps Information / Contact / Payment / Delivery /
   Items / Invoices. Items = two tables (likely-inventory vs non-inventory) with an `Invoice (N)`
   source button → dialog of related invoices → invoice preview. Invoices = full list with
   Parsed / Not-parsed status.

Decisions already locked: model `claude-haiku-4-5`; `daysBack = 56`; classification = **AI tags
each line** (captured at parse time); supplier "delivers inventory" persisted as a flag.

---

## 🚨 Critical infra gotchas (do NOT skip)

1. **Supabase MCP points at the WRONG project.** The connected `mcp__supabase__*` server resolves
   to project `pmgoeayofxbvedbmjrxd`. The **app actually uses `fclphvqgqkdscfbvxiji`**
   (`NEXT_PUBLIC_SUPABASE_URL` + `DATABASE_URL` both → `fclph…`). A `supabase-fclph` MCP server was
   added to `.mcp.json` and authenticated, but the desktop session hadn't reconnected to it yet —
   `get_project_url` still returned `pmgoe…`. **Before applying any migration: reload so the
   `supabase-fclph` tools are live and confirm `get_project_url` === `fclphvqgqkdscfbvxiji`, OR
   apply directly against the app's `DATABASE_URL` (postgres.js one-off) — never via the `pmgoe…`
   MCP.**

2. **`ANTHROPIC_API_KEY` was added to `apps/supersolt/.env.local`** (copied from
   `apps/jourdain/.env.local`). The parser now needs it. **Next.js only reads `.env.local` at
   startup → the dev server must be restarted** before any parse will work.

3. **Document preview "431" is NOT our bug.** On `purchasing/invoices`, opening an invoice's
   "Original Document" can fail with `Download failed (431)` = *Request Header Fields Too Large*
   (Node rejects the request because Supabase auth cookies + the `Authorization: Bearer` JWT
   exceed the 16 KB header limit). Fix: restart dev with
   `NODE_OPTIONS=--max-http-header-size=65536 pnpm dev`, or clear `localhost:3005` cookies. The
   attachment route/preview hook were never touched.

4. **Driving the app**: the Chrome extension MCP (`mcp__Claude_in_Chrome__*`) works once connected;
   it creates its own tab. The preview tool can't take port 3005 (the user's dev server holds it).

---

## What's already done (in the working tree, uncommitted)

### Phase 1 — Step 1 (DONE, type-checks clean)
`apps/supersolt/server/invoices/invoice-parser.service.ts`
- Provider swap: `@ai-sdk/openai`/`gpt-4o` → `@ai-sdk/anthropic`/`anthropic("claude-haiku-4-5")`.
  Env check `OPENAI_API_KEY` → `ANTHROPIC_API_KEY`. (`@ai-sdk/anthropic@^3` added to package.json.)
- Parse schema extended with per-line **`isLikelyInventory: boolean`** + prompt sentence.
- Parse schema extended with **supplier header fields**: `supplierEmail`, `supplierPhone`,
  `supplierAddressLine1/2`, `supplierSuburb`, `supplierState`, `supplierPostcode` (+ existing
  `supplierAbn`), with a prompt line to extract them. (Captured in output; not yet persisted.)

8-week window:
- `apps/supersolt/server/inventory-setup/inventory-setup.service.ts` — setup import `daysBack`
  `365` → `56`.
- `apps/supersolt/server/xero/list-accounting-invoices.ts` — added `dateSince?: string`
  (YYYY-MM-DD) → `where Type=="ACCPAY" AND Date >= DateTime(y,m,d)`.
- `apps/supersolt/server/xero/xero-invoices.service.ts` — added `xeroDateSinceFilter(daysBack)`,
  passes `dateSince` to both list calls (kept on the no-results retry).

### Earlier UI work this session (DONE, in working tree)
- Welcome screens: traceback illustration → single vertical column (`flex-col-reverse`, `ArrowUp`),
  added "Stock gets low" step, icon-left rows; benefit boxes → single column rows.
  (`entities/inventory-setup/components/wizard/welcome/*`)
- Combined the inventory-setup section selector + step chips into one row; lifted the stepper into
  the shared layout (`settings/inventory-setup/_components/inventory-setup-layout-client.tsx`,
  `setup-stepper-banner.tsx`); removed 3 per-page banners.
- Suppliers page: "Import your first supplier" empty state (3 cards: Import from Xero / Upload
  invoice / Add manually); **table ⇄ cards view toggle** persisted via zustand `persist`
  (`entities/suppliers/components/suppliers-page.tsx`, `model/store.ts`,
  `entities/invoices/components/invoice-upload-dialog.tsx` got an optional `trigger` prop).
- Import auto-background: after the suppliers + invoices steps complete, the modal auto-drops to
  the header progress pill and the suppliers table refetches so it's editable while PDFs parse
  (`entities/inventory-setup/components/inventory-setup-import-provider.tsx`). **Verified live.**
- Supplier drawer: removed the top stat cards; surfaced the **Invoices** tab in setup mode
  (`entities/suppliers/components/supplier-detail-page.tsx`). **Verified live.** (Phase 3 will
  replace these tabs with the sidebar.)

---

## NEXT STEPS (resume here)

### A. Apply the additive migration to the **correct** DB (`fclphvqgqkdscfbvxiji`)
Confirm target first (see gotcha #1). SQL:
```sql
ALTER TABLE public.venue_invoice_line_items
  ADD COLUMN IF NOT EXISTS is_likely_inventory boolean;
ALTER TABLE public.supplier_raw_items
  ADD COLUMN IF NOT EXISTS is_likely_inventory boolean;
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS details_source_invoice_date date;
```
Then regenerate the drizzle schema: `pnpm --filter supersolt drizzle:pull` (DB-first; introspects
into `apps/supersolt/drizzle/schema.ts` + runs `fix:schema`). If `drizzle:pull` produces a noisy
diff, instead **manually add** the 3 columns to the table defs in
`apps/supersolt/drizzle/schema.ts` (`venueInvoiceLineItems`, `supplierRawItems`, `suppliers`).

### B. Wire the classification through (Step 2)
- `server/invoices/invoice-parser.service.ts` → `mapParsedInvoiceToLineInserts` should emit
  `isLikelyInventory: line.isLikelyInventory`.
- `server/invoices/invoices.repo.ts` → `replaceLineItems` must insert the new column (and its
  insert type include `isLikelyInventory`).
- Raw-items aggregation: `server/supplier-raw-items/aggregate-invoice-lines.ts` +
  `supplier-raw-items.repo.ts` (`upsertFromLine`) — carry the flag onto the raw item; on dedupe,
  "any contributing line was inventory" wins (true beats false/null).
- Surface `isLikelyInventory` on the read model: `entities/supplier-raw-items/model/types.ts` +
  the list endpoint/query, for Phase 3's two-table split.

### C. Supplier-header enrichment (most-recent-invoice wins)
In `server/invoices/invoice-attachment-parse.service.ts` (`parseInvoiceAttachmentIfNeeded`), after
a successful parse: if `invoice.supplierId` is set and the parsed `invoiceDate` is newer than the
supplier's `details_source_invoice_date` (or it's null), update the supplier's ABN / email / phone
/ address* from the parsed header (only overwrite with non-null parsed values), and set
`details_source_invoice_date = invoiceDate`. Add a suppliers-repo method for this guarded update.
Result: each supplier ends up populated from its most recent invoice.

### D. Verify Phase 1 end-to-end (live, via Chrome extension)
Restart dev (`NODE_OPTIONS=--max-http-header-size=65536 pnpm dev`). Open
`localhost:3005/piccolo-panini-bar/hawthorn-vic/settings/inventory-setup/suppliers`, click
**Import from Xero**. Confirm in logs/network: calls **Anthropic** (not OpenAI), only ~8 weeks of
bills pulled, parses succeed; spot-check `venue_invoice_line_items.is_likely_inventory` is set,
`supplier_raw_items.is_likely_inventory` populated after aggregation, and suppliers got
ABN/address/contact from their latest invoice. `pnpm --filter supersolt tsc` clean (note: 6
**pre-existing** unrelated errors in Square OAuth / a sales test / stock-count cron — ignore).

### Then: Phase 2 (selection gate) and Phase 3 (sidebar drawer + Items/Invoices)
See the plan file. Phase 2 adds `suppliers.is_inventory_source boolean`, splits the import job
(sync-suppliers job → user picks → scoped parse job), adds a wizard substep, and scopes parsing in
`server/inventory-setup/parse-invoice-attachments-for-setup.ts` (it already has the obvious
`supplierIds` injection point in its `where`). Phase 3 rebuilds
`entities/suppliers/components/supplier-detail-page.tsx` with the sidebar; Items uses
`is_likely_inventory`; `Invoice (N)` derives distinct invoice count from `venue_invoice_line_items`
(match supplierId + normalized description) via a new repo query/endpoint → related-invoices dialog
→ `InvoiceDetailPanel` preview.

---

## Useful references
- Parser: `server/invoices/invoice-parser.service.ts`, `invoice-attachment-parse.service.ts`
- Import pipeline: `server/inventory-setup/inventory-setup.service.ts`,
  `inventory-setup-import-job.tracker.ts`, `parse-invoice-attachments-for-setup.ts`
- Xero: `server/xero/xero-invoices.service.ts`, `list-accounting-invoices.ts`,
  `xero-suppliers.service.ts`, `xero-contact-map.ts`
- Raw items: `server/supplier-raw-items/aggregate-invoice-lines.ts` + `.repo.ts`;
  `entities/supplier-raw-items/*` (`RawItemsTable`)
- Wizard: `server/inventory-setup/wizard-model.ts`, `build-wizard-model`
- Drawer/UI: `entities/suppliers/components/supplier-detail-page.tsx`,
  `@workspace/ui/components/sidebar`, `DeliveryScheduleGrid`,
  `entities/invoices/components/invoice-detail-panel.tsx`
- Model id confirmed via the `claude-api` skill: `claude-haiku-4-5` (pinned
  `claude-haiku-4-5-20251001`).
