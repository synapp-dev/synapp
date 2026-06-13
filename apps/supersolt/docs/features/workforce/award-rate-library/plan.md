# Award Rate Library

> **Product:** `apps/supersolt`
> **Slug:** `workforce/award-rate-library`
> **Parent:** [`../plan.md`](../plan.md)
> **Route:** `/{organisation}/{venue}/settings/award-rates`
> **Status:** Implemented (MVP)
> **Owner:** TBD
> **Created:** 2026-05-31
> **Updated:** 2026-05-31

## 1. Summary

Award Rate Library is the canonical source of truth for AU Fair Work modern award data inside Supersolt. It loads hospitality-relevant awards as **versioned rule-packs** (classifications, minimum rates, penalty schedules, minimum engagement rules) stamped with FWC PR reference and effective date. Every payroll calculation, roster shift cost, Wage Theft pre-flight check (s327A FW Act), and casual-conversion eligibility determination reads from this library.

This is **infrastructure**, not a traditional operator module. Operators interact indirectly through People, Roster, and Payroll Export, and directly through **Settings → Award Rates** (read-only rate cards, org config, annual AWR uplift workflow).

**Personas:** Owner / Area Manager (`grantsOrgAdmin`) — view rates, run AWR uplift, configure org defaults; Venue Manager / Staff — no direct access; Agent — read-only for explanations and contract classification suggestions; Aaron (developer) — loads FWC variations via migrations + `library_update_log`.

