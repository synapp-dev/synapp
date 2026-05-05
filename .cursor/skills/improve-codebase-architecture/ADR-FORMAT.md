# ADR format (architecture decisions)

Use when the user rejects a deepening candidate with a **load-bearing reason** future explorers need — not for ephemeral deferrals ("not now") or obvious facts.

Store ADRs under **`docs/adr/`** unless the repo already uses another path; match existing numbering (e.g. `0007-title.md`).

## Suggested sections

1. **Title** — imperative, short (`0007-do-not-merge-order-and-shipment.md`).
2. **Status** — proposed | accepted | superseded by ADR-XXXX.
3. **Context** — friction or constraint that motivated the decision.
4. **Decision** — what we will not do (or what we will do instead).
5. **Consequences** — tradeoffs; what future reviews should not re-suggest without reopening this ADR.

Keep each ADR one decision. Split if multiple independent choices appear.
