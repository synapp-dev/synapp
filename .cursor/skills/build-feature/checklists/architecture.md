# Architecture compliance checklist

Walk this gate **before** writing the three-file artifact. Every item must be `yes` or `n/a`. A `no` sends you back to grill-me to re-resolve the offending branch.

Source of truth: [ARCHITECTURE.md](../../../../ARCHITECTURE.md). Section numbers below refer to that file.

## A. Hard import rules (§3, §4.1)

- [ ] No `apps/<A>` imports any module from `apps/<B>` (`A != B`). _§3.1_
- [ ] No `packages/*` imports anything from `apps/*`. _§4.1_
- [ ] `@workspace/ui` does not import `@workspace/supabase` or any `@supabase/*` package. _§3.2, §4.1_
- [ ] No new cycles between packages introduced. _§3.2_

## B. Code placement (§7.1)

- [ ] Agnostic UI primitives are reused from `@workspace/ui`, **not** duplicated under `apps/<product>/components/atoms|molecules`. _§5.2, §7.1_
- [ ] Domain-specific composition lives under `apps/<product>/entities/<feature>/`. _§7.1_
- [ ] `apps/<product>/components/` contains **only** shell/branding/cross-cutting UI — not a second atomic library. _§7.1_
- [ ] Routes/layouts live under `apps/<product>/app/`; route-colocated UI is acceptable for one-off pieces. _§7.1_

## C. Promotion to packages (§5)

- [ ] Non-UI shared code stays in the originating app **until a real second consumer exists**. _§5.1_
- [ ] If promoted now, there is a documented second consumer, and the new package has a stable named export (e.g. `@workspace/contracts`). _§5.1_
- [ ] If introducing a new shared package or a new allowed package edge: `ARCHITECTURE.md` will be updated in the same change. _§10_

## D. Theming (§6)

- [ ] Tokens / global primitives consumed from `@workspace/ui` (no fork of the component system). _§6_
- [ ] Product overrides, if needed, ship as a small override stylesheet imported **after** the workspace globals in `apps/<product>/app/globals.css`. _§6_

## E. Data ownership and migrations (§8)

- [ ] Migrations, generated types, and RLS for this feature live in `apps/<product>/` (default §8.1).
- [ ] If using a packaged module migration (§8.2), none of §8.3's "must not" cases apply (regulatory, tenant-specific, prod collision, long backfill, UI-only, breaking DDL across consumers).
- [ ] No assumption of a shared cross-product database. _§8.1_

## F. Auth boundary (§3.2)

- [ ] All Supabase / session usage routes through `@workspace/supabase`.
- [ ] No `@workspace/ui` consumer was modified to require `@workspace/supabase`.
- [ ] Server-only secrets stay in server actions / route handlers, never imported into client components.

## G. Self-update trigger (§10)

If **any** of the following is true, this change must also edit [ARCHITECTURE.md](../../../../ARCHITECTURE.md):

- [ ] A new allowed package-to-package edge is introduced.
- [ ] A new shared package is created.
- [ ] A change to migration defaults is made (e.g. switching to packaged migrations for a module).
- [ ] An existing rule is being relaxed (**discouraged** — require explicit user approval and rationale).

When updating, add the new rule with a one-line rationale linking back to the feature folder (e.g. `apps/<product>/docs/features/<slug>/plan.md`). Do **not** weaken existing rules.

## H. Lint gate

- [ ] `pnpm lint:architecture` passes from the monorepo root after the planned changes.
- [ ] No new `eslint-disable` comments suppressing boundary or `no-restricted-imports` rules. _§4.2_

## Outcome

If every item is `yes` or `n/a`, proceed to write `plan.md`, `tdd.md`, `flows.md`. If any item is `no`, return to grill-me Step 3 and resolve the offending branch before writing.
