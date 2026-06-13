# Supersolt roadmap

## Summary

**Compliance program (Module Overview):** [`module-overview-program.md`](module-overview-program.md) · **Production QA:** [`production-readiness-checklist.md`](production-readiness-checklist.md) · **Launch test session:** [`launch-test-checklist.md`](launch-test-checklist.md)

**Supersolt** is a multi-tenant hospitality operations platform for **multi-venue owners and ops leads**: organisations own venues; each venue gets scoped navigation for insights, catalog/stock, purchasing workflows, workforce, and operations. **One-line promise:** *Connect Square once, see venue-level sales truth, and get a path to control stock and labour without exporting spreadsheets.* This document consolidates the **Notion `Module Overview`** database (Supersolt-MVP workspace) with **evidence from `apps/supersolt`**. **Client-approved decisions captured in Notion** (onboarding, automation, integrations—see **Plan of record**) define the **implementation plan** when engineering work had drifted. **Program baseline (below):** work is **reset to Notion as the target** while **reusing and refactoring** the current codebase. Depth for individual capabilities belongs in `docs/features/<slug>/` via the **build-feature** skill—not duplicated here.

## Plan of record (Notion)

Where the client has signed off in **Notion** (Supersolt-MVP workspace)—including **`Module Overview`**, onboarding step specs, module pages (e.g. invoice automation, Email Infrastructure), and linked requirements—those decisions are the **authoritative plan** for **onboarding flow and invoice automation**. The app should **close gaps toward Notion** rather than treating existing routes or stubs as the source of truth.

**Launch shaping (grill-me branch 4 — confirmed):** Ship **v1** as **strong onboarding + invoice automation** plus a **thin Invoices module** (list, open, basic status/categorisation); deepen management UX in follow-on releases without blocking automation.

## Program baseline — greenfield intent, brownfield code

From **2026-05-11**, **product planning and milestones** treat Supersolt as **starting from this checkpoint** toward the **Notion spec**—not as “finished” because prior code exists. The current **`apps/supersolt` tree is reuse-first inventory**: keep what fits, **refactor or replace** what does not, and align routes, flows, and automation to **client-approved Notion** rather than preserving drift.

- **Intent:** Notion (and this roadmap’s build order).
- **Execution:** evolve the existing implementation—components, `entities/`, `server/`, migrations, Supabase RLS—**in place** where practical per [ARCHITECTURE.md](../../../ARCHITECTURE.md).
- **Status column (feature index):** still reflects **evidence in the repo today** (`Shipped` / `Partial` / `Planned`); “reset” is **planning and acceptance**, not an empty repository.

## Domain map — invoicing (two concepts)

Invoicing is **two separable capabilities**; **onboarding drives the first regardless of how mature the second is.** Both are eventually required for full product function.

| Layer | What it is | Relationship |
| --- | --- | --- |
| **Invoice automation & ingestion** | **Automated system delivered through onboarding:** operators configure **one or many ingestion points** (e.g. **Xero**, **Gmail** / inbound mailbox, **manual upload**, future APIs). After setup, the platform **pulls / detects** supplier invoices **set-and-forget**—operators do not need to live inside an invoices screen for documents to flow in. | **Product of onboarding first.** Exists on its own timeline from the management UI. |
| **Invoices module** | **Standalone surface** under Purchasing (`inventory/invoices`): **categorise, review, search, and manage** invoice records **after** automation has populated them. | **Separate module trajectory:** richer UX can ship later; **automation onboarding still ships first** so setup is not blocked by module polish. |

**Ideal:** finish onboarding → ingestion points live → ongoing detection/pull → operators use the **Invoices module** when they need to triage or classify, not as the prerequisite for capture.

## Execution MVP vs platform vision

- **Implementation MVP (positioning + scope confirmed in grill-me):** **auth → tenancy → onboarding unlock → POS-backed Insights (Sales)** first. **Invoice automation is pivotal:** ship **onboarding completion → configured ingestion → background pull/detect** with **≥ one** reliable channel early, architected for **multiple paths** (Xero, Gmail/email, upload, etc.), **per Notion/client-approved specs.** The **Invoices management module** ships **thin** in v1 (list/review/basic handling) and deepens **after** automation is credible—**automation setup via onboarding must not wait** on rich management UX.
- **Milestone 2 (still defer breadth):** deep Workforce (roster → payroll), Forecast Engine hardening, Agent polish, P&L depth, and advanced procurement automation—after Sales + **invoice automation** loop is credible.
- **Platform vision:** full module tree from Notion (Insights, Catalog/Stock Management, Purchasing, Workforce, Operations, Settings, Dashboard, Agent, Forecast Engine) plus **full invoice automation + a mature Invoices management module**—even where UI is stubbed or routes differ from Notion URLs.

