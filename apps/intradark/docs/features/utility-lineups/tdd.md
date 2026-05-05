# Utility lineups — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). MVP emphasizes **Vitest** on **pure helpers**; DB integration and E2E match the **deferred** posture documented for **[`../news/tdd.md`](../news/tdd.md)** until a harness exists.

## 1. Test list (red → green → refactor)

Author each **unit** test before or alongside its production helper. Order matters.

| # | Layer | Behavior under test | File (proposed) | Status |
|---|-------|---------------------|-----------------|--------|
| 1 | unit | **`normalizeUtilitySearchParams`** — maps raw `URLSearchParams` / record to `{ grenadeType, side }` with defaults | `apps/intradark/entities/utility-lineups/lib/normalize-utility-search-params.test.ts` | red |
| 2 | unit | Unknown **`type`** / **`side`** values are **coerced** to defaults (never throw); unknown keys ignored | same | red |
| 3 | unit | **`clusterLineupsByLandSpot`** — given lineups with `land_spot_id`, returns clusters with **count** and **lineup ids** per land spot | `apps/intradark/entities/utility-lineups/lib/cluster-lineups.test.ts` | red |
| 4 | unit | **Enum guards** (or Zod schemas) for grenade type / side / movement / technique / margin — reject invalid **server** payloads if/when mutations exist; for reads, DB CHECK is source of truth | `apps/intradark/entities/utility-lineups/lib/utility-enums.test.ts` | red |
| 5 | unit | **YouTube URL allowlist** — accepts `youtube.com` / `youtu.be` watch URLs; rejects other hosts for embed builder | `apps/intradark/entities/utility-lineups/lib/youtube-embed.test.ts` | red |
| 6 | integration | *(follow-up)* **RLS:** anon `SELECT` published lineups only; draft hidden | `apps/intradark/entities/utility-lineups/utility-lineups.int.test.ts` | deferred |
| 7 | integration | *(follow-up)* **RLS:** inactive map and its spots/lineups not visible | same | deferred |
| 8 | e2e | *(follow-up)* Playwright not required at MVP — **manual smoke** in [`flows.md`](flows.md) §1 | `apps/intradark/e2e/utility-lineups.spec.ts` | deferred |

After each **unit** item turns green, refactor before moving on.

## 2. Unit tests

### Pure functions / validators

- **Subject:** `normalizeUtilitySearchParams`, `clusterLineupsByLandSpot`, `buildYouTubeEmbedUrl` (or equivalent), enum constants.
- **Cases:**
  - Happy path: valid `type` + `side` pass through normalized.
  - Boundary: missing params → defaults; empty string → defaults.
  - Invalid: garbage strings → defaults (**200** response policy per [`flows.md`](flows.md) §3.4).
- **Runner:** **Vitest** — use **`apps/intradark/vitest.config.mts`** (or project-standard config) and **`pnpm --filter intradark test`** (exact script name per `package.json` at implementation).
- **No mocks** for pure functions.

### Server Components

- Prefer testing **extracted pure helpers** (§1) rather than full RSC trees.
- If snapshot-testing layout, keep **behavioral** assertions minimal (marker counts, not pixel diffs).

## 3. Integration tests (DB + RLS)

**Deferred** until `apps/intradark` documents a pattern (local Postgres / `supabase start`, migrate, seed roles). When added:

### Setup

- Global setup runs **`apps/intradark/drizzle/*.sql`** (or `drizzle-kit migrate`) against a disposable DB URL from env.
- Seed: one **active** map, two **spots**, three **lineups** (two share **`land_spot_id`** for cluster count), one **draft** lineup excluded by RLS.

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Anon reads published lineups | anon | published rows only |
| Anon cannot read draft lineup | anon | row absent |
| Inactive map hidden | anon | map + spots + lineups not returned by public queries |
| Service role seed | service_role | insert allowed (ops scripts only) |

## 4. End-to-end (happy path)

- **Tool:** Playwright **not** required for MVP merge if absent — **manual smoke** in [`flows.md`](flows.md) §1.
- **Manual scenario:** `/utility` → pick map → `/utility/[mapSlug]` shows radar + markers → change filters (URL updates) → open one lineup → screenshot + embed visible.

## 5. Fixtures and seed data

- **Location (when integration exists):** `apps/intradark/test/fixtures/utility-lineups.ts`
- **Determinism:** fixed UUIDs for map, spots, lineups.
- **Auth:** never commit **service_role** keys; CI injects via secrets.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit tests §1 rows **1–5** | all green before merge | MVP bar |
| Integration §3 | deferred | Enable when harness lands |
| E2E | manual per [`flows.md`](flows.md) | Until Playwright added |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- **`@workspace/ui`** internals — upstream.
- **YouTube iframe** pixel-perfect layout — smoke in browser only.
- **Full map image** binary — use stub URL in unit tests.

## 8. Refactor checklist (after green)

- [ ] Normalization logic in **one module** used by **`[mapSlug]/page.tsx`**.
- [ ] No `any` on Drizzle rows — inferred types from **`server/db/schema.ts`**.
- [ ] No app-to-app imports (**§3.1**).
- [ ] No `@workspace/ui` → Supabase (**§3.2**).
- [ ] Client islands stay thin; data fetching stays server-side.
