# Payroll Export

> **Product:** `apps/supersolt`
> **Slug:** `workforce/payroll-export`
> **Parent:** [`../plan.md`](../plan.md)
> **Route:** `/{organisation}/{venue}/workforce/payroll-export`
> **Status:** Planned
> **Owner:** TBD
> **Created:** 2026-05-31
> **Updated:** 2026-05-31

## 1. Summary

Payroll Export is where approved hours become money. Under the **hybrid Xero pattern** locked 16 May 2026, the operator drives the entire pay run from inside Supersolt with a single **Approve and pay** action. Supersolt pushes the draft pay run to Xero, Xero finalises it, pays staff, generates payslips, lodges STP with the ATO, and schedules super. The operator sees status updates in Supersolt without opening Xero.

The module is the final, highest-stakes step of the workforce lifecycle: overpayment is expensive; underpayment is illegal; mis-calculated super or PAYG triggers ATO penalties; intentional underpayment is a criminal offence under s327A FW Act from 1 January 2025.

**Personas:** Owner / Area Manager (final approver, **Approve and pay**, FDV line visibility); Venue Manager (prepare, review, edit with reason, send for approval); Staff (no access — payslips via Xero in Phase 2).

**Notion:** [Payroll Export (Module Overview)](https://www.notion.so/34f64094bde6809fbb84e54ef1bd8269)

**Current code (to remove / replace):**

| Area | Location | Fate |
|------|----------|------|
| Demo UI + seed data | `app/(main)/…/workforce/payroll-export/_components/payroll-export-page-client.tsx` | **Delete**; replace with `entities/workforce/payroll-export/` |
| Staging tables | `payroll_timesheet_lines`, `payroll_leave_lines` | **Consume**; link to `pay_runs` on reconcile |
| Timesheet lock FK | `timesheets.locked_in_payroll_export_id` (nullable UUID, no FK) | **Add FK** → `pay_runs.id` in payroll migration |
| Xero integration | `server/xero/` (invoice/accounting scopes only) | **Extend** with `server/xero/payroll/` + payroll OAuth scopes |
| API | None | Full org-scoped route surface (§5) |

## 2. Scope

### In scope (MVP — Notion Compliance Floor A)

- Pay period management — auto-roll per org-configured frequency (weekly / fortnightly / monthly); consume existing `pay_periods`
- **Wage calculation engine** (self-contained in `server/workforce/payroll-export/`): hours × pay rate snapshot + MA000009/MA000119 penalty defaults + paid leave + termination payouts (incl. VIC LSL pro-rata)
- Casual loading 25% transparency; junior rate by DOB; super at 12% OTE; PAYG per ATO tables × tax treatment code; Payday Super-aware payload to Xero
- **Pre-pay-run readiness check** — hard blocks: TFN, super fund + member number, bank, tax treatment code, classification + grade, pay rate ≥ award minimum (Wage Theft s327A); soft warnings: cert expired, missing classification
- Payroll preview: per-employee breakdown + org totals; line-item edits with mandatory reason + audit
- **Owner approval gate**; **send back** → status `returned_for_revision` with notes
- **Approve and pay** — confirmation modal; atomic Xero push + `PayRun.Finalise`; never auto-executes; Agent blocked
- **Status pipeline:** `draft` → `pending_owner_approval` → `returned_for_revision` (loop) → `approved` → `sent_to_xero` → `finalised_in_xero` → `paid` → `payslips_issued` → `stp_lodged` → `super_scheduled` → `super_paid` → `reconciled` (+ transient `xero_push_pending` on failure)
- Xero push recovery: inline retry + cron backoff + Owner **Retry push**; frozen calculation snapshot
- FDV leave pay slip suppression (Reg 3.46(1)(g)); FDV line items Owner-only read
- Termination final pay + STP2 cessation reason; correction pay run workflow (post-finalisation)
- Period locking: included timesheets → `locked` + `locked_in_payroll_export_id`
- CSV + PDF pay run export for Owner records
- Permission gating + dedicated capabilities (§3)
- Empty states (no approved timesheets, no Xero, no payroll subscription, incomplete People profiles)
- Telemetry: `payroll.*` catalog, strict redaction (§9)

### Out of scope (Phase 2)

- Variance-vs-prior-period flagging; anomaly alerts (Insights → Labour)
- Bulk approve in manager review; cancel-and-restart draft pay run
- Junior liquor service adult-rate override (MA000119 cl 13.5)
- Full AU award interpreter (P2.6); direct STP lodgement from Supersolt
- In-app payslip viewing; salary sacrifice; pre-tax deductions; allowances; bonuses
- Annual leave loading 17.5%; workers' comp; multi-currency; BAS/PAYG forecasting (P2.6/P2.7)
- KeyPay / MYOB manual export paths (demo-only; removed with demo UI)

### Non-goals

- Replacing Xero as payment / STP / super lodgement source ([parent workforce plan](../plan.md))
- Owning People payroll profile DDL ([People](https://www.notion.so/34f64094bde6808393eee71ac4e611e8) triad prerequisite)
- Promoting to `packages/*` before a second app consumer ([ARCHITECTURE.md §5.1](../../../../ARCHITECTURE.md))
- Shared `server/workforce/award/` spine in MVP — penalty/min-rate logic lives in payroll-export module for now (Award Rate Library read dependency documented below)

## Notion specification

### User flows (locked)

See [`flows.md`](flows.md) §1 for step tables. Summary: prepare → pre-flight → calculate → manager review → send for approval → Owner approve or return → **Approve and pay** → Xero webhook milestones → reconciled + timesheets locked.

### Intended functionality

**Calculation snapshot:** All inputs frozen at preparation time (`calculation_snapshot` JSON on pay run). Re-runs and Xero retries reuse snapshot — no silent recalc after approval.

**Wage Theft override:** Owner-only with documented exemption category (annualised salary / EBA / IFA) + audit reason; flagged for review.

**Agent:** May prepare, surface blockers, draft commentary. **Never** executes **Approve and pay**. Cannot read FDV line items.

### Permission gating

| Role | Prepare / edit | Send for approval | Owner approve | Approve and pay | FDV lines |
|------|----------------|-------------------|---------------|-----------------|-----------|
| Owner / Area Manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| Venue Manager | ✓ | ✓ | ✗ | ✗ | ✗ |
| Staff | ✗ | ✗ | ✗ | ✗ | ✗ |

Enforced via `server/auth/capabilities.ts` (§3) + service layer; RLS is org-member baseline.

### People data contract (prerequisite — not owned here)

Payroll Export **reads** via `server/workforce/people.service.ts` (People triad). Minimum fields for pre-flight:

| Field | Pre-flight |
|-------|------------|
| TFN | Hard block if missing |
| Super fund USI + member number | Hard block |
| BSB + account name + account number | Hard block |
| Tax treatment code (6-char STP2) | Hard block |
| STP2 income type | Hard block |
| Award classification + grade | Soft warn; hard for award employees |
| Pay rate (+ history for mid-period changes) | Hard block if below award minimum |
| DOB (junior rates) | Required for junior scale |
| Employment type, cessation reason (termination) | Termination flows |
| FDV pay slip label preference | FDV suppression |

### Other modules this touches

[Timesheets](../timesheets/plan.md) (staging lines, lock), [Leave](../leave/plan.md) (`payroll_leave_lines`, FDV), [People](https://www.notion.so/34f64094bde6808393eee71ac4e611e8), [Award Rate Library](https://www.notion.so/36264094bde681449229f6912d2f6451) (minimum rates + penalty schedules — read-only until library triad ships), Settings → Organisation / Integrations, Setup Accounting System, [Agent](https://www.notion.so/34f64094bde68003a437faeae06a6bf5), Notifications (events only), Insights → Labour / P&L (downstream).

## Open questions

### Product (Notion lean — locked)

- Bank file generation — Xero handles in MVP
- Direct STP — Xero lodges in MVP
- PAYG variations — capture on People; apply in calculation
- Multiple pay rates per employee — primary rate in MVP
- Single pay period per org in MVP

### Engineering

- [ ] **Award Rate Library timing** — Wage Theft check needs minimum rates; until library triad ships, seed MA000009/MA000119 defaults in `payroll_penalty_rate_config` + inline minimum table in payroll-export (owner: eng, due: before payroll merge)
- [ ] **Org Xero tenant for payroll** — resolve from `organisation_payroll_settings.primary_venue_id` → `venue_xero_connections` vs future org-level connection (owner: eng, due: sprint 1)
- [ ] **Xero payroll OAuth scopes** — extend authorize flow vs re-consent banner when accounting connection exists without payroll scopes (owner: eng, due: before Approve and pay)

## Decision log

- *16 May 2026 (Notion)* — Hybrid Xero pattern; Compliance Floor A MVP cut; confirmation gating always; Wage Theft hard block; FDV suppression; VIC LSL pro-rata; status pipeline through reconciled.
- *31 May 2026 (grill-me)* — Full Notion A (no phased Xero); People prerequisite; org-scoped API; entities UI; calc self-contained in `payroll-export/`; dedicated capabilities; Xero retry inline+cron+manual; `returned_for_revision` status; telemetry redacted; mock+golden Xero tests; no feature flag rollout.

## 3. Architecture placement

| Decision | Choice | ARCHITECTURE.md |
|----------|--------|-----------------|
| Lives in app | `apps/supersolt` only | §3.2, §5.1 |
| Calculation + orchestration | `server/workforce/payroll-export/` (`payroll-calculation.service.ts`, `payroll-preflight.service.ts`, `payroll.service.ts`, `payroll.repo.ts`, `payroll-policy.ts`, `payroll-errors.ts`, `payroll-telemetry.ts`) | §7.1 |
| Xero client | `server/xero/payroll/` (PayRun API, webhook verify, payload mappers) | §7.1 |
| Auth capabilities | `server/auth/capabilities.ts` — `canPreparePayrollRun`, `canApprovePayrollRun`, `canExecutePayrollPayment`, `canViewFdvPayrollLines` | §3.2 |
| Client | `entities/workforce/payroll-export/`; thin `page.tsx` | §7.1 |
| Org settings UI | `settings/organisation/payroll/` (penalty config, super rate, primary Xero venue) | §7.1 |
| Cron | `app/api/cron/payroll-xero-retry/route.ts`, `app/api/cron/payroll-webhook-stale/route.ts` | §8.1 |
| Webhook | `app/api/webhooks/xero/payroll/route.ts` | §8.1 |
| API | Org-scoped route handlers (§5) | §8.1 |
| Auth | `requireRequestAuth` + capability checks; Supabase Auth only on server (`AGENTS.md`) | §3.2, §8.1 |
| UI primitives | `@workspace/ui` | §6, §7.1 |
| New package edges | None | §3.2 |

### Capability mapping (initial)

| Capability | Maps to |
|------------|---------|
| `canPreparePayrollRun` | Venue manager+ (`owner`, `admin`, `manager`, `supervisor` at org or any venue) |
| `canApprovePayrollRun` | `grantsOrgAdmin` |
| `canExecutePayrollPayment` | `grantsOrgAdmin` |
| `canViewFdvPayrollLines` | `grantsOrgAdmin` |

## 4. Data model

### Enums

```sql
CREATE TYPE payroll_run_status AS ENUM (
  'draft',
  'returned_for_revision',
  'pending_owner_approval',
  'approved',
  'xero_push_pending',
  'sent_to_xero',
  'finalised_in_xero',
  'paid',
  'payslips_issued',
  'stp_lodged',
  'super_scheduled',
  'super_paid',
  'reconciled'
);

CREATE TYPE payroll_preflight_severity AS ENUM ('hard_block', 'soft_warning');

CREATE TYPE payroll_override_category AS ENUM (
  'payg_correction',
  'allowance',
  'termination_etp',
  'wage_theft_exemption',
  'other'
);
```

### `pay_runs`

```sql
CREATE TABLE public.pay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  pay_period_id uuid NOT NULL REFERENCES public.pay_periods (id) ON DELETE RESTRICT,
  frequency pay_period_frequency NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date NOT NULL,
  status payroll_run_status NOT NULL DEFAULT 'draft',
  total_gross_cents bigint NOT NULL DEFAULT 0,
  total_super_cents bigint NOT NULL DEFAULT 0,
  total_payg_cents bigint NOT NULL DEFAULT 0,
  total_net_cents bigint NOT NULL DEFAULT 0,
  employee_count integer NOT NULL DEFAULT 0,
  calculation_snapshot jsonb,
  calculation_version integer NOT NULL DEFAULT 1,
  prepared_by uuid REFERENCES public.user_profiles (id),
  prepared_at timestamptz,
  submitted_for_approval_at timestamptz,
  owner_return_notes text,
  returned_at timestamptz,
  returned_by uuid REFERENCES public.user_profiles (id),
  approved_by uuid REFERENCES public.user_profiles (id),
  approved_at timestamptz,
  xero_tenant_id text,
  xero_pay_run_id text,
  xero_push_attempted_at timestamptz,
  xero_push_retry_count integer NOT NULL DEFAULT 0,
  xero_finalised_at timestamptz,
  paid_at timestamptz,
  payslips_issued_at timestamptz,
  stp_lodged_at timestamptz,
  super_scheduled_at timestamptz,
  super_paid_at timestamptz,
  reconciled_at timestamptz,
  is_correction_run boolean NOT NULL DEFAULT false,
  corrects_pay_run_id uuid REFERENCES public.pay_runs (id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, pay_period_id, is_correction_run)
    -- one primary run per period; correction runs exempt via partial index below
);
CREATE UNIQUE INDEX pay_runs_one_primary_per_period_idx
  ON public.pay_runs (organisation_id, pay_period_id)
  WHERE is_correction_run = false;
```

### `pay_run_line_items`

```sql
CREATE TABLE public.pay_run_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid NOT NULL REFERENCES public.pay_runs (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id),
  hours_total numeric(8,2) NOT NULL DEFAULT 0,
  hours_breakdown jsonb NOT NULL DEFAULT '{}',
  gross_cents bigint NOT NULL DEFAULT 0,
  super_cents bigint NOT NULL DEFAULT 0,
  payg_cents bigint NOT NULL DEFAULT 0,
  net_cents bigint NOT NULL DEFAULT 0,
  pay_rate_snapshot_cents integer,
  award_classification_snapshot text,
  tax_treatment_code_snapshot text,
  stp2_income_type_snapshot text,
  super_fund_snapshot jsonb,
  bank_snapshot jsonb,
  is_termination boolean NOT NULL DEFAULT false,
  cessation_reason_code text,
  termination_payout_breakdown jsonb,
  has_overrides boolean NOT NULL DEFAULT false,
  override_reason text,
  override_category payroll_override_category,
  has_fdv_leave boolean NOT NULL DEFAULT false,
  fdv_payslip_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pay_run_id, user_profile_id)
);
```

### Audit / ops logs

```sql
CREATE TABLE public.payroll_preflight_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid NOT NULL REFERENCES public.pay_runs (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid NOT NULL REFERENCES public.user_profiles (id),
  results jsonb NOT NULL,
  hard_block_count integer NOT NULL DEFAULT 0,
  soft_warning_count integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL
);

CREATE TABLE public.payroll_calculation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid NOT NULL REFERENCES public.pay_runs (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  ran_at timestamptz NOT NULL DEFAULT now(),
  ran_by uuid NOT NULL REFERENCES public.user_profiles (id),
  input_snapshot jsonb NOT NULL,
  output_snapshot jsonb NOT NULL,
  duration_ms integer
);

CREATE TABLE public.payroll_xero_push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid NOT NULL REFERENCES public.pay_runs (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  attempt_number integer NOT NULL,
  payload_digest text NOT NULL,
  response_status integer,
  response_body jsonb,
  success boolean NOT NULL,
  error_code text
);

CREATE TABLE public.payroll_xero_webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  pay_run_id uuid REFERENCES public.pay_runs (id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processing_error text
);

CREATE TABLE public.payroll_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  pay_run_id uuid NOT NULL REFERENCES public.pay_runs (id) ON DELETE CASCADE,
  line_item_id uuid REFERENCES public.pay_run_line_items (id) ON DELETE SET NULL,
  change_type text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  reason text,
  reason_category payroll_override_category,
  actor_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Config tables

```sql
CREATE TABLE public.payroll_penalty_rate_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  award_code text NOT NULL, -- MA000009 | MA000119
  day_of_week smallint, -- 0=Sun … 6=Sat; null if PH flag
  time_start time,
  time_end time,
  is_public_holiday boolean NOT NULL DEFAULT false,
  casual_uplift_pct numeric(6,3),
  permanent_uplift_pct numeric(6,3),
  evening_loading_cents integer,
  early_morning_loading_cents integer,
  effective_from date NOT NULL,
  effective_until date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organisation_payroll_settings (
  organisation_id uuid PRIMARY KEY REFERENCES public.organisations (id) ON DELETE CASCADE,
  super_rate_pct numeric(5,3) NOT NULL DEFAULT 12.000,
  super_rate_effective_from date NOT NULL DEFAULT '2025-07-01',
  primary_xero_venue_id uuid REFERENCES public.venues (id),
  default_payday_offset_days smallint NOT NULL DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### FK additions (Timesheets contract)

```sql
ALTER TABLE public.timesheets
  ADD CONSTRAINT timesheets_locked_in_payroll_export_id_fkey
  FOREIGN KEY (locked_in_payroll_export_id) REFERENCES public.pay_runs (id);

ALTER TABLE public.pay_periods
  ADD CONSTRAINT pay_periods_payroll_export_id_fkey
  FOREIGN KEY (payroll_export_id) REFERENCES public.pay_runs (id);

ALTER TABLE public.payroll_timesheet_lines
  ADD COLUMN IF NOT EXISTS pay_run_id uuid REFERENCES public.pay_runs (id);

ALTER TABLE public.payroll_leave_lines
  ADD COLUMN IF NOT EXISTS pay_run_id uuid REFERENCES public.pay_runs (id);
```

### RLS (summary)

| Table | SELECT | INSERT | UPDATE |
|-------|--------|--------|--------|
| `pay_runs` | org member with prepare capability | prepare capability | status transitions via service |
| `pay_run_line_items` | org member; FDV fields stripped unless `canViewFdvPayrollLines` | service on calculate | prepare capability while draft/returned |
| `payroll_preflight_checks` | org admin + prepare | service | — |
| `payroll_*_log` | org admin | service / webhook | service |
| `payroll_penalty_rate_config` | org member | org admin | org admin |
| `organisation_payroll_settings` | org member | org admin | org admin |

Service layer enforces status transitions and Owner-only payment execution regardless of broad RLS insert policies.

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/20260601160000_payroll_export_notion_model.sql`
- **Depends on:** `20260601150000_timesheets_notion_model.sql`, `20260601140000_leave_notion_model.sql`, People migration (TBD — **blocking**)
- **Pattern:** App-owned §8.1
- **Backfill:** Seed `payroll_penalty_rate_config` MA000009/MA000119 defaults per org; seed `organisation_payroll_settings` from existing org rows
- **Apply:** `user-supabase-supersolt-mvp` MCP `apply_migration`; then `pnpm drizzle:pull`

## 5. API surface

Base org: `/api/organisations/[organisation]/workforce/payroll-export`

| Operation | Method | Path | Auth | Notes |
|-----------|--------|------|------|-------|
| List pay periods + runs | GET | `…/pay-periods?limit=` | prepare+ | Closed periods with run status |
| Get pay run | GET | `…/runs/[payRunId]` | prepare+ | Summary + line items; FDV gated |
| Prepare | POST | `…/runs/prepare` | prepare+ | Body: `payPeriodId`; creates draft or resumes |
| Pre-flight | POST | `…/runs/[payRunId]/preflight` | prepare+ | Persists check log; returns blockers |
| Calculate | POST | `…/runs/[payRunId]/calculate` | prepare+ | Runs engine; freezes snapshot |
| Update line override | PATCH | `…/runs/[payRunId]/lines/[lineId]` | prepare+ | Mandatory reason + category |
| Send for approval | POST | `…/runs/[payRunId]/submit` | prepare+ | → `pending_owner_approval` |
| Owner return | POST | `…/runs/[payRunId]/return` | approve+ | Body: `notes` → `returned_for_revision` |
| Owner approve | POST | `…/runs/[payRunId]/approve` | approve+ | → `approved` |
| Approve and pay | POST | `…/runs/[payRunId]/execute` | execute+ | Confirmation token in body; Xero push |
| Retry Xero push | POST | `…/runs/[payRunId]/retry-xero` | execute+ | Same snapshot; re-confirms |
| Export CSV | GET | `…/runs/[payRunId]/export.csv` | approve+ | Per-employee detail |
| Export PDF | GET | `…/runs/[payRunId]/export.pdf` | approve+ | Summary for Owner records |
| Correction run | POST | `…/runs/[payRunId]/correction` | approve+ | Body: affected employees + amounts |

Org settings: `/api/organisations/[organisation]/payroll-settings`

| Operation | Method | Path | Auth |
|-----------|--------|------|------|
| Get settings | GET | `…/payroll-settings` | org member |
| Update settings | PUT | `…/payroll-settings` | org admin |
| Penalty config | GET/PUT | `…/payroll-settings/penalty-rates` | org admin |

Webhook (unsigned verify via Xero signature):

| Operation | Method | Path | Auth |
|-----------|--------|------|------|
| Xero payroll events | POST | `/api/webhooks/xero/payroll` | HMAC |

Internal (not HTTP):

| Consumer | Function |
|----------|----------|
| Timesheets | `payrollTimesheetLines` staged on approve; locked on reconcile |
| Leave | `payrollLeaveLines` consumed in calculate |
| People | `peopleService.getPayrollProfile(userProfileId)` |
| Cron retry | `payrollXeroService.retryPendingPushes(adminDb)` |
| Cron stale | Mark `sent_to_xero` → `xero_push_pending` if no webhook within SLA |

### Response envelope

`{ data, error: { message, status, code } }` — same as Timesheets/Leave.

### Validation

- **Zod:** `entities/workforce/payroll-export/schemas.ts`
- **Errors:** `PayrollServiceError` + `PayrollErrorCode` → [`flows.md`](flows.md) §2

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/workforce/payroll-export/
│   └── page.tsx
├── app/(main)/[organisation]/[venue]/settings/organisation/payroll/
│   └── page.tsx
├── app/api/organisations/[organisation]/workforce/payroll-export/
│   ├── pay-periods/route.ts
│   └── runs/
│       ├── prepare/route.ts
│       └── [payRunId]/
│           ├── route.ts
│           ├── preflight/route.ts
│           ├── calculate/route.ts
│           ├── submit/route.ts
│           ├── return/route.ts
│           ├── approve/route.ts
│           ├── execute/route.ts
│           ├── retry-xero/route.ts
│           ├── export.csv/route.ts
│           ├── export.pdf/route.ts
│           ├── correction/route.ts
│           └── lines/[lineId]/route.ts
├── app/api/webhooks/xero/payroll/route.ts
├── app/api/cron/payroll-xero-retry/route.ts
├── entities/workforce/payroll-export/
│   ├── components/
│   │   ├── payroll-export-page.tsx           # role switch: manager vs owner
│   │   ├── payroll-period-list.tsx
│   │   ├── payroll-preflight-panel.tsx
│   │   ├── payroll-summary-card.tsx
│   │   ├── payroll-employee-table.tsx
│   │   ├── payroll-employee-detail-sheet.tsx
│   │   ├── payroll-line-override-dialog.tsx
│   │   ├── payroll-status-stepper.tsx
│   │   ├── payroll-approve-and-pay-dialog.tsx
│   │   ├── payroll-owner-return-dialog.tsx
│   │   ├── payroll-empty-states.tsx
│   │   └── payroll-settings-form.tsx
│   ├── hooks/
│   │   ├── use-pay-periods.ts
│   │   ├── use-pay-run.ts
│   │   └── use-payroll-mutation.ts
│   ├── api/endpoints.ts
│   └── schemas.ts
└── server/workforce/payroll-export/
    ├── payroll.service.ts
    ├── payroll-calculation.service.ts
    ├── payroll-preflight.service.ts
    ├── payroll-policy.ts
    ├── payroll.repo.ts
    ├── payroll-errors.ts
    └── payroll-telemetry.ts
└── server/xero/payroll/
    ├── xero-payroll-client.ts
    ├── xero-payroll-mapper.ts
    └── xero-payroll-webhook.ts
```

### Codebase changes (explicit)

| File | Change |
|------|--------|
| `payroll-export-page-client.tsx` | **Delete** after entity page wired |
| `server/xero/config.ts` | Add payroll OAuth scopes (separate constant; re-consent flow) |
| `server/auth/capabilities.ts` | Add four payroll capabilities |
| `../plan.md` | Mark payroll-export **specced** |
| `mapping.md` | Add Payroll Export row |

## 7. Dependencies

### Hard prerequisites (implementation order)

1. **[People](https://www.notion.so/34f64094bde6808393eee71ac4e611e8)** triad — payroll profile DDL + service contract
2. **[Timesheets](../timesheets/plan.md)** — approved entries + staging lines
3. **[Leave](../leave/plan.md)** — paid leave + FDV flags in staging
4. **Award Rate Library** (minimum rates) — or seeded penalty config fallback (§Open questions)
5. **Xero payroll OAuth** — scopes + PayRun API client

### Existing packages used

- `@workspace/ui` — Table, Card, Sheet, Dialog, Badge, Stepper patterns
- `@/lib/api/route-auth`, `@/server/db/drizzle` — auth + RLS (`AGENTS.md`)
- `@/server/workforce/timesheet.repo.ts`, `leave.repo.ts` — staging line reads

### New external deps

- None required (PAYG tables ship as JSON/SQL seed in app; PDF via existing pattern or `@react-pdf/renderer` if already in monorepo — evaluate at implementation)

### New package edges

- None

## 8. Implementation order (commits)

1. `docs(supersolt): plan workforce/payroll-export feature` — this triad + parent/mapping updates.
2. `feat(supersolt): add payroll export migration + types` — DDL, RLS, drizzle pull, penalty seed script.
3. `test(supersolt): red tests for payroll calculation + preflight` — from [`tdd.md`](tdd.md).
4. `feat(supersolt): payroll repo + calculation + preflight services` — green unit tests.
5. `feat(supersolt): payroll export org API — prepare/calculate/review` — manager path.
6. `feat(supersolt): owner approval + returned_for_revision flow` — status transitions.
7. `feat(supersolt): xero payroll client + mapper + golden fixtures` — mocked integration tests green.
8. `feat(supersolt): approve-and-pay + webhook + retry crons` — Xero path green.
9. `feat(supersolt): replace demo payroll UI` — delete seed client.
10. `feat(supersolt): org payroll settings UI` — penalty + super + primary Xero venue.
11. `feat(supersolt): csv/pdf export + correction pay run` — reporting flows.
12. `chore(supersolt): payroll telemetry + capabilities` — `payroll-telemetry.ts`.
13. `test(supersolt): payroll e2e happy path` — prepare → approve → pay (mocked Xero) → lock timesheets.

## 9. Telemetry

| Event | Trigger | Payload (production) | Destination |
|-------|---------|----------------------|-------------|
| `payroll.viewed` | Page mount | `{ organisationId, payPeriodId?, role }` | no-op tracker |
| `payroll.prepared` | Prepare success | `{ organisationId, payRunId, payPeriodId }` | no-op tracker |
| `payroll.preflight_blocked` | Hard blocks | `{ payRunId, hardBlockCount, errorCodes[] }` | no-op tracker |
| `payroll.calculated` | Calculate success | `{ payRunId, employeeCount, totalGrossCents }` | no-op tracker |
| `payroll.submitted_for_approval` | Manager submit | `{ payRunId }` | no-op tracker |
| `payroll.returned_by_owner` | Owner return | `{ payRunId }` | no-op tracker |
| `payroll.approved` | Owner approve | `{ payRunId, approvedBy }` | no-op tracker |
| `payroll.xero_push_started` | Execute | `{ payRunId, attemptNumber }` | no-op tracker |
| `payroll.xero_push_failed` | Push error | `{ payRunId, errorCode, attemptNumber }` | no-op tracker |
| `payroll.reconciled` | Final status | `{ payRunId, employeeCount }` | no-op tracker |
| `payroll.forbidden` | 403 | `{ payRunId?, action }` | no-op tracker |
| `payroll.failed` | 5xx | `{ payRunId?, code }` | no-op tracker |

**Never emit:** employee names, TFN, bank, super account, FDV flags, per-employee rates in production. Dev-only `console.debug` may include per-employee breakdown when `NODE_ENV === "development"`.

## 10. Rollout

- **Feature flag:** none — nav visible; Notion empty states when prerequisites missing; **Approve and pay** disabled until Xero payroll connection + subscription verified.
- **Env vars:** extend `xero.env.example` — `XERO_PAYROLL_WEBHOOK_KEY`; document payroll scopes in `server/xero/config.ts`; `CRON_SECRET` for retry crons (existing).
- **Migration sequencing:** apply payroll migration after People + Timesheets + Leave migrations; forward-only.
- **Backout:** disable execute endpoint via connection check if Xero payroll broken; pay run rows remain for audit; no DDL rollback. Timesheet unlock requires manual support script (avoid — forward fix via correction run).

## 11. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Parent: [`../plan.md`](../plan.md)
- Timesheets contract: [`../timesheets/plan.md`](../timesheets/plan.md)
- Leave contract: [`../leave/plan.md`](../leave/plan.md)
- Architecture: [ARCHITECTURE.md](../../../../ARCHITECTURE.md)

## Compliance audit (program 2026-06-01)

Notion Compliance Floor A specced; People triad prerequisite noted. **Done.**

**Updated:** 2026-06-01