## Phased delivery (post-MVP)

Loose ordering—edit as milestones firm up:

1. **Foundation** — identity, org/venue model, access APIs, setup/onboarding gates.
2. **Data ingress** — Square for sales/catalog signal; **invoice automation** from onboarding (≥ one ingestion path, multi-path-ready) so capture runs **set-and-forget** after setup; Xero/accounting connectors as prioritized.
3. **Operator loop** — dashboard/agent surfaces; Insights (Sales first); catalog/recipes costing inputs tied to supplier and invoice data.
4. **Procurement depth** — order guide / PO workflows beyond baseline invoices; supplier collaboration.
5. **People** — roster → timesheets → payroll export; compliance-shaped leave/availability.
6. **Depth** — Forecast Engine, P&L, labour/inventory insight panels, daybook, automation.

## In scope (from Notion Module Overview + repo)

All rows from the `Module Overview` database: top-level modules (Authentication, Onboarding, Dashboard, Agent, Forecast Engine, Insights, Stock Management, Purchasing, Workforce, Operations, Settings) plus nested onboarding steps and child routes. **Purchasing** in Notion is the parent for Suppliers, Orders, Invoices; **Stock Management** groups stock counts, waste, and catalog ingredients.

## Build order (dependency hierarchy)

Build **parents before children** so RBAC, routing, and data contracts stay stable. This is the multifaceted “what unlocks what” view requested alongside Notion.

| Tier | Capability | Why it comes first |
|------|------------|-------------------|
| **0** | **Authentication** | Session + Supabase middleware gate every route (`middleware.ts`, `utils/supabase/`). |
| **1** | **Organisation & venue tenancy** | Scoped URLs `/{organisation}/{venue}/…`, venue switcher, `/api/access/context` — without this, no module can assume a stable scope. |
| **2** | **Onboarding (Setup)** | `needsSetup` drives setup-only nav (`app-sidebar.tsx`); creates org, venues, connects POS, invites team, imports catalog, suppliers, recipes—**unlocks** the main sidebar. |
| **3** | **Integrations (Square POS)** | OAuth + tokens (`server/square/`, `square.env.example`); unlocks catalog import and **Sales** insights (Notion: instant-value moment). |
| **4** | **Invoice automation & ingestion (onboarding-led)** | **Set-and-forget outcome of onboarding:** configure ingestion point(s); system **pulls/detects** supplier invoices ongoing (Xero, Gmail/email, upload seeding, future APIs). **Ships regardless of Invoices module maturity.** Pipeline normalises into stored invoice records; requires supplier + venue scope (ties to onboarding “Create Supplier List”). |
| **5** | **Forecast Engine** | Notion positions this as feeding other modules; implement as **backend/jobs** before dependent Insights surfaces rely on it (often **milestone 2** depth unless Sales forecasting is promised earlier). |
| **6** | **Insights (Sales → rest)** | Sales route exists (`insights/sales`); Labour/Inventory/P&L pages exist—wire data **after** POS (+ invoice/cost signals where applicable). |
| **7** | **Catalog / Stock Management** | Ingredients, menu/items, recipes (`catalog/*`, `menu/*` via rewrites in `next.config.mjs`); **feeds** purchasing and cost logic. |
| **8** | **Purchasing (suppliers & orders)** | Suppliers, order guide / POs—day-to-day procurement beyond onboarding seed; **not** the same layer as invoice automation (tier 4). |
| **9** | **Invoices module (manage / categorise)** | **Distinct from tier 4:** `inventory/invoices` for **viewing, categorising, and managing** records that automation created—**necessary** for full operator control; can evolve **after** automation delivers rows (may launch as thin list/review first). |
| **10** | **Workforce** | People → roster / availability → leave → timesheets → payroll export (sequential operational dependency); largely **milestone 2** for full depth. |
| **11** | **Operations (Daybook)** | Day-to-day journal after core ops data exists. |
| **12** | **Settings** | Permissions, org, venue, integrations—cross-cutting; **Integrations** step also appears under onboarding. Notion also lists Recipes under Settings; app routes recipes under `menu/recipes` (see drift below). |

