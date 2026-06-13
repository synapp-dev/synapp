# Module Overview → plan.md mapping

Resolve **repo plan path** as:

`apps/supersolt/docs/features/<slug>/plan.md`

`<slug>` may include nested segments (e.g. `insights-platform/sales`).

## Resolution order

1. **Explicit table** below (wins).
2. **Existing file:** glob `apps/supersolt/docs/features/**/plan.md` and match by Notion URL already linked in the file.
3. **App URL heuristic:** strip `/{organisation}/{venue}` prefix, map path segments to folder (see heuristics).
4. **Name heuristic:** kebab-case **Name**, prefer existing folder over new `supersolt-*` names from roadmap suggestions.

If still ambiguous, list as **unmappable** in the sync report — do not guess.

## Explicit mappings

| Notion Name | Notion page (short id) | App URL (Notion) | App URL (code) | Repo slug / plan path |
|-------------|------------------------|------------------|----------------|------------------------|
| Authentication | `35064094bde6800280dcd3feb827b30c` | `/auth` | `/auth` | `supersolt-authentication/plan.md` |
| Onboarding | `35064094bde680d6b29dc1ed7165b412` | `/setup` | `/setup` | [`onboarding/plan.md`](../../../apps/supersolt/docs/features/onboarding/plan.md) |
| Dashboard | `34f64094bde6803c8ac5ca001f005d39` | `/dashboard` | `/{org}/{venue}/dashboard` | `dashboard/plan.md` |
| Agent | `34f64094bde68003a437faeae06a6bf5` | `/agent` | `/agent` + `/{org}/{venue}/agent` | `ai-agent-tools-inline-ui/plan.md` (primary); `contextual-agent-right-sidebar/plan.md` (sidebar slice) |
| Forecast Engine | `35664094bde68165a84dfc43022e8bee` | *(empty)* | `server/` jobs | `insights-platform/forecast-engine/plan.md` |
| Insights (parent) | `34f64094bde68000a3f2e21b4bf9480b` | `…/insights/sales` *(parent)* | `…/insights` | `insights-platform/plan.md` |
| Sales | `34f64094bde680ba91abdd753390422e` | `…/insights/sales` | same | `insights-platform/sales/plan.md` |
| Labour | `34f64094bde68049a7b8e8c87db97f1f` | `…/insights/labour` | same | `insights-platform/labour/plan.md` |
| Inventory (Insights) | `34f64094bde6802697c3e75140af7797` | `…/insights/inventory` | same | `insights-platform/inventory/plan.md` |
| P&L (TBC) | `34f64094bde680ef9fd5ebc4c05295c8` | `…/insights/p-and-l` | same | `insights-platform/p-and-l/plan.md` |
| Flash P&L (Phase 2) | `36b64094bde681ac9beae33d4117af1e` | `…/insights/flash-pnl` | same | *stub only* — program index W8 |
| Stock Management | `34f64094bde680049607f3783f7df279` | `…/catalog` | `…/stock-management/*` | `stock-management/plan.md` |
| Stock Counts | `34f64094bde6801197f2e8f96cc790a1` | `…/inventory/stock-counts` | `…/stock-management/stock-counts` | [`stock-management/stock-counts/plan.md`](../../../apps/supersolt/docs/features/stock-management/stock-counts/plan.md) |
| Waste | `34f64094bde680c6a9d7f4e3048fbcf8` | `…/inventory/waste` | `…/stock-management/waste` | § `stock-management/plan.md` |
| Purchasing | `34f64094bde6807585cbf41829c7b310` | `…/inventory` | `…/purchasing/*` | `purchasing/plan.md` |
| Suppliers | `34f64094bde68055afa7c4a2fc6a5f82` | `…/inventory/suppliers` | `…/purchasing/suppliers` | § `purchasing/plan.md` |
| Orders | `34f64094bde6801fbc94ef7a90e4be9d` | `…/inventory/order-guide` | `…/purchasing/orders` | § `purchasing/plan.md` |
| Invoices | `34f64094bde680879fcdc09007b7ba24` | `…/inventory/invoices` | `…/purchasing/invoices` | `invoices-module/plan.md` |
| Email Infrastructure | `35664094bde68184aa0dc7165c214ce1` | *(empty)* | cron/API | `invoices-module/email-infrastructure/plan.md` |
| Workforce | `34f64094bde680d0bd7de16209ff9344` | `…/workforce` | same | `workforce/plan.md` |
| People | `34f64094bde6808393eee71ac4e611e8` | `…/workforce/people` | same | `workforce/people/plan.md` |
| Employee Self-Onboarding | `36e64094bde68186ab3aef614cd5d3b2` | `/…/onboard/{token}` | TBD route | § `workforce/people/flows.md` |
| Roster | `34f64094bde680a2a2f8e7a582110aab` | `…/workforce/roster` | same | `workforce/roster/plan.md` |
| Timesheets | `34f64094bde68098a187cddc4c51b467` | `…/workforce/timesheets` | same | `workforce/timesheets/plan.md` |
| Leave | `34f64094bde680f8a37cd54ff7106475` | `…/workforce/leave` | same | `workforce/leave/plan.md` |
| Award Rate Library | `36264094bde681449229f6912d2f6451` | `/settings/award-rates` | `…/settings/award-rates` | `workforce/award-rate-library/plan.md` |
| Payroll Export | `34f64094bde6809fbb84e54ef1bd8269` | `…/workforce/payroll-export` | same | `workforce/payroll-export/plan.md` |
| Availability | `34f64094bde680af8d86f371fdb250b8` | `…/workforce/availability` | same | `workforce/availability/plan.md` |
| Operations | `34f64094bde6802fac96c233c2bb484d` | `…/operations` | same | `operations/daybook/plan.md` (parent orchestration) |
| Daybook | `34f64094bde68069a07cd3643af202c6` | `…/operations/daybook` | same | `operations/daybook/plan.md` |
| Reviews (Phase 2) | `36b64094bde6814d9579e4b1e0be09c5` | `…/operations/reviews` | same | *stub only* |
| Settings | `34f64094bde6806db71ef1a5ba1e4dad` | `…/settings` | same | `settings/plan.md` |
| Permissions/User | `34f64094bde680d09de7cfcebbafe4b0` | `…/settings/permissions` | same | `settings/permissions/plan.md` |
| Organisation | `34f64094bde68095abd1e00f4e2f2c68` | `…/settings/organisation` | same | § `settings/plan.md` |
| Venues | `35564094bde6813fb438ea63af13a89b` | `…/settings/venues` | same | § `settings/plan.md` |
| Integrations | `34f64094bde6808ba8c2d4e8d74ff6a0` | `…/settings/integrations` | same | § `settings/plan.md` |
| Recipes | `34f64094bde680d5a2bec5b34fef0072` | `…/settings/recipes` | same (+ `menu/recipes` rewrite) | § `settings/plan.md` |
| Inventory (Settings) | `34f64094bde68041a76ce61f5f234f7d` | `…/catalog/ingredients` | `menu/ingredients` | § `settings/plan.md` |
| Tenancy & access | *(implied)* | scoped URLs | `/{org}/{venue}/…` | `tenancy-access/plan.md` |