**Notion:** [Award Rate Library (Module Overview)](https://www.notion.so/36264094bde681449229f6912d2f6451)

**Current code (to remove / replace):**

| Area | Location | Fate |
|------|----------|------|
| Phase 1 roster costing stub | `server/workforce/roster-cost.service.ts` | **Replace** — delegate to `server/workforce/award/award-calculation.service.ts` |
| Inline minimum rate map | `server/workforce/payroll-export/payroll-calculation.ts` (`AWARD_MINIMUM_RATE_CENTS`) | **Remove** — call `awardService.getMinimumRate()` |
| Planned interim penalty table | `payroll_penalty_rate_config` in [`payroll-export/plan.md`](../payroll-export/plan.md) | **Do not create** — superseded by global `penalty_rates` |
| Settings UI | None | New tab + `entities/workforce/award-rate-library/` |
| Schema | None | Full Notion data model (§4) |

## 2. Scope

### In scope (MVP — grill-me Option A)

- Platform-global DDL for all Notion tables (§4); seed **MA000119** + **MA000009** (AWR 2025 baseline, effective 1 July 2025)
- Award-pluggable order-of-operations pipeline: base → casual loading → highest applicable penalty (Sat/Sun/PH) → MA000119/009 evening **flat-dollar** loadings → split base vs penalty
- Internal read API (`server/workforce/award/`): `getMinimumRate`, `getPenaltyMultiplier`, `getCurrentClassifications`, `computeShiftCost`, `isJuniorLiquorServiceOverrideAvailable`
- **Atomic consumer migration:** Roster + Payroll Export call award engine in same release; stub fallbacks removed (fail hard)
- Settings → Award Rates: dedicated tab, read-only rate cards per award, org config panel, AWR uplift preview + selective bulk apply
- Capabilities: `canViewAwardRates`, `canManageAwardConfig`, `canApplyAwrUplift` (`grantsOrgAdmin`)
- `employee_pay_rate_history` + AWR apply path (People service when live; direct profile update until then)
- Telemetry: redacted operator events (`award-telemetry.ts`)
- Golden JSON fixtures + integration + contract tests per [`tdd.md`](tdd.md)

### Out of scope (deferred — Notion decision log)

- MA000003 (Fast Food) + MA000020 (Clubs) data load — schema-ready, seed when first customer arrives
- Junior rate scale **data** + liquor-service override application in calculation
- Minimum engagement **Roster integration** (data model seeded; Roster calls when wired)
- Allowances surfacing in Payroll Export (MVP-light table; empty seed)
- Configurable rate-card editing UI (read-only display only)
- Full EBA / IFA modelling beyond org + per-employee override flags
- FWC PR feed auto-integration (Aaron manual migration in MVP)
- Awards 5–9 (Wine, Retail, Amusement, Live Performance, Hair & Beauty)

### Non-goals

- Promoting to `packages/*` before a second app consumer ([ARCHITECTURE.md §5.1](../../../../ARCHITECTURE.md))
- Operator API writes to platform-global rate rows (migrations / admin scripts only)
- Agent editing library data
- Feature-flag fallback to Phase 1 stub rates (compliance risk)

## Notion specification

### Cross-cutting decisions (locked)

- **Two live rule-packs in MVP:** MA000119 Restaurant + MA000009 Hospitality
- **Versioning:** FWC PR reference + `effective_from` / `effective_until`; historical rates preserved indefinitely
- **Effective-date-aware queries:** every read specifies `as_of_date` (shift date for payroll; pay-period midpoint for Wage Theft pre-flight)
- **Award-pluggable architecture:** each award is a self-contained rule-pack; pipeline is award-agnostic
- **Cross-award traps:** Fast Food differs in base rates, evening mechanics (% vs flat $), Sunday tiering — never share penalty tables across awards
- **Casual loading:** 25% default per award (`casual_loading_pct`)
- **Wage Theft:** `getMinimumRate` is canonical for below-award detection
- **AWR uplift:** annual operator action (~June); selective bulk apply with audit + `awr_uplift_events`
- **Source attribution:** PR reference + fairwork.gov.au URL visible in UI

### Internal service contract (consumers)

| Consumer | Function | Notes |
|----------|----------|-------|
| Roster | `computeShiftCost({ awardCode, classificationLevel, classificationGrade, employmentType, shiftBounds, timezone, hourlyRateCents?, asOfDate })` | Returns `{ computedCostCents, baseCostCents, penaltyCostCents, paidHours, appliedRules[], awardCode }`; throws `AwardServiceError` on gap |
| Payroll Export | `getMinimumRate({ awardCode, classificationLevel, classificationGrade, employmentType, age, asOfDate })` | Pre-flight Wage Theft hard block |
| Payroll Export | Penalty schedule via `computeShiftCost` per timesheet line | Same pipeline as Roster |
| People (future) | `getCurrentClassifications(awardCode)` | Populate classification dropdown |
| Agent | Read-only wrappers on above | Never mutates library |

### Other modules this touches

[People](https://www.notion.so/34f64094bde6808393eee71ac4e611e8), [`Roster`](../roster/plan.md), [`Payroll Export`](../payroll-export/plan.md), Settings → Organisation, Insights → Labour (downstream), [Agent](https://www.notion.so/34f64094bde68003a437faeae06a6bf5), [Forecast Engine](../../insights-platform/forecast-engine/plan.md) (Phase 2 P2.6 compliance bundle).

## Open questions

### Product (Notion lean — locked)

- Award auto-detection from venue type — Phase 2; operator selects manually in MVP
- Multi-award per employee — out of MVP
- Apprentice / trainee rates — data model only; surfacing Phase 2

### Engineering

- [ ] **`employee_pay_rate_history` ownership** — created in this migration; People triad may absorb UI for history viewer (owner: eng, due: People sprint)
- [ ] **AWR CTA seasonality** — enable preview when new rate version exists with `effective_from` in target AWR year, not calendar-gated only (owner: product, due: UI polish)
- [ ] **High-income threshold cents** — seed FY26 $175,000 in `organisation_award_config`; Aaron updates annually (owner: Aaron, due: before go-live)

## Decision log

- *16 May 2026 (Notion)* — Library locked as infrastructure peer to Forecast Engine; two awards MVP; rule-pack architecture; AWR workflow; Wage Theft integration.
- *25 May 2026 (Notion)* — MA000003 rate-verified; cross-award traps documented; Fast Food moved to “ready to load”.
- *31 May 2026 (grill-me)* — Full engine slice (A); platform-global tables (A); service-first API (A); Settings tab + entities (A); all in app (A); grantsOrgAdmin auth (B); fail-hard errors (A); selective AWR apply (A); redacted telemetry (A); golden tests + integration (A); atomic rollout (A).

## 3. Architecture placement

| Decision | Choice | ARCHITECTURE.md |
|----------|--------|-----------------|
| Lives in app | `apps/supersolt` only | §3.2, §5.1 |
| Calculation engine | `server/workforce/award/` (`award.service.ts`, `award-calculation.service.ts`, `award.repo.ts`, `award-policy.ts`, `award-errors.ts`, `award-telemetry.ts`, `awr-uplift.service.ts`) | §7.1 |
| Auth capabilities | `server/auth/capabilities.ts` — `canViewAwardRates`, `canManageAwardConfig`, `canApplyAwrUplift` | §3.2 |
| Client | `entities/workforce/award-rate-library/`; thin `settings/award-rates/page.tsx` | §7.1 |
| Settings shell | Tab in `settings-layout-client.tsx` | §7.1 |
| API | Org-scoped route handlers (§5); internal TypeScript for roster/payroll | §8.1 |
| Auth | `requireRequestAuth` + capability checks; Drizzle RLS per `AGENTS.md` | §3.2, §8.1 |
| UI primitives | `@workspace/ui` | §6, §7.1 |
| New package edges | None | §3.2 |

## 4. Data model

### Enums

```sql
CREATE TYPE public.penalty_uplift_type AS ENUM ('percentage', 'dollar_per_hour');
CREATE TYPE public.penalty_employment_scope AS ENUM ('ft_pt', 'casual', 'all');
CREATE TYPE public.penalty_day_type AS ENUM (
  'mon_fri', 'saturday', 'sunday', 'public_holiday'
);
CREATE TYPE public.awr_uplift_row_action AS ENUM ('auto_uplift', 'skip', 'manual_review');
CREATE TYPE public.library_update_type AS ENUM ('annual_awr', 'fwc_variation', 'correction');
CREATE TYPE public.pay_rate_change_reason AS ENUM (
  'hire', 'manual_adjustment', 'award_uplift', 'awr_percentage_uplift', 'correction'
);
```

> Reuse existing `public.employment_type` enum (`full_time`, `part_time`, `casual`) on `award_rates` and `minimum_engagements` — do not introduce a duplicate enum.

### Platform-global tables (no `organisation_id`)

```sql
CREATE TABLE public.awards (
  award_code text PRIMARY KEY, -- MA000009, MA000119, ...
  award_name text NOT NULL,
  award_short_name text NOT NULL,
  current_version_pr_reference text NOT NULL,
  effective_from date NOT NULL,
  effective_until date,
  source_url text NOT NULL,
  casual_loading_pct numeric(5,3) NOT NULL DEFAULT 25.000,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.award_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  classification_level text NOT NULL,
  classification_grade text NOT NULL DEFAULT '',
  display_order smallint NOT NULL DEFAULT 0,
  description text NOT NULL,
  is_junior_eligible boolean NOT NULL DEFAULT true,
  is_liquor_service_eligible boolean NOT NULL DEFAULT false,
  notes text,
  UNIQUE (award_code, classification_level, classification_grade)
);

CREATE TABLE public.award_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  classification_level text NOT NULL,
  classification_grade text NOT NULL DEFAULT '',
  employment_type public.employment_type NOT NULL,
  age_bracket smallint, -- null = adult; 16–20 for junior scales (Phase 2 data)
  base_hourly_cents integer NOT NULL,
  casual_loaded_hourly_cents integer NOT NULL,
  weekly_minimum_cents integer,
  effective_from date NOT NULL,
  effective_until date,
  source_pr_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX award_rates_lookup_idx ON public.award_rates (
  award_code, classification_level, classification_grade, employment_type, effective_from DESC
);

CREATE TABLE public.penalty_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  classification_level text, -- null = all levels
  employment_type_scope public.penalty_employment_scope NOT NULL DEFAULT 'all',
  day_type public.penalty_day_type NOT NULL,
  time_start time NOT NULL DEFAULT '00:00',
  time_end time NOT NULL DEFAULT '24:00',
  is_overtime boolean NOT NULL DEFAULT false,
  uplift_type public.penalty_uplift_type NOT NULL,
  uplift_value numeric(10,4) NOT NULL,
  applies_after_ordinary_hours boolean NOT NULL DEFAULT false,
  effective_from date NOT NULL,
  effective_until date,
  notes text
);

CREATE TABLE public.junior_rate_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  classification_level text,
  age smallint NOT NULL CHECK (age BETWEEN 16 AND 20),
  percentage_of_adult numeric(5,2) NOT NULL,
  effective_from date NOT NULL,
  effective_until date
);

CREATE TABLE public.minimum_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  employment_type public.employment_type NOT NULL,
  day_type text NOT NULL DEFAULT 'regular', -- regular | public_holiday
  minimum_hours numeric(4,2) NOT NULL,
  notes text
);

CREATE TABLE public.award_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text NOT NULL REFERENCES public.awards (award_code) ON DELETE CASCADE,
  allowance_code text NOT NULL,
  description text NOT NULL,
  amount_cents integer NOT NULL,
  unit text NOT NULL, -- per_shift | per_hour | per_week | per_occurrence
  conditions text,
  effective_from date NOT NULL,
  effective_until date,
  source_pr_reference text
);

CREATE TABLE public.library_update_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_code text REFERENCES public.awards (award_code),
  update_type public.library_update_type NOT NULL,
  affected_record_count integer NOT NULL DEFAULT 0,
  source_reference text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
```

### Org-scoped tables

```sql
CREATE TABLE public.organisation_award_config (
  organisation_id uuid PRIMARY KEY REFERENCES public.organisations (id) ON DELETE CASCADE,
  default_award_code text REFERENCES public.awards (award_code),
  is_eba_covered boolean NOT NULL DEFAULT false,
  casual_loading_pct_override numeric(5,3),
  annualised_salary_buffer_pct numeric(5,3) NOT NULL DEFAULT 25.000,
  above_award_high_income_threshold_cents bigint,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.awr_uplift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  award_code text NOT NULL REFERENCES public.awards (award_code),
  awr_year smallint NOT NULL,
  effective_date date NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  affected_employee_count integer NOT NULL DEFAULT 0,
  skipped_employee_count integer NOT NULL DEFAULT 0,
  total_uplift_cents bigint,
  source_pr_reference text NOT NULL,
  notes text
);

CREATE TABLE public.employee_pay_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  pay_rate_cents integer NOT NULL,
  effective_from date NOT NULL,
  effective_until date,
  reason_category public.pay_rate_change_reason NOT NULL,
  source_reference text,
  created_by_user_id uuid REFERENCES public.user_profiles (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX employee_pay_rate_history_lookup_idx
  ON public.employee_pay_rate_history (organisation_id, user_profile_id, effective_from DESC);
```

> **People triad:** When People ships, AWR apply prefers `peopleService.updatePayRate()`; until then, service updates `employee_payroll_profiles.pay_rate_cents` + inserts history row.

### RLS

| Table | SELECT | INSERT | UPDATE |
|-------|--------|--------|--------|
| `awards`, `award_classifications`, `award_rates`, `penalty_rates`, `junior_rate_scales`, `minimum_engagements`, `award_allowances`, `library_update_log` | `authenticated` | — (migration only) | — |
| `organisation_award_config` | org member | service + org admin capability | org admin capability |
| `awr_uplift_events` | org member | service (AWR apply) | — |
| `employee_pay_rate_history` | org member (self or admin) | service (AWR / People) | — |

Platform-global tables: enable RLS with SELECT-only policy for `authenticated`. No INSERT/UPDATE policies — writes via `ctx.appDb.admin` in migration scripts only.

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/20260601170000_award_rate_library.sql` (+ seed data in same file or `20260601170100_award_rate_library_seed_ma000119_ma000009.sql`)
- **Depends on:** `employment_type` enum from People/payroll migrations; `employee_payroll_profiles` exists
- **Pattern:** App-owned §8.1
- **Seed:** MA000119 + MA000009 classifications, adult rates, penalty rows (Sat/Sun/PH + evening flat-dollar), minimum engagements; `library_update_log` row for initial load
- **Apply:** `user-supabase-supersolt-mvp` MCP `apply_migration`; then `pnpm drizzle:pull`; `get_advisors` after DDL

### Generated types

Regenerate `apps/supersolt/drizzle/schema.ts` after migration applies.

## 5. API surface

Base org: `/api/organisations/[organisation]/award-rates`

| Operation | Method | Path | Auth | Notes |
|-----------|--------|------|------|-------|
| List awards + org config | GET | `…/award-rates` | `canViewAwardRates` | Awards in org use + config |
| Rate card detail | GET | `…/award-rates/[awardCode]?asOf=YYYY-MM-DD` | `canViewAwardRates` | Classifications, rates, penalties, PR ref |
| Update org config | PUT | `…/award-rates/config` | `canManageAwardConfig` | default award, EBA flag, casual override |
| AWR preview | GET | `…/award-rates/awr-uplift/preview?effectiveDate=&awrYear=` | `canApplyAwrUplift` | Per-employee suggested action |
| AWR apply | POST | `…/award-rates/awr-uplift/apply` | `canApplyAwrUplift` | Body: `{ effectiveDate, awrYear, rows: [{ userProfileId, action, applyPercentageUplift? }] }` |

### Response envelope

```json
{ "data": T, "error": null }
{ "data": null, "error": { "message": "…", "status": 422, "code": "rate_not_effective" } }
```

### Validation

- **Zod:** `entities/workforce/award-rate-library/schemas.ts`
- **Errors:** `AwardServiceError` + `AwardErrorCode` → [`flows.md`](flows.md) §2

### Internal (not HTTP)

| Export | Module |
|--------|--------|
| `awardCalculationService.computeShiftCost` | `server/workforce/award/award-calculation.service.ts` |
| `awardService.getMinimumRate` | `server/workforce/award/award.service.ts` |
| `awardService.getCurrentClassifications` | same |
| `awrUpliftService.preview` / `apply` | `server/workforce/award/awr-uplift.service.ts` |

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/settings/
│   ├── award-rates/page.tsx              # Thin shell
│   └── _components/settings-layout-client.tsx  # + Award rates tab
├── app/api/organisations/[organisation]/award-rates/
│   ├── route.ts
│   ├── config/route.ts
│   ├── [awardCode]/route.ts
│   └── awr-uplift/preview/route.ts
│   └── awr-uplift/apply/route.ts
├── entities/workforce/award-rate-library/
│   ├── components/
│   │   ├── award-rates-page-client.tsx
│   │   ├── award-rate-card.tsx
│   │   ├── org-award-config-form.tsx
│   │   └── awr-uplift-sheet.tsx
│   ├── hooks/use-award-rates.ts
│   ├── api/endpoints.ts
│   └── schemas.ts
└── server/workforce/award/
    ├── award.service.ts
    ├── award-calculation.service.ts
    ├── award.repo.ts
    ├── award-policy.ts
    ├── award-errors.ts
    ├── award-telemetry.ts
    └── awr-uplift.service.ts
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Table, Card, Sheet, Badge | `@workspace/ui` | Reuse |
| Rate card grids | `entities/workforce/award-rate-library/components/` | Read-only MVP |
| Settings tab gate | `canViewAwardRates` (extends layout beyond owner-only Organisation tab) | grantsOrgAdmin |

## 7. Dependencies

### Existing packages

- `@workspace/ui` — layout, tables, forms, sheets
- Drizzle + Supabase Auth per `AGENTS.md`

### Upstream / downstream

| Module | Relationship |
|--------|--------------|
| [`Roster`](../roster/plan.md) | **Consumer** — `computeShiftCost`; update in same release |
| [`Payroll Export`](../payroll-export/plan.md) | **Consumer** — `getMinimumRate`, penalty via `computeShiftCost` |
| People (TBD) | Classification dropdown + preferred pay-rate history writer |
| Agent | Read-only |

### New external deps

None.

### New package edges

None.

## 8. Implementation order (commits)

Atomic release — library + consumer migration ship together.

1. `docs(supersolt): plan workforce award-rate-library triad` — this folder + parent link
2. `feat(supersolt): award rate library migration + seed` — DDL, RLS, MA000119/009 seed
3. `test(supersolt): red award calculation unit tests` — golden fixtures per [`tdd.md`](tdd.md)
4. `feat(supersolt): award engine services` — calculation pipeline green
5. `test(supersolt): award library integration + RLS` — global read, org config write
6. `feat(supersolt): award rates API routes` — org-scoped handlers
7. `feat(supersolt): wire roster and payroll to award engine` — remove stubs
8. `feat(supersolt): award rates settings UI` — tab + entities
9. `feat(supersolt): awr uplift workflow` — preview + selective apply
10. `chore(supersolt): award capabilities + telemetry` — capabilities.ts + award-telemetry.ts
11. `test(supersolt): award rates e2e` — Settings happy path
12. `docs(supersolt): mark award-rate-library specced` — flip status in parent plan

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `award_rates.viewed` | Settings mount | `{ organisation_id, awards_in_scope[] }` | no-op tracker |
| `award_rates.rate_card_viewed` | Open award detail | `{ organisation_id, award_code }` | no-op tracker |
| `award_rates.config_updated` | Config save | `{ organisation_id, fields_changed[] }` | no-op tracker |
| `award_rates.awr_preview` | Preview load | `{ organisation_id, awr_year, employee_count, auto_uplift_count, skip_count, manual_review_count }` | no-op tracker |
| `award_rates.awr_applied` | Apply success | `{ organisation_id, awr_year, applied_count, skipped_count, source_pr_reference }` | no-op tracker |
| `award_rates.failed` | API 4xx/5xx | `{ organisation_id, operation, code }` | no-op tracker |

Engine lookup failures → structured server logs only (not product analytics).

**Destination:** `server/workforce/award-telemetry.ts` no-op `track()` until analytics pipeline exists.

## 10. Rollout

- **Feature flag:** none — atomic cutover with Roster/Payroll consumer updates
- **Env vars:** none
- **Migration sequencing:** apply migration → `drizzle:pull` → deploy app with stub removal in same window
- **Backout:** if migration not applied, redeploy previous app; if migration applied, forward-only (do not drop tables without export)
- **Aaron mid-year variations:** new named migration + `library_update_log` row; no operator action unless employee rate falls below new minimum

**Supabase MCP:** `user-supabase-supersolt-mvp` — `apply_migration`, `list_migrations`, `get_advisors` after DDL.

## 11. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Parent: [`../plan.md`](../plan.md)
- Roster consumer: [`../roster/plan.md`](../roster/plan.md)
- Payroll consumer: [`../payroll-export/plan.md`](../payroll-export/plan.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)

## Compliance audit (program 2026-06-01)

Route `…/settings/award-rates` matches scoped sidebar. **Done.**

**Updated:** 2026-06-01
- Agent notes: [AGENTS.md](../../../AGENTS.md)
