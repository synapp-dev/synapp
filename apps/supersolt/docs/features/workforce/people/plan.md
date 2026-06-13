# People (workforce)

> **Product:** `apps/supersolt`  
> **Slug:** `workforce/people`  
> **Parent:** [`../plan.md`](../plan.md)  
> **Route:** `/{organisation}/{venue}/workforce/people` (venue slug = nav filter, not data boundary)  
> **Status:** In progress  
> **Owner:** TBD  
> **Created:** 2026-06-01  
> **Updated:** 2026-06-01

## 1. Summary

People is the employee record system for Supersolt: personal details, employment terms, pay rates, certifications, sensitive payroll fields (TFN, super, bank), and VIC + AU federal compliance metadata. Every Workforce sub-module (Availability, Leave, Roster, Timesheets, Payroll Export) reads from this layer.

This MVP targets **Compliance Floor A** — operators can meet VIC + AU employment obligations through Supersolt; Xero remains the hybrid back-end for payment, STP, and super. Sensitive fields are visible only to the **employee** and the **Owner** (`grants_org_admin`); Area Managers and Venue Managers see non-sensitive employment data only.

**Personas:** Owner (full setup, sensitive, terminate, Xero import, AWR uplift); Venue Manager (non-sensitive edits, certs, team list); Staff (own record, self-service sensitive, contact updates).