**Parallel tracks after tier 2:** **Dashboard** and **Agent** are top-level (`/dashboard`, `/agent`) and can progress alongside Insights once auth/session exists; they should not bypass tenancy rules when showing venue-specific data.

## Surface area by domain

### Core platform loop

#### Authentication

- **Status:** Partial
- **MVP execution:** yes
- **Evidence:** `app/(auth)/auth/page.tsx`, `app/(auth)/auth/callback/route.ts`, `middleware.ts`, `utils/supabase/`
- **How it should work:** Users sign in; session refreshes on matched routes; callbacks complete OAuth/password flows.
- **Drill-down:** *Run **build-feature** with slug `supersolt-authentication`.*

#### Organisation & venue scope

- **Status:** Partial
- **MVP execution:** yes
- **Evidence:** `app/(main)/[organisation]/[venue]/`, `app/api/access/context/route.ts`, `stores/app-context-store.ts`, `server/access/`
- **How it should work:** Every operational module resolves an org + venue; switching venues preserves logical section (see `DEFAULT_SCOPED_SECTION_PATH` in `app-sidebar.tsx`).
- **Drill-down:** *Suggested slug:* `supersolt-tenancy-access` — run build-feature

#### Onboarding (Setup)

- **Status:** Partial
- **MVP execution:** yes
- **Evidence:** `app/(main)/setup/page.tsx`, onboarding server modules under `server/onboarding/`
- **How it should work:** Notion steps: Create Organisation → Add Venues → Connect POS → Setup Accounting → Invite Team → Import Item List → Create Supplier List → Build Recipes; sidebar stays setup-focused until complete. **Invoice automation** (ingestion point setup—Xero/Gmail/upload/etc.) is part of the **set-and-forget** outcome of onboarding and **does not depend** on the **Invoices module** being feature-complete (see **Domain map — invoicing**).
- **Drill-down:** *Suggested slug:* `supersolt-onboarding` — run build-feature

#### Dashboard

- **Status:** Partial
- **Evidence:** `app/(main)/dashboard/page.tsx`
- **How it should work:** Executive snapshot; drill-down into modules (align with Notion Dashboard narrative).
- **Drill-down:** *Suggested slug:* `supersolt-dashboard` — run build-feature

#### Agent

- **Status:** Partial
- **Evidence:** `app/(main)/agent/page.tsx`
- **How it should work:** Conversational surface for operators (Notion: Nori-style guidance vs static dashboards).
- **Drill-down:** *Suggested slug:* `supersolt-agent` — run build-feature

### Platform modules

#### Forecast Engine

- **Status:** Planned
- **Evidence:** Notion module page only—confirm implementation location (`server/` jobs vs external worker).
- **How it should work:** Daily forecasts (revenue, orders, ticket size) per venue; feeds Insights and downstream automation per Notion.
- **Drill-down:** *Suggested slug:* `supersolt-forecast-engine` — run build-feature

#### Insights

- **Status:** Partial
- **Evidence:** `app/(main)/[organisation]/[venue]/insights/sales/page.tsx`, `labour`, `inventory`, `p-and-l`
- **How it should work:** Sales unlocked by POS connection; other tabs depend on labour, stock, and accounting signals as they exist.
- **Drill-down:** [`docs/features/insights-platform/plan.md`](features/insights-platform/plan.md) (parent + `forecast-engine`, `sales`, `labour`, `inventory`, `p-and-l` children)

#### Catalog & stock (Notion: “Stock Management”)

- **Status:** Partial
- **Evidence:** `catalog/page.tsx` (redirect), `next.config.mjs` rewrites (`catalog/menu` → `menu/menu-items`), `menu/ingredients`, `menu/recipes`, `inventory/stock-counts`, `inventory/waste`
- **How it should work:** Items/menu/ingredients under catalog; physical stock movements under inventory subgroup—matches Notion child links with naming differences (“Inventory ” row → ingredients path).
- **Drill-down:** *Suggested slug:* `supersolt-catalog-stock` — run build-feature

#### Purchasing

- **Status:** Partial
- **MVP execution:** yes (suppliers + orders; overlaps onboarding supplier seed)
- **Evidence:** Sidebar group titled **Inventory** in code but mirrors Purchasing children: `inventory/overview`, `order-guide`, `purchase-orders`, `invoices`, `suppliers`, plus stock counts/waste (`app-sidebar.tsx`)
- **How it should work:** Suppliers and order guide / PO workflows. **Do not conflate** with **invoice automation** (tier 4): purchasing is relationship + ordering; capture is the automation layer.
- **Drill-down:** *Suggested slug:* `supersolt-purchasing` — run build-feature

