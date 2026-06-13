# Invoices Module — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md).

## Test list

| # | Layer | Behavior | File |
|---|-------|----------|------|
| 1 | unit | `mapXeroReviewStatus` removed; sync preserves operator review status | `xero-invoice-map.test.ts` |
| 2 | unit | PO matcher scores supplier + total + date | `invoice-po-matcher.test.ts` |
| 3 | unit | Duplicate detector matches number + supplier + total | `duplicate-detector.test.ts` |
| 4 | unit | Parser Zod schema rejects invalid shapes | `invoice-parser.service.test.ts` |
| 5 | unit | Confirm transitions status + audit log | `invoices.service.test.ts` |
| 6 | integration | Venue member can list invoices via RLS | manual / future int test |
