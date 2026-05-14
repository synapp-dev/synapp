# Utility lineup upload — multi-step wizard — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File (indicative) | Status |
|---|-------|---------------------|-------------------|--------|
| 1 | unit | **`jobPayloadSchema`** (or equivalent) accepts minimal valid wizard snapshot | `entities/utility-lineups/lib/*upload-job*.test.ts` | red |
| 2 | unit | Same schema rejects coords out of **0–1**, bad ms step, missing required labels | same | red |
| 3 | unit | **`assertUtilityLineupUploaderEligible`** (or pure predicate) — requires verified email + **`steam_profile_id`** + **`discord_user_id`** | `entities/utility-lineups/lib/*eligibility*.test.ts` | red |
| 4 | integration | Owner **creates** job row; **SELECT** returns row under **RLS** as that user | `entities/utility-lineups/actions/*.int.test.ts` | red |
| 5 | integration | **Different** **`auth.uid()`** cannot **SELECT** another user’s jobs | same | red |
| 6 | integration | **Finalize** idempotent / conflict behavior documented in **`plan.md`** — no duplicate **`pending`** lineup for same completed job | same | red |
| 7 | unit | Job **status** transition helper — illegal transitions rejected | `entities/utility-lineups/lib/*job-status*.test.ts` | red |
| 8 | e2e | **Deferred** — no **`playwright.config`** in **`apps/intradark`** at spec time; use **manual smoke** in **`flows.md`** §1 acceptance | — | n/a |

After each green item, refactor only touched code before proceeding.

## 2. Unit tests

### Validators / eligibility

- **Subjects:** Zod schemas for **`payload_json`**; pure **`canUploadUtilityLineup`** predicate fed by `(emailConfirmed, steamLinked, discordLinked)`.
- **Runner:** Vitest (match existing **`user-lineup-submit-schema.test.ts`** pattern).

## 3. Integration tests (DB + RLS)

Run against **local Supabase** (`supabase start` under **`apps/intradark`**) when integration harness exists; otherwise document seed SQL and manual RLS verification steps in PR template until harness lands.

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Owner reads own jobs | `authenticated` (uid = owner) | rows returned |
| Non-owner reads | `authenticated` (uid ≠ owner) | empty |
| Anon reads | `anon` | denied |
| Owner inserts job | `authenticated` | success |
| Owner cancel | `authenticated` | **`cancelled`** |

## 4. End-to-end

- **Tool:** Not required for MVP **unless** Playwright is added to **`apps/intradark`**.
- **Manual smoke:** Follow **`flows.md`** §1 steps before merge.

## 5. Fixtures

- Deterministic **`user_profiles`** rows with/without Steam/Discord/email confirmation flags (mirror **`user_profiles`** + **`auth.users`** test helpers).

## 6. Coverage gates

| Gate | Threshold |
|------|-----------|
| New unit files | ≥80% branch on changed paths (team norm) |
| Integration cases §3 | All implemented or explicitly waived with owner note |
| `pnpm lint:architecture` | clean |

## 7. What NOT to test

- `@workspace/ui` internals.
- Supabase Storage transport — smoke manually.

## 8. Refactor checklist

- [ ] Wizard + radar logic split so no single file balloons past **~300** lines without follow-up split plan.
- [ ] Validation single-sourced (Zod shared client/server for snapshot shape).
- [ ] No client import of **`@workspace/supabase`** for secrets.
