# Invoices Module — User flows

> Notion source: [Invoices Module Overview](https://www.notion.so/34f64094bde680879fcdc09007b7ba24)

## Happy paths

1. **Email → parse → Pending Review → Confirm** — inbound webhook creates draft; operator confirms in queue.
2. **Upload PDF → LLM parse → Confirm** — upload dialog → parser → detail → confirm.
3. **Xero sync → Pending Review → Confirm** — manual/daily sync; operator review required.
4. **Auto PO match** — matcher links on ingest; confirm closes PO when delivered.
5. **Bulk approve** — multi-select in Pending Review; failures return to queue with reason.
6. **Dispute** — reason category + notes; blocks cost propagation until resolved.
7. **Duplicate** — second arrival flagged; operator archives duplicate.
8. **Cost propagation** — confirm with price changes shows modal; accept updates supplier products + recipes.

## Error states

| Trigger | UI | Recovery |
|---------|-----|----------|
| Xero not connected | Banner + link to Integrations | Connect Xero |
| Parse failed | Pending Review with low confidence / manual entry | Edit lines, confirm |
| Unmapped line items | Yellow flag on line | Map supplier product |
| Over approval threshold | `pending_approval` status | Owner approves |
| Bulk approve partial fail | Toast lists failed IDs | Fix and retry |
