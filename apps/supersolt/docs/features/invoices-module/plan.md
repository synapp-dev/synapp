# Invoices Module

> **Product:** `apps/supersolt`
> **Slug:** `invoices-module`
> **Route:** `/{organisation}/{venue}/purchasing/invoices`
> **Status:** In progress
> **Notion:** [Invoices](https://www.notion.so/34f64094bde680879fcdc09007b7ba24)

## 1. Summary

Operator-facing invoice management: intake (Xero sync, manual upload, inbound email) → LLM parse → Pending Review queue → Confirm / Dispute / Duplicate → PO match + cost propagation.

## 2. Architecture placement

| Decision | Choice | Section |
|----------|--------|---------|
| Domain | `server/invoices/`, `entities/invoices/` | ARCHITECTURE §7.1 |
| Xero adapter | `server/xero/` delegates to invoices domain | §7.1 |
| Email | [`email-infrastructure/plan.md`](email-infrastructure/plan.md) | child spec |
| Migrations | `apps/supersolt/supabase/migrations/` | §8.1 |

## 3. Data model

- `venue_invoices` (renamed from `venue_xero_invoices`)
- `venue_invoice_line_items`, `venue_invoice_attachments`, `venue_invoice_audit_log`
- `invoice_cost_change_events`
- `venue_email_inboxes`, `inbound_email_log`
- `organisation_purchasing_settings.invoice_approval_threshold_cents`

## 4. API index

See implementation under `app/api/organisations/[organisation]/venues/[venue]/invoices/`.

## 5. Rollout

1. Apply migration `20260529120000_invoices_module.sql`
2. `pnpm pull-and-fix-schema` in supersolt
3. Set `OPENAI_API_KEY`, `POSTMARK_INBOUND_WEBHOOK_SECRET` (optional for email)

## Compliance audit (program 2026-06-01)

| Notion capability | Status | Notes |
|-------------------|--------|-------|
| Route `purchasing/invoices` | **Shipped** | Drift vs Notion `inventory/invoices` — code canonical |
| Pending review queue | **Partial** | UI in `entities/invoices/components/` |
| Xero / upload / email intake | **Partial** | Cron + webhooks; see email-infrastructure |
| Thin v1 list/open/status | **Partial** | Roadmap v1 scope |
| PO match + cost propagation | **Partial** | Per plan §3 |

Tie onboarding: invoice ingestion setup in [`onboarding/plan.md`](../onboarding/plan.md).

**Updated:** 2026-06-01