#### Invoice automation, ingestion & Email Infrastructure

- **Status:** Planned (pipeline) / Partial (once routes & storage exist)
- **MVP execution:** yes (**onboarding-first**)
- **Evidence:** Notion **Invoices** → **Email Infrastructure** relation in Module Overview; workers/cron TBD in `server/` or separate deployable per [ARCHITECTURE.md](../../../ARCHITECTURE.md) §8.
- **How it should work:** **Background system:** onboarding wires **one or many points** (Xero, Gmail/inbound email, manual upload, future APIs); ongoing **pull/detect** feeds invoice records **without** requiring daily use of the Invoices UI. Shared normalisation pipeline for all channels.
- **Drill-down:** *Suggested slug:* `supersolt-invoice-automation` — run build-feature (pair with `supersolt-email-infrastructure` for mailbox routing)

#### Invoices module (manage / categorise)

- **Status:** Partial
- **MVP execution:** yes (can launch **thin**: list + open + basic status; depth follows automation)
- **Evidence:** `inventory/invoices` route (`app-sidebar.tsx`)
- **How it should work:** **Operator-facing** surface to **categorise, search, reconcile, and manage** invoices **after** automation populates them—**separate product thread** from tier-4 setup; both layers needed for full function, **onboarding/automation first**.
- **Drill-down:** *Suggested slug:* `supersolt-invoices-module` — run build-feature

#### Workforce

- **Status:** Partial
- **Evidence:** `workforce/people`, `roster`, `availability`, `leave`, `timesheets`, `payroll-export`; `server/workforce/`
- **How it should work:** Rostering and availability before payroll export; people master first.
- **Drill-down:** *Suggested slug:* `supersolt-workforce` — run build-feature

#### Operations

- **Status:** Partial
- **Evidence:** `operations/daybook/page.tsx`
- **How it should work:** Operational journal/daily close—build after core transaction and labour data are trustworthy.
- **Drill-down:** *Suggested slug:* `supersolt-operations-daybook` — run build-feature

#### Settings

- **Status:** Partial
- **Evidence:** `settings/permissions`, `organisation`, `venue`, `integrations`; `entities/access/scoped-settings-access.ts`
- **How it should work:** RBAC-scoped visibility for settings tabs; integrations continue OAuth flows started in onboarding.
- **Drill-down:** *Suggested slug:* `supersolt-settings` — run build-feature

## Integrations & dependencies

- **Supabase:** Auth, Postgres, RLS — product-owned migrations under `apps/supersolt/supabase/migrations/` (see [ARCHITECTURE.md](../../../ARCHITECTURE.md) §8).
- **Square:** Documented in `square.env.example` (`SQUARE_APPLICATION_ID`, `SQUARE_OAUTH_REDIRECT_URI`, tokens in DB per venue/org — never commit secrets).
- **Xero / accounting:** Notion onboarding step “Setup Accounting System”; confirm env keys when implementing (add to product `env.example` when introduced).

## Runtime & deployables

- **Primary:** Next.js app (`pnpm dev` port **3005**, `package.json`).
- **Forecast / jobs / invoice automation:** Invoice **pull/detect** may use workers/crons or inbound email processors—when split from the Next.js process, document ownership and env split in this section (additional deployables pattern per product needs; see monorepo boundaries in [ARCHITECTURE.md](../../../ARCHITECTURE.md)).

## Monorepo & code placement

- Follow [ARCHITECTURE.md](../../../ARCHITECTURE.md): **no app-to-app imports**; promote shared code to `packages/*` only on **second consumer**; shell UI in `apps/supersolt/components/`, domain workflows in `apps/supersolt/entities/` and `server/`.
- **Reuse-first:** prefer adapting existing app files to Notion flows before adding parallel implementations; extract to `packages/*` only when the second-consumer rule is met.
- Merge gates may include root `pnpm lint:architecture` per ARCHITECTURE §4.2.

## Security & documentation hygiene

- Do not embed secrets or credential-bearing URLs in docs; reference `square.env.example` and Supabase env patterns only.

## Constraints

