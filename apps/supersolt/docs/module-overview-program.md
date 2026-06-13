# Module Overview compliance program

> **Product:** `apps/supersolt`  
> **Notion:** [Module Overview](https://www.notion.so/34f64094bde68086bf03c99d2c737068) (Supersolt-MVP)  
> **Plan of record:** Notion product sections; repo §3+ engineering unless ADR exception ([`roadmap.md`](roadmap.md))  
> **Last inventory:** 2026-06-01 (46 rows, `user-notion-supersolt` MCP)

## How to use this index

| Column | Meaning |
|--------|---------|
| **Wave** | Execution batch (W0–W8) per program plan |
| **Track** | `full` = build-feature triad created/updated; `compliance` = existing triad + gap matrix; `stub` = Phase 2 defer |
| **Triad** | Path to `plan.md` (and siblings) under `docs/features/` |
| **Audit** | `Done` = docs complete this program; `Pending` = not started; `In progress` = partial |

### Per-module session checklist

```
[ ] Notion page fetched (user-notion-supersolt)
[ ] mapping.md row accurate (App URL, slug)
[ ] plan.md product sections synced
[ ] Route + API + server + entities traced
[ ] Gap matrix complete
[ ] tdd.md / flows.md updated for gaps
[ ] Cross-module links reflected in plan
[ ] Program index row → Done
```

---

## Work packages (v1)

| # | Package | Wave | Track | Triad path | Audit |
|---|---------|------|-------|------------|-------|
| 1 | Authentication | W1 | compliance | [`features/supersolt-authentication/`](features/supersolt-authentication/) | Done |
| 2 | Onboarding (+ 8 substeps) | W1 | full build-feature | [`features/onboarding/`](features/onboarding/) — Phase 1a/1b spec | Done |
| 3 | Tenancy & access | W1 | full | [`features/tenancy-access/`](features/tenancy-access/) | Done |
| 4 | Square / POS (onboarding §) | W1 | § in onboarding | onboarding/plan.md § Square | Done |
| 5 | Dashboard | W4 | compliance | [`features/dashboard/`](features/dashboard/) | Done |
| 6 | Agent | W4 | compliance | [`features/ai-agent-tools-inline-ui/`](features/ai-agent-tools-inline-ui/) + [`contextual-agent-right-sidebar/`](features/contextual-agent-right-sidebar/) | Done |
| 7 | Forecast Engine | W3 | compliance | [`features/insights-platform/forecast-engine/`](features/insights-platform/forecast-engine/) | Done |
| 8 | Insights platform | W3 | compliance | [`features/insights-platform/`](features/insights-platform/) + children | Done |
| 9 | Stock management | W5 | full | [`features/stock-management/`](features/stock-management/) | Done |
| 10 | Purchasing | W5 | full | [`features/purchasing/`](features/purchasing/) | Done |
| 11 | Invoice automation / Email infra | W2 | compliance | [`features/invoices-module/email-infrastructure/`](features/invoices-module/email-infrastructure/) | Done |
| 12 | Invoices module | W2 | compliance | [`features/invoices-module/`](features/invoices-module/) | Done |
| 13 | Workforce parent | W6 | compliance | [`features/workforce/plan.md`](features/workforce/plan.md) | Done |
| 14 | People + ESO | W6 | full | [`features/workforce/people/`](features/workforce/people/) | Done |
| 15–19 | Roster, Timesheets, Availability, Leave, Payroll, Award | W6 | compliance | `features/workforce/*/` | Done |
| 20 | Operations / Daybook | W7 | full | [`features/operations/daybook/`](features/operations/daybook/) | Done |
| 21 | Settings parent + children | W7 | full + compliance | [`features/settings/`](features/settings/) + permissions | Done |
| — | Flash P&L, Reviews | W8 | stub | defer | Done (stub) |

---

## All Module Overview rows (46)

Parent links use Notion URLs. **App URL (code)** reflects current sidebar/routes where Notion drifts.

### Foundation (W1)

| Name | Notion | App URL (Notion) | App URL (code) | Triad / notes | Audit |
|------|--------|------------------|----------------|---------------|-------|
| Authentication | [link](https://www.notion.so/35064094bde6800280dcd3feb827b30c) | `/auth` | `/auth` | `supersolt-authentication/` | Done |
| Onboarding | [link](https://www.notion.so/35064094bde680d6b29dc1ed7165b412) | `/setup` | `/setup` | `onboarding/` (parent; substeps below) | Done |
| Create Organisation | [link](https://www.notion.so/35064094bde6808093b6c7773a75b38a) | — | — | § in `onboarding/plan.md` | Done |
| Add Venues | [link](https://www.notion.so/35064094bde6808e9e8bf3accd047480) | — | — | § onboarding | Done |
| Connect POS | [link](https://www.notion.so/35064094bde680b1bd80e797465d515d) | — | — | § onboarding + Square | Done |
| Setup Accounting System | [link](https://www.notion.so/35064094bde680b690b9c2e885f6d053) | — | — | § onboarding | Done |
| Invite Team | [link](https://www.notion.so/35064094bde68069a7b2c6c215268d31) | — | — | § onboarding | Done |
| Import Item List from POS | [link](https://www.notion.so/35064094bde680b89474f93fd67f9381) | — | — | § onboarding | Done |
| Create Supplier List | [link](https://www.notion.so/35064094bde6805c811bd75e20127eaf) | — | — | § onboarding | Done |
| Build Recipes | [link](https://www.notion.so/35564094bde68161b051cdefbcc70ee7) | — | — | § onboarding | Done |
| Tenancy & access | *(implied)* | scoped URLs | `/{org}/{venue}/…` | `tenancy-access/` | Done |

### MVP loop (W2–W3)

| Name | Notion | App URL (Notion) | App URL (code) | Triad | Audit |
|------|--------|------------------|----------------|-------|-------|
| Invoices | [link](https://www.notion.so/34f64094bde680879fcdc09007b7ba24) | `…/inventory/invoices` | `…/purchasing/invoices` | `invoices-module/` **Drift** | Done |
| Email Infrastructure | [link](https://www.notion.so/35664094bde68184aa0dc7165c214ce1) | — | cron/API | `invoices-module/email-infrastructure/` | Done |
| Insights (parent) | [link](https://www.notion.so/34f64094bde68000a3f2e21b4bf9480b) | `…/insights/sales` | `…/insights` | `insights-platform/plan.md` | Done |
| Sales | [link](https://www.notion.so/34f64094bde680ba91abdd753390422e) | `…/insights/sales` | same | `insights-platform/sales/` | Done |
| Labour | [link](https://www.notion.so/34f64094bde68049a7b8e8c87db97f1f) | `…/insights/labour` | same | `insights-platform/labour/` | Done |
| Inventory (Insights) | [link](https://www.notion.so/34f64094bde6802697c3e75140af7797) | `…/insights/inventory` | same | `insights-platform/inventory/` | Done |
| P&L (TBC) | [link](https://www.notion.so/34f64094bde680ef9fd5ebc4c05295c8) | `…/insights/p-and-l` | same | `insights-platform/p-and-l/` (Notion blank) | Done |
| Forecast Engine | [link](https://www.notion.so/35664094bde68165a84dfc43022e8bee) | — | `server/` jobs | `insights-platform/forecast-engine/` | Done |

### Parallel surfaces (W4)

| Name | Notion | App URL (code) | Triad | Audit |
|------|--------|----------------|-------|-------|
| Dashboard | [link](https://www.notion.so/34f64094bde6803c8ac5ca001f005d39) | `…/dashboard` | `dashboard/` | Done |
| Agent | [link](https://www.notion.so/34f64094bde68003a437faeae06a6bf5) | `…/agent` + `/agent` | `ai-agent-tools-inline-ui/` | Done |

### Procurement & stock (W5)

| Name | Notion | App URL (Notion) | App URL (code) | Triad | Audit |
|------|--------|------------------|----------------|-------|-------|
| Stock Management | [link](https://www.notion.so/34f64094bde680049607f3783f7df279) | `…/catalog` | `…/stock-management/*` **Drift** | `stock-management/` | Done |
| Stock Counts | [link](https://www.notion.so/34f64094bde6801197f2e8f96cc790a1) | `…/inventory/stock-counts` | `…/stock-management/stock-counts` | § stock-management | Done |
| Waste | [link](https://www.notion.so/34f64094bde680c6a9d7f4e3048fbcf8) | `…/inventory/waste` | `…/stock-management/waste` | § stock-management | Done |
| Purchasing | [link](https://www.notion.so/34f64094bde6807585cbf41829c7b310) | `…/inventory` | `…/purchasing/*` **Drift** | `purchasing/` | Done |
| Suppliers | [link](https://www.notion.so/34f64094bde68055afa7c4a2fc6a5f82) | `…/inventory/suppliers` | `…/purchasing/suppliers` | § purchasing | Done |
| Orders | [link](https://www.notion.so/34f64094bde6801fbc94ef7a90e4be9d) | `…/inventory/order-guide` | `…/purchasing/orders` | § purchasing | Done |

### Workforce (W6)

| Name | Notion | App URL (code) | Triad | Audit |
|------|--------|----------------|-------|-------|
| Workforce | [link](https://www.notion.so/34f64094bde680d0bd7de16209ff9344) | `…/workforce` | `workforce/plan.md` | Done |
| People | [link](https://www.notion.so/34f64094bde6808393eee71ac4e611e8) | `…/workforce/people` | `workforce/people/` | Done |
| Employee Self-Onboarding | [link](https://www.notion.so/36e64094bde68186ab3aef614cd5d3b2) | `/…/onboard/{token}` | route TBD | § `workforce/people/flows.md` | Done |
| Roster | [link](https://www.notion.so/34f64094bde680a2a2f8e7a582110aab) | `…/workforce/roster` | `workforce/roster/` | Done |
| Timesheets | [link](https://www.notion.so/34f64094bde68098a187cddc4c51b467) | `…/workforce/timesheets` | `workforce/timesheets/` | Done |
| Availability | [link](https://www.notion.so/34f64094bde680af8d86f371fdb250b8) | `…/workforce/availability` | `workforce/availability/` | Done |
| Leave | [link](https://www.notion.so/34f64094bde680f8a37cd54ff7106475) | `…/workforce/leave` | `workforce/leave/` | Done |
| Payroll Export | [link](https://www.notion.so/34f64094bde6809fbb84e54ef1bd8269) | `…/workforce/payroll-export` | `workforce/payroll-export/` | Done |
| Award Rate Library | [link](https://www.notion.so/36264094bde681449229f6912d2f6451) | `…/settings/award-rates` | same (scoped) | `workforce/award-rate-library/` | Done |

### Settings & operations (W7)

| Name | Notion | App URL (Notion) | App URL (code) | Triad | Audit |
|------|--------|------------------|----------------|-------|-------|
| Settings | [link](https://www.notion.so/34f64094bde6806db71ef1a5ba1e4dad) | `…/settings` | same | `settings/plan.md` | Done |
| Permissions/User | [link](https://www.notion.so/34f64094bde680d09de7cfcebbafe4b0) | `…/settings/permissions` | same | `settings/permissions/` | Done |
| Organisation | [link](https://www.notion.so/34f64094bde68095abd1e00f4e2f2c68) | `…/settings/organisation` | same | § settings | Done |
| Venues | [link](https://www.notion.so/35564094bde6813fb438ea63af13a89b) | `…/settings/venues` | `…/settings/venues` | § settings | Done |
| Integrations | [link](https://www.notion.so/34f64094bde6808ba8c2d4e8d74ff6a0) | `…/settings/integrations` | same | § settings | Done |
| Recipes (Settings) | [link](https://www.notion.so/34f64094bde680d5a2bec5b34fef0072) | `…/settings/recipes` | `…/settings/recipes` (+ `menu/recipes` rewrite) | § settings | Done |
| Inventory (Settings row) | [link](https://www.notion.so/34f64094bde68041a76ce61f5f234f7d) | `…/catalog/ingredients` | `menu/ingredients` | § settings / catalog | Done |
| Operations | [link](https://www.notion.so/34f64094bde6802fac96c233c2bb484d) | `…/operations` | same | `operations/daybook/` | Done |
| Daybook | [link](https://www.notion.so/34f64094bde68069a07cd3643af202c6) | `…/operations/daybook` | same | `operations/daybook/` | Done |

### Phase 2 — stub only (W8)

| Name | Notion | App URL | Audit |
|------|--------|---------|-------|
| Flash P&L (Phase 2) | [link](https://www.notion.so/36b64094bde681ac9beae33d4117af1e) | `…/insights/flash-pnl` | Stub — no v1 triad |
| Reviews (Phase 2) | [link](https://www.notion.so/36b64094bde6814d9579e4b1e0be09c5) | `…/operations/reviews` | Stub — no v1 triad |

---

## URL drift register (resolve in code or redirects)

| Notion pattern | Code today | Resolution |
|----------------|------------|------------|
| `…/inventory/invoices`, `suppliers`, `order-guide` | `…/purchasing/*` | **Code is canonical** for v1; update Notion App URLs when PM syncs; agent nav catalog must use `purchasing/*` |
| `…/catalog` (Stock parent) | `…/stock-management/*` + catalog/menu rewrites | Document in `stock-management/plan.md`; optional redirects from legacy `inventory/stock-counts` |
| `…/settings/recipes` | `settings/recipes` in sidebar | Align with Notion; keep `menu/recipes` rewrite if needed |
| `/settings/award-rates` (unscoped in Notion) | `/{org}/{venue}/settings/award-rates` | Mapping uses scoped URL |

---

## Conflicts (human review if implementation diverges)

| Topic | Notion | Repo today | Default |
|-------|--------|------------|---------|
| Onboarding UX | Agent-owned `/setup`, blurred sidebar | [`setup-wizard-client.tsx`](../app/(main)/setup/_components/setup-wizard-client.tsx) wizard | **Toward Notion** — track gaps in `onboarding/plan.md` |
| Purchasing parent URL | `…/inventory` | `…/purchasing` | **Code canonical** until Notion updated |
| P&L Insights | Full module TBC | Scaffold route | Block logic until Notion body exists |

---

## Related docs

- Sync skill: [`.cursor/skills/sync-notion-module-overview/`](../../.cursor/skills/sync-notion-module-overview/)
- Mapping: [`mapping.md`](../../.cursor/skills/sync-notion-module-overview/mapping.md)
- Manual QA: [`production-readiness-checklist.md`](production-readiness-checklist.md) · [`launch-test-checklist.md`](launch-test-checklist.md)
- Roadmap: [`roadmap.md`](roadmap.md)
