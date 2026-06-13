# Email Infrastructure (Invoices child)

> Parent: [`../plan.md`](../plan.md)
> **Notion:** [Email Infrastructure](https://www.notion.so/35664094bde68184aa0dc7165c214ce1)

## MVP contract

- **Address:** `{venue-slug}@inbox.supersolt.com` in `venue_email_inboxes`
- **Inbound:** `POST /api/webhooks/inbound-email` (Postmark signature verify)
- **Flow:** extract attachments → Storage → `invoice-parser.service` → `venue_invoices` draft
- **Outbound PO:** existing `po-email.service.ts` (unchanged)
- **Settings:** Integrations page shows inbox address + copy button

## Env

- `POSTMARK_INBOUND_WEBHOOK_SECRET` — webhook auth
- `POSTMARK_SERVER_TOKEN` — optional outbound

## Compliance audit (program 2026-06-01)

| Notion | Status |
|--------|--------|
| Per-venue inbox | **Partial** — `venue_email_inboxes` |
| Inbound webhook → parse | **Partial** |
| Onboarding provisions inbox | **Partial** — tie [`onboarding/plan.md`](../../onboarding/plan.md) supplier step |

Parent purchasing loop: [`purchasing/plan.md`](../../purchasing/plan.md).

**Updated:** 2026-06-01