### Onboarding substeps — sections in parent plan

Create Organisation, Add Venues, Connect POS, Setup Accounting System, Invite Team, Import Item List from POS, Create Supplier List, Build Recipes — sections in [`onboarding/plan.md`](../../../apps/supersolt/docs/features/onboarding/plan.md); no standalone triads unless product splits them later.

## App URL heuristics

| App URL pattern | Slug folder |
|-----------------|-------------|
| `/…/insights/sales` | `insights-platform/sales` |
| `/…/insights/labour` | `insights-platform/labour` |
| `/…/insights/inventory` | `insights-platform/inventory` |
| `/…/insights/p-and-l` | `insights-platform/p-and-l` |
| `/…/purchasing/invoices` | `invoices-module` |
| `/…/purchasing/suppliers` | § `purchasing/plan.md` |
| `/…/purchasing/orders` | § `purchasing/plan.md` |
| `/…/stock-management/stock-counts` | § `stock-management/plan.md` |
| `/…/stock-management/waste` | § `stock-management/plan.md` |
| `/…/workforce/people` | `workforce/people` |
| `/…/workforce/roster` | `workforce/roster` |
| `/…/settings/award-rates` | `workforce/award-rate-library` |
| `/…/settings/permissions` | `settings/permissions` |
| `/…/workforce/timesheets` | `workforce/timesheets` |
| `/…/workforce/payroll-export` | `workforce/payroll-export` |
| `/…/workforce` | `workforce` |
| `/…/operations/daybook` | `operations/daybook` |
| `/dashboard` | `dashboard` |
| `/auth` | `supersolt-authentication` |
| `/setup` | `onboarding` |

## Name → slug (fallback)

- Lowercase, spaces → hyphens, strip trailing punctuation.
- Prefer **existing** folder names over roadmap `supersolt-*` suggestions when both exist (`dashboard` not `supersolt-dashboard`).

## Maintaining this file

When a new `docs/features/<slug>/plan.md` is added via build-feature, add a row here with the Notion page URL from Module Overview.