- **Notion vs code URL drift** (reconcile in specs or redirects): e.g. Notion **Recipes** `App URL` shows `/settings/recipes`; app implements `menu/recipes`. Notion **Venues** `/settings/venues` vs app **`settings/venue`**. Align via build-feature or explicit redirects.
- **Navigation labels:** Sidebar uses **Catalog** + **Inventory** group names; Notion uses **Stock Management** + **Purchasing**—same conceptual split, different labels.
- **Invoicing split:** Roadmap and specs must keep **invoice automation (onboarding + workers)** separate from **Invoices module UX** so schedules and ownership stay clear.
- **Notion-led reconciliation:** When Notion and the codebase disagree on onboarding steps, URLs, or automation behaviour, **default to updating the app toward Notion** after client approval—document intentional exceptions in specs or ADRs.

## Feature index

Statuses reflect **current code behaviour** (see **Program baseline**); **intent** follows Notion.

| Capability | Status | MVP execution | Spec |
|------------|--------|---------------|------|
| Authentication | Partial | yes | *Suggested slug:* `supersolt-authentication` |
| Tenancy & access context | Partial | yes | *Suggested slug:* `supersolt-tenancy-access` |
| Onboarding / Setup | Partial | yes | *Suggested slug:* `supersolt-onboarding` |
| Square / POS integration | Partial | yes | *Suggested slug:* `supersolt-square-integration` |
| Forecast Engine | Planned | | *Suggested slug:* `supersolt-forecast-engine` |
| Insights (Sales, Labour, Inventory, P&L) | Partial | yes (Sales) | [`insights-platform/plan.md`](features/insights-platform/plan.md) |
| Catalog & stock | Partial | | *Suggested slug:* `supersolt-catalog-stock` |
| Purchasing (suppliers, orders) | Partial | yes | *Suggested slug:* `supersolt-purchasing` |
| Invoice automation & ingestion (onboarding-led) | Planned | yes | *Suggested slug:* `supersolt-invoice-automation` (+ `supersolt-email-infrastructure`) |
| Invoices module (manage / categorise) | Partial | yes | *Suggested slug:* `supersolt-invoices-module` |
| Workforce | Partial | | *Suggested slug:* `supersolt-workforce` |
| Operations / Daybook | Partial | | *Suggested slug:* `supersolt-operations-daybook` |
| Settings | Partial | | *Suggested slug:* `supersolt-settings` |
| Dashboard | Partial | | *Suggested slug:* `supersolt-dashboard` |
| Agent | Partial | | *Suggested slug:* `supersolt-agent` |

### Slug convention (confirmed)

Use **`supersolt-<capability>`** for each feature folder under `apps/supersolt/docs/features/` (e.g. `supersolt-onboarding`) so names stay unique across the monorepo—grill-me branch 6.

## Grill-me summary (2026-05-11)

Shared understanding captured in this file:

1. **Positioning:** Multi-venue owners / ops leads; promise focused on Square-backed sales truth and path to stock/labour control without spreadsheet exports.
2. **Priority:** v1 = strong **onboarding + invoice automation** + **thin Invoices module**; defer deep Workforce, Forecast polish, Agent polish until milestone 2 breadth—**invoice automation stays pivotal**, not deferred wholesale.
3. **Domain map:** **Invoice automation** (onboarding-led, set-and-forget, multi-path) is separate from the **Invoices module** (manage/categorise); automation ships first.
4. **Scope / phases:** Notion client-approved docs are **plan of record**; **program baseline reset** from 2026-05-11 — **greenfield intent toward Notion**, **brownfield reuse/refactor** of existing code.
5. **Code vs intent:** Feature **status** stays **evidence-based** from the repo; **intent** follows Notion; gaps tracked in build-feature specs.
6. **Feature slugs:** **`supersolt-<capability>`** prefix for `docs/features/` triads.

## Open questions

- Which **first ingestion path** ships in MVP—often fixed by **Notion/client specs** once synced (Xero vs Gmail/inbound email vs upload-first vs hybrid) and acceptance criteria for “supplier → venue” matching.
- Whether **Forecast Engine** is in-scope for first release vs parallel track (confirm against Notion roadmap).
- **Accounting (Xero)** timing vs Sales-only Insights MVP (confirm against Notion onboarding narrative).

## Source notes

- **Notion:** `Module Overview` database and linked module/onboarding pages, Supersolt-MVP workspace — hierarchical fields `Parent item` / `Sub-item` and `App URL`; **client-approved content is plan-of-record** for onboarding + automation (snapshot consolidated 2026-05-11).
- **Code:** `apps/supersolt` routes, `components/organisms/app-sidebar.tsx`, `middleware.ts`, `supabase/migrations/`.

*Last reviewed: 2026-05-11 (grill-me complete — six branches captured; slug convention `supersolt-*` confirmed).* 