**Notion:** [People](https://www.notion.so/34f64094bde6808393eee71ac4e611e8) · [Employee Self-Onboarding](https://www.notion.so/36e64094bde68186ab3aef614cd5d3b2) · [Workforce parent](https://www.notion.so/34f64094bde680d0bd7de16209ff9344)

**Canonical identity:** `(organisation_id, user_profile_id)` — not a separate `employees` table. Notion `employee_id` → `user_organisations.id` in APIs and audit.

**Current code (replace):** route-colocated `people-page-client.tsx` + `GET …/venues/[venue]/people`; extend [`employee_payroll_profiles`](../../../../supabase/migrations/20260601160000_payroll_export_notion_model.sql) (Payroll Export migration; People owns CRUD).

## 2. Scope

### In scope (MVP — VIC compliance floor)

Aligned to Notion **In scope (MVP — VIC compliance floor)** (16 May 2026 cut):

- Employee list (search, filter, archive) with compliance strip and status counters
- Add / edit / archive — **manual entry** (7-step wizard, local draft until submit) and **Xero import** (initial bulk + ongoing field-level sync)
- Personal: legal/preferred name, DOB, contact, emergency contact, residential address (JSON)
- Employment: start date, **continuous service start**, end date, employment type (casual / PT / FT / fixed-term / annualised), award + classification + grade + history, position(s), venue assignments, probation dates, employment status (active / on-leave / parental / terminated / archived)
- Pay rate: hourly or annualised, history with effective date + reason category, award minimum **warn** with mandatory override reason, junior rate (DOB-derived), AWR bulk uplift workflow (Owner-triggered preview)
- Position taxonomy: 11 defaults per venue (existing `positions` seed); custom positions inline on add form
- Certifications: RSA, FSS, RSG, First Aid, WWCC, operator-defined — issue/expiry/number/authority/document
- Sensitive (gated): TFN + status, super USI/ABN/member, BSB/account, visa subclass + country code + expiry + VEVO fields, tax treatment code, STP2 income type — **TFN encrypted at rest**
- Stapled fund check status + date; FWIS / CEIS / fixed-term statement issuance dates
- Casual conversion eligibility flag (6m / 12m); VIC LSL accrual display + 7-year flag + termination pro-rata stub
- Document storage (employment contract, ID, work rights, TFN dec, super choice, certs, termination letter)
- Termination workflow: STP2 cessation reason, final-pay calculator stub (annual unused, VIC LSL pro-rata ≥7y)
- Auto-paired `user_profiles` + invite on create; deactivate (not delete) user on terminate
- Permission-gated views; audit trail (7-year retention); tamper-evident sensitive changes
- Empty states; bulk CSV import; **Employee self-onboarding** token flow
- Agent: **zero read** of sensitive values; presence-only hints allowed

### Out of scope (Phase 2+)

Per Notion: document upload + AI extraction; FWIS/CEIS generation/email workflow; Employee Choice 21-day formal workflow; VEVO recheck cadence + notifications; per-employee Right to Disconnect; junior liquor adult-rate override (MA000119 cl 13.5); anti-discrimination model-card feature; performance management; recruitment; EBA custom rules; full LMS; multi-org shared identity; profile photos; salary packaging; pre-tax deductions in Supersolt; background checks; visa renewal workflow; non-VIC LSL calculators; dedicated org-wide position management UI (inline custom positions only in MVP).

### Non-goals

- Payroll **calculation** and pay run execution ([`payroll-export/`](../payroll-export/plan.md))
- Platform **permissions / invites** UI ([`settings/permissions/`](../../settings/permissions/plan.md)) — deep-link into People for employment fields
- Promoting to `packages/*` before a second app consumer ([ARCHITECTURE.md §5.1](../../../../../../ARCHITECTURE.md))
- App-to-app imports ([ARCHITECTURE.md §3.1](../../../../../../ARCHITECTURE.md))

## Notion specification

### User flows (locked)

1. Add employee — manual 7-step wizard; final submit creates org membership + profile + invite.
2. Import from Xero — initial bulk; rows flagged `needs_supersolt_detail` until award/venue/certs completed.
3. Ongoing Xero sync — field-domain conflict rules (Xero canonical: super, TFN, bank, tax codes; Supersolt canonical: position, venue, award, certs, FWIS/CEIS, VEVO, FDV flags).
4. Self-onboarding — secure token link; employee completes sensitive fields; Owner approve-before-Xero-push (Option A).
5. Edit pay rate — effective date, history, award minimum warn + override.
6. AWR bulk uplift — Owner preview in June, effective 1 July.
7. Certifications — expiry 90/30/7 flags; roster warn (hard block P2.6).
8. Casual conversion flag — daily job surfaces 6m/12m eligibility.
9. Terminate — cessation code, final-pay stub, preserve record 7y, deactivate user.
10. VIC LSL pro-rata on termination ≥7y continuous service.
11. Bulk CSV — preview + row errors.
12. Staff self-edit contact; sensitive self-edit; manager blocked on sensitive.
13. VEVO at hire — incomplete flag; roster block until complete.
14. Manager sensitive read-block UI copy per Notion flow 13.

### Intended functionality (summary)

- **List:** CTAs Add / Import Xero; filters (status, position, venue, employment type, cert, compliance); compliance strip.
- **Detail tabs:** Personal, Employment, Sensitive (gated), Certifications, Documents, Compliance, Leave summary (read Leave module), History (audit).
- **Pay rate layers:** position default → award minimum floor → per-employee override.
- **Xero hybrid:** new hires in Supersolt first; import for migration; daily sync log + “managed in Supersolt” field locks.

### Data + integrations (Notion entities → repo mapping)

| Notion entity | Repo mapping |
|---------------|----------------|
| `employees` | `user_organisations` + `user_profiles` + employment extension columns |
| `employees_sensitive` | `employee_payroll_profiles` (expanded) + RLS Owner/self |
| `pay_rate_history` | `employee_pay_rate_history` |
| `positions` | `positions` (venue-scoped; 11 defaults seeded) |
| `certifications` | `employee_certifications` |
| `employee_documents` | `employee_documents` |
| `employee_audit_log` | `employee_audit_log` |
| `xero_employee_sync_log` | `xero_employee_sync_log` |

### Other modules this touches

[Onboarding](../../onboarding/plan.md), [Settings → Permissions](../../settings/permissions/plan.md), [Settings → Organisation](../../settings/plan.md), [Settings → Venues](../../settings/plan.md), [Settings → Integrations](../../settings/plan.md), [Award Rate Library](../award-rate-library/plan.md), [Availability](../availability/plan.md), [Leave](../leave/plan.md), [Roster](../roster/plan.md), [Timesheets](../timesheets/plan.md), [Payroll Export](../payroll-export/plan.md), [Agent](../../ai-agent-tools-inline-ui/plan.md), Email / Notifications (events only), Insights → Labour (Phase 2).

## 3. Architecture placement

| Decision | Choice | ARCHITECTURE.md |
|----------|--------|-----------------|
| Lives in app | `apps/supersolt` only | §3.2, §5.1 |
| Domain | `entities/workforce/people/` + `server/workforce/people.*` | §7.1 |
| Shell | `app/(main)/…/workforce/people/` thin `page.tsx` only | §7.1 |
| Data access | Drizzle + RLS via `ctx.appDb.rls`; repos take `RlsTx` | AGENTS.md |
| Auth session | `@workspace/supabase` for Auth only; routes use `requireRequestAuth` | §3.2, AGENTS.md |
| ESO | Token route outside session; `people-onboard.service.ts` + hashed token table | §3.2 |
| New package edges | None | §3.2 |

## 4. Data model

### Identity and keys

- **Employee key:** `(organisation_id, user_profile_id)`.
- **API path key:** `userOrganisationId` (`user_organisations.id`) for REST segments; resolve to profile id in service.
- **Every employee is a platform user:** `user_profiles.id` = auth `users.id` on create.

### Enums

```sql
CREATE TYPE employee_employment_status AS ENUM (
  'active',
  'on_leave',
  'on_parental_leave',
  'terminated',
  'archived'
);

CREATE TYPE employee_tfn_status AS ENUM (
  'provided',
  'pending',
  'under_18_low_earnings',
  'no_tfn_withholding'
);

CREATE TYPE stapled_check_status AS ENUM (
  'not_required',
  'pending',
  'checked',
  'default_fund_used'
);

CREATE TYPE pay_rate_reason_category AS ENUM (
  'annual_review',
  'award_uplift',
  'promotion',
  'market_correction',
  'other'
);

CREATE TYPE employee_document_type AS ENUM (
  'employment_contract',
  'photo_id',
  'work_rights',
  'tfn_declaration',
  'super_choice',
  'certification',
  'termination_letter',
  'other'
);

CREATE TYPE xero_sync_direction AS ENUM (
  'xero_to_supersolt',
  'supersolt_to_xero'
);
```

### Extend `user_profiles`

```sql
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS residential_address jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contact jsonb;
```

### Extend `user_organisations` (employment)

```sql
ALTER TABLE public.user_organisations
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS continuous_service_start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS employment_status employee_employment_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS probation_start_date date,
  ADD COLUMN IF NOT EXISTS probation_end_date date,
  ADD COLUMN IF NOT EXISTS weekly_hours_commitment numeric(4,1),
  ADD COLUMN IF NOT EXISTS pay_rate_cents integer,
  ADD COLUMN IF NOT EXISTS pay_rate_period text NOT NULL DEFAULT 'hourly', -- hourly | annual
  ADD COLUMN IF NOT EXISTS award_code text,
  ADD COLUMN IF NOT EXISTS classification_level text,
  ADD COLUMN IF NOT EXISTS classification_grade text,
  ADD COLUMN IF NOT EXISTS classification_history jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS secondary_position_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS xero_employee_id text,
  ADD COLUMN IF NOT EXISTS needs_supersolt_detail boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fwis_issued_date date,
  ADD COLUMN IF NOT EXISTS ceis_issued_date date,
  ADD COLUMN IF NOT EXISTS fixed_term_statement_issued_date date,
  ADD COLUMN IF NOT EXISTS casual_conversion_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS casual_conversion_eligible_at date,
  ADD COLUMN IF NOT EXISTS lsl_eligible_at date,
  ADD COLUMN IF NOT EXISTS lsl_balance_weeks numeric(8,2),
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS terminated_at timestamptz;
```

### Expand `employee_payroll_profiles` (sensitive + payroll)

```sql
ALTER TABLE public.employee_payroll_profiles
  ADD COLUMN IF NOT EXISTS tfn_status employee_tfn_status,
  ADD COLUMN IF NOT EXISTS super_fund_abn text,
  ADD COLUMN IF NOT EXISTS super_fund_name text,
  ADD COLUMN IF NOT EXISTS super_choice_form_date date,
  ADD COLUMN IF NOT EXISTS stapled_check_status stapled_check_status,
  ADD COLUMN IF NOT EXISTS stapled_check_date date,
  ADD COLUMN IF NOT EXISTS stapled_check_performed_by uuid REFERENCES public.user_profiles (id),
  ADD COLUMN IF NOT EXISTS visa_subclass text,
  ADD COLUMN IF NOT EXISTS country_code char(2),
  ADD COLUMN IF NOT EXISTS visa_expiry date,
  ADD COLUMN IF NOT EXISTS last_vevo_check_date date,
  ADD COLUMN IF NOT EXISTS vevo_reference text,
  ADD COLUMN IF NOT EXISTS is_bridging_visa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS xero_managed_fields jsonb NOT NULL DEFAULT '{}'; -- field -> true = block Xero overwrite

-- TFN: store encrypted via pgcrypto or app-layer envelope; document in migration comment.
-- DROP permissive org-member SELECT policies from payroll migration; replace with Owner+self (below).
```

### `employee_pay_rate_history`

```sql
CREATE TABLE public.employee_pay_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  old_rate_cents integer,
  new_rate_cents integer NOT NULL,
  pay_rate_period text NOT NULL,
  effective_date date NOT NULL,
  reason_category pay_rate_reason_category NOT NULL,
  override_below_award boolean NOT NULL DEFAULT false,
  override_reason text,
  changed_by_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
```

### `employee_certifications`

```sql
CREATE TABLE public.employee_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  cert_type text NOT NULL,
  cert_state text, -- e.g. VIC for RSA
  certificate_number text,
  issue_date date NOT NULL,
  expiry_date date,
  issuing_authority text,
  document_storage_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### `employee_documents`

```sql
CREATE TABLE public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  document_type employee_document_type NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  is_sensitive boolean NOT NULL DEFAULT false,
  uploaded_by_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
```

### `employee_audit_log`

```sql
CREATE TABLE public.employee_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  field_path text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  is_sensitive boolean NOT NULL DEFAULT false,
  actor_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  justification text,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `xero_employee_sync_log`

```sql
CREATE TABLE public.xero_employee_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  direction xero_sync_direction NOT NULL,
  field_path text NOT NULL,
  xero_value jsonb,
  supersolt_value jsonb,
  resolution text NOT NULL, -- applied | skipped_managed_in_supersolt | conflict_notification
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `employee_onboarding_tokens` (ESO)

```sql
CREATE TABLE public.employee_onboarding_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_organisation_id uuid NOT NULL REFERENCES public.user_organisations (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### RLS (summary)

| Table | SELECT | INSERT/UPDATE |
|-------|--------|---------------|
| `user_organisations` (employment cols) | org peers per existing policies | org admin + operators per `people-access.ts` |
| `employee_payroll_profiles` | **self row OR `is_org_admin(org)`** | **self sensitive cols OR org admin** |
| `employee_pay_rate_history` | org member; sensitive rate visible per People policy | org admin + service |
| `employee_certifications` | org member; venue operators see assigned venue staff | operators + admin |
| `employee_documents` | self + org admin (+ area manager docs: **no** — Owner + self for sensitive docs) | same as write policy |
| `employee_audit_log` | org admin + self (non-sensitive fields only for self) | insert via service only |
| `employee_onboarding_tokens` | service role / token validator only | org admin create |

**Replace** `employee_payroll_profiles_select` (org-wide member read) from payroll migration with Owner+self policies in People migration.

Helper SQL functions (security definer, minimal):

- `can_read_employee_sensitive(org_id, subject_profile_id)` → `auth.uid() = subject OR is_org_admin(org_id)`.
- `can_manage_people(org_id)` → operator role or org admin (for non-sensitive team edits).

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/20260601170000_people_compliance_floor.sql`
- **Depends on:** `20260601160000_payroll_export_notion_model.sql` (`employee_payroll_profiles` exists)
- **Pattern:** App-owned ([ARCHITECTURE.md §8.1](../../../../../../ARCHITECTURE.md))
- **Backfill:** `apps/supersolt/scripts/backfill-people-from-memberships.ts` — copy `employment_type`, seed `employee_payroll_profiles` from existing members, set `start_date` from `joined_at` where missing
- **Apply:** `user-supabase-supersolt-mvp` MCP `apply_migration`; then `pnpm drizzle:pull` (do not hand-edit `drizzle/schema.ts`)
- **TFN encryption:** use Supabase/vault or `pgcrypto` + app key in env; document `TFN_ENCRYPTION_KEY` in `.env.example`

## 5. API surface

Base: `/api/organisations/[organisation]/workforce/people`

| Operation | Method | Path | Auth | Notes |
|-----------|--------|------|------|-------|
| List employees | GET | `…/people?venueId=&status=&positionId=&q=&compliance=` | org member | Operators: org-wide; optional venue filter |
| Create employee | POST | `…/people` | org admin | Atomic: profile + UO + venues + invite + payroll profile shell |
| Get employee | GET | `…/people/[userOrganisationId]` | member | Sensitive omitted unless Owner/self |
| Patch employee | PATCH | `…/people/[userOrganisationId]` | operator / self | Tiered errors (§ errors) |
| Archive | POST | `…/people/[userOrganisationId]/archive` | org admin | Soft archive |
| Terminate | POST | `…/people/[userOrganisationId]/terminate` | org admin | Body: cessation code, end date, notes |
| Sensitive bundle | GET/PATCH | `…/people/[userOrganisationId]/sensitive` | Owner or self | Never returned to Agent |
| Pay rate history | GET | `…/people/[userOrganisationId]/pay-rates` | member | |
| Add pay rate | POST | `…/people/[userOrganisationId]/pay-rates` | org admin | Award warn / override |
| AWR uplift preview | POST | `…/people/award-uplift/preview` | org admin | |
| AWR uplift apply | POST | `…/people/award-uplift/apply` | org admin | |
| Certifications CRUD | GET/POST/PATCH/DELETE | `…/people/[id]/certifications/…` | operator / self read | |
| Documents | GET/POST/DELETE | `…/people/[id]/documents/…` | gated | Supabase Storage signed URLs |
| Audit history | GET | `…/people/[id]/history?cursor=` | Owner or self | |
| Xero import preview | POST | `…/people/import/xero` | org admin | Moves logic from `members/import/xero`; returns staging rows |
| Xero import confirm | POST | `…/people/import/xero/confirm` | org admin | |
| Bulk CSV preview | POST | `…/people/import/csv` | org admin | multipart |
| Bulk CSV confirm | POST | `…/people/import/csv/confirm` | org admin | |
| Send ESO link | POST | `…/people/[id]/onboarding-link` | org admin | |
| Staff self | GET/PATCH | `…/people/me` | authenticated | Org from session / query |
| Venue directory | GET | `…/venues/[venue]/people` | venue member | **Read-only**; delegates to list with `venueId` |

**ESO (unauthenticated):**

| Operation | Method | Path | Auth |
|-----------|--------|------|------|
| Validate token | GET | `/api/organisations/[organisation]/onboard/[token]` | token |
| Submit onboarding | PATCH | same | token |

### Response envelope

```json
{ "data": { "employee": {}, "complianceStatus": "amber", "warnings": [{ "code": "vevo_incomplete" }] }, "error": null }
{ "data": null, "error": { "message": "…", "status": 422, "code": "duplicate_email" } }
```

### Validation

- **Zod:** `entities/workforce/people/schemas.ts` — shared by routes and forms
- **Errors:** `PeopleServiceError` + `PeopleErrorCode`; every code in [`flows.md`](flows.md) §2

### Internal exports (sibling modules)

`peopleService.getPayrollProfile(orgId, userProfileId)`, `listForVenue`, `assertCanAssignToRoster`, `complianceFlagsAsOf(date)` — consumed by roster, leave, timesheets, payroll-export.

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/workforce/people/
│   ├── page.tsx
│   ├── [userOrganisationId]/page.tsx
│   └── me/page.tsx
├── app/(main)/[organisation]/onboard/[token]/page.tsx   # ESO public
├── app/api/organisations/[organisation]/workforce/people/…
├── app/api/organisations/[organisation]/onboard/[token]/route.ts
├── entities/workforce/people/
│   ├── components/
│   │   ├── people-list-page.tsx
│   │   ├── people-add-wizard.tsx      # 7 steps; sessionStorage draft
│   │   ├── people-detail-page.tsx     # tabs
│   │   ├── people-sensitive-section.tsx
│   │   ├── people-certifications-tab.tsx
│   │   ├── people-compliance-tab.tsx
│   │   ├── people-terminate-dialog.tsx
│   │   └── employee-onboard-page.tsx
│   ├── hooks/
│   ├── api/endpoints.ts
│   └── schemas.ts
└── server/workforce/
    ├── people.service.ts
    ├── people.repo.ts
    ├── people-policy.ts          # compliance, award minimum, sensitive ACL
    ├── people-compliance.ts      # status green/amber/red
    ├── people-telemetry.ts
    ├── people-errors.ts
    ├── people-onboard.service.ts
    └── xero-employee-sync.service.ts
```

Migrate logic from `people-page-client.tsx` → `people-list-page.tsx`; delete route `_components/` after cutover.

**Permissions:** [`settings/permissions`](../../settings/permissions/plan.md) remains invite/role UI; “Edit employment” links to `…/workforce/people/[userOrganisationId]`.

## 7. Dependencies

- `@workspace/ui` — Table, Form, Tabs, Sheet, Dialog, Badge
- `@workspace/supabase` — Auth session only (ESO uses custom token)
- Award Rate Library — minimum rate lookup for pay rate warn
- Xero Payroll API — import/sync (extend existing OAuth connection)
- Supabase Storage — `employee-documents/{org_id}/{profile_id}/…`

No new package edges.

## 8. Implementation order (commits)

1. `test(supersolt): red people compliance tests` — per [`tdd.md`](tdd.md)
2. `feat(supersolt): people compliance floor migration + RLS`
3. `feat(supersolt): people repo, policy, and service`
4. `feat(supersolt): workforce people API routes`
5. `feat(supersolt): entities workforce people UI`
6. `feat(supersolt): employee self-onboarding token flow`
7. `feat(supersolt): xero employee sync and csv import`
8. `feat(supersolt): people telemetry catalog`
9. `docs(supersolt): mark workforce people specced`

## 9. Telemetry

See [`people-telemetry.ts`](../../../../server/workforce/people-telemetry.ts) (to create). Full catalog; default **no-op** implementation.

| Event | Trigger | Payload (no sensitive values) |
|-------|---------|-------------------------------|
| `people.viewed` | List mount | `{ organisation_id, venue_id? }` |
| `people.employee_created` | POST create | `{ organisation_id, employment_type }` |
| `people.employee_terminated` | Terminate | `{ organisation_id, cessation_reason_code }` |
| `people.pay_rate_changed` | New history row | `{ organisation_id, reason_category, below_award_override: bool }` |
| `people.xero_import_completed` | Confirm import | `{ organisation_id, row_count }` |
| `people.xero_sync_applied` | Cron/webhook | `{ organisation_id, field_count }` |
| `people.csv_import_completed` | Confirm CSV | `{ organisation_id, success_count, error_count }` |
| `people.eso_completed` | Token submit | `{ organisation_id }` |
| `people.compliance_warning` | Save with warnings | `{ organisation_id, codes: string[] }` |
| `people.sensitive_access` | Sensitive GET | `{ organisation_id, actor_role }` |
| `people.failed` | Any error | `{ organisation_id, code }` |

## 10. Rollout

- **Feature flag:** none — atomic cutover (grill-me #12)
- **Env vars:** `TFN_ENCRYPTION_KEY` (or vault ref); document in `apps/supersolt/.env.example`
- **Sequencing:** migrate → backfill script → deploy API → deploy UI → verify venue `GET …/people` still works
- **Backout:** revert application deploy; **do not** drop sensitive tables without legal review — forward-only data migration

## 11. Open questions

### Product (Notion — tracked)

- AWR 2026 timing — workflow supports when FWC announces (owner: product)
- Multi-state RSA / LSL — VIC only calculator in MVP (owner: product)

### Engineering

- [ ] **TFN encryption mechanism** — pgcrypto vs application envelope (owner: eng, due: migration PR)
- [ ] **Document storage bucket** — RLS policies on `storage.objects` (owner: eng, due: sprint 1)
- [ ] **Xero payroll scopes** — re-consent when accounting connected without payroll (owner: eng, due: import PR)
- [ ] **Daily Xero employee sync** — cron route vs webhook (owner: eng, due: post-MVP hardening)

## 12. Decision log

- *3 May 2026 (Notion)* — Every employee is a platform user; position taxonomy; Xero hybrid.
- *16 May 2026 (Notion)* — Compliance Floor A; MVP cut (manual entry, date-only FWIS/CEIS, eligibility flags only).
- *1 Jun 2026 (grill-me)* — Full Notion in-scope scope; identity `(org, profile)`; org API tree; `entities/workforce/people`; sensitive Owner+self only; tiered errors; wizard local draft; full telemetry catalog; full test pyramid; atomic rollout.
- *1 Jun 2026* — Parent Workforce permission table corrected: Area Manager does **not** receive sensitive field access (People spec wins).

## Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Parent: [`../plan.md`](../plan.md)
- Architecture: [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md)
