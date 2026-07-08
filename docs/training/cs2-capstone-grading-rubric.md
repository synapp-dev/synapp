# CS2 Capstone — Grading Rubric & Oral Exam

Companion to [cs2-capstone-project.md](./cs2-capstone-project.md). Use this to grade both the **codebase** (does it work / is it built well) and the candidate's **understanding** (does he actually know why it works).

**How to use it:** walk the code with him open in front of you, score each phase as you go, then run the oral exam. The oral section is the real aptitude signal — code can be copied or AI-generated; explaining *why* under questioning cannot.

**Default weighting:** Codebase **50** + Oral **50** = **100**. Reweight if you care more about one axis (e.g. 40/60 toward oral if you suspect heavy AI assistance).

---

## Scoring key (per line item)

Score every checklist item 0–2 unless noted:

| Score | Meaning |
| ----- | ------- |
| **2** | Fully meets the criterion; clean and intentional |
| **1** | Partially works / works but fragile, hacky, or incomplete |
| **0** | Missing, broken, or wrong |

For oral questions, score the *answer quality* (see banding at the bottom), not just whether he got the buzzword.

---

# PART 1 — Codebase walkthrough (50 pts)

Each phase is weighted. Multiply the phase's averaged item score (0–2) into its weight. A running tally box is at the end.

### Phase A — Foundation (weight: 3)
- [ ] Runs locally from a clean clone using only the README steps
- [ ] Secrets only in local env; a committed `.env.example` with placeholders exists (no real keys in git history)
- [ ] Real site shell / nav exists, not the Next.js starter page
- [ ] Top-level folders roughly match the composition guide

**Red flags:** committed `.env` with live keys; `git log` shows secrets ever committed; README is the default `create-next-app` boilerplate.

### Phase B — Accounts, Steam & access rules (weight: 7) ★ sign-off critical
- [ ] Registration captures first name, last name, email, password; names surface somewhere appropriate (account/settings)
- [ ] Sign in / sign out work reliably across reloads
- [ ] Steam links once via OpenID; profile clearly shows "connected"
- [ ] Linking stores Steam **alias + avatar** (persisted, not re-fetched live every render)
- [ ] Guest (not signed in) **cannot** queue but **can** view live/finished matches
- [ ] Signed-in user **without Steam cannot** queue
- [ ] Match-facing UI uses Steam alias/avatar, **never** signup first/last name

**Red flags:** permission checks only in the UI (no server enforcement); alias/avatar fetched on every page load instead of stored; signup name leaking onto lobby cards.

### Phase C — Data & security (weight: 6)
- [ ] Fresh DB can be built from migrations alone (no manual SQL-by-hand)
- [ ] Map pool seeded
- [ ] README/diagram explains the main entities and relationships
- [ ] **RLS (or equivalent) prevents tampering** — a random/authed user can't alter match or queue outcomes via the client
- [ ] Schema models: queue, matches + stage, teams/membership, accepts, veto/bans, map pool, profile w/ Steam fields

**Red flags:** RLS disabled "to make it work"; service-role key used in a browser-reachable path; one giant `matches` table with JSON blobs for everything.

### Phase D — Server-side matchmaking logic (weight: 12) ★ the heart of the project
- [ ] Join/leave queue works for multiple accounts
- [ ] Match auto-creates when the **configurable** required count is reached
- [ ] Accept / decline handled; declining resolves everyone sensibly (no stranded players)
- [ ] On full accept: two teams formed, match advances to lobby **in persistent storage**
- [ ] Veto runs to exactly one remaining map + a stored connect string
- [ ] Requests validated (Zod or equiv); rejects wrong player / wrong stage / not-in-match
- [ ] A user already in an active match is **server-rejected** from queueing (not just hidden in UI)
- [ ] Match state is authoritative server-side (single source of truth), queryable as "who's here + what stage"

**Red flags:** match-deciding logic running in client components; no transaction/locking around match creation (race when N players join at once); "already in a match" enforced only by hiding the button.

### Phase E — Live updates (weight: 6)
- [ ] Two browsers: queue count/status updates on both without refresh
- [ ] Match forming pushes all participants to accept without manual reload
- [ ] A map ban appears for the other player(s) without reload
- [ ] Documents what's subscribed to (and handles reconnect reasonably)

**Red flags:** `setInterval` polling disguised as "realtime"; subscribes to entire tables with no filter; UI state diverges from DB after a dropped connection.

### Phase F — Player screens & flow (weight: 8) ★ sign-off critical
- [ ] Full journey completable with enough test accounts: queue → accept → lobby → veto → connect
- [ ] Declining never strands anyone on a frozen screen
- [ ] Guests can browse live/finished matches
- [ ] **Close browser mid-match → sign back in → lands in the live match at the correct phase** (not blank play hub)
- [ ] While in an active match, queue is blocked with a clear message
- [ ] Lobby + accept list show Steam personas only
- [ ] Usable at phone width; wrong-step landing redirects to correct step

**Red flags:** active-match restore relies on localStorage instead of server state; refresh on the veto page loses turn state.

### Phase G — Polish (weight: 2)
- [ ] README reproduces a full multi-account flow in ~20 min
- [ ] No leftover "you're still in a match" UI after cancel/finish
- [ ] Errors/empty states read like product copy, not stack traces

### Phase H — Reliability & delivery (weight: 4)
- [ ] ≥3 automated tests on real rules (veto order, team split, illegal state change)
- [ ] Strict TypeScript (no `any` soup / `// @ts-ignore` everywhere)
- [ ] Live URL works **or** README justifies why not

### Cross-cutting — Git hygiene (weight: 2) ★ sign-off critical
- [ ] Conventional Commits, one logical change each
- [ ] History shows **incremental delivery**, not a single "initial commit" dump
- [ ] No vague messages (`wip`, `fix stuff`), no committed secrets

> **Codebase subtotal:** sum(phase avg × weight) → normalize to 50.
> Max raw = (3+7+6+12+6+8+2+4+2) × 2 = **100**, so **codebase /50 = raw ÷ 2**.

---

# PART 2 — Oral exam (50 pts)

Ask these with the code open. Let him drive. The pattern: ask the question, let him answer, then **ask "why" one more time than feels necessary** — that's where you find the ceiling between "memorized" and "understands."

Score each question 0–3 (0 = no clue, 1 = surface/buzzword, 2 = solid, 3 = deep + can reason about trade-offs). 14 questions below → pick ~12–14, normalize to 50.

### A. Architecture & data modelling
1. **Walk me through your schema.** Why is each table shaped that way? *(Strong: clear entities, FKs, why membership/accepts are separate rows not arrays. Weak: "I just put everything in matches.")*
2. **Where is the single source of truth for match state?** If two browsers disagree on the stage, who wins? *(Strong: the DB row; clients render from it. Weak: "each browser tracks its own.")*
3. **How is the match lifecycle represented** (queue→accept→lobby→veto→connect→done)? *(Strong: a status enum / explicit state machine with guarded transitions. Weak: scattered booleans.)*

### B. Security & permissions
4. **From the browser, can I `update` the matches table directly?** Why or why not? Show me the RLS. *(Strong: RLS blocks it; writes go through server with checks. Weak: "RLS is off" / "the UI doesn't let you.")*
5. **How do you stop a player accepting or banning on someone else's behalf?** *(Strong: server checks `auth.uid()` is a participant + correct turn. Weak: trusts the request body.)*
6. **Where's the service-role key used, and why must it never reach the client?** *(Strong: server-only, bypasses RLS, would be game-over if leaked. Weak: doesn't know what it is.)*

### C. Auth & Steam identity
7. **Walk me through Steam linking.** What do you store and when? *(Strong: OpenID flow, captures alias+avatar at link time, persisted. Weak: re-fetches every render / hand-waves OpenID.)*
8. **Why show Steam alias instead of the signup name in the lobby — and where is that enforced?** *(Strong: product requirement + enforced at the data/query layer. Weak: "just a CSS thing.")*

### D. Matchmaking logic (push hardest here)
9. **Required count is 4. Five people click "join" within the same second. What happens?** *(Strong: recognizes the race, describes a transaction/lock/atomic claim so only one match of 4 forms. Weak: "it just works" — likely a latent bug; have him show the code.)*
10. **How do you form two balanced teams?** What if you have no skill rating? *(Strong: documents the heuristic; sensible fallback. Weak: random with no acknowledgement.)*
11. **In veto, how do you know whose turn it is to ban?** Can the wrong captain ban? *(Strong: server-derived turn from ban count/order, rejects wrong actor. Weak: client decides turn.)*
12. **How do you prevent someone already in a live match from queueing?** *(Strong: server checks for an active match before allowing queue insert. Weak: only hides the button.)*

### E. Realtime & resilience
13. **How does another browser learn someone joined the queue — and why not just poll every 2s?** *(Strong: explains the subscription + filter + cost/latency trade-off. Weak: doesn't know the difference / actually is polling.)*
14. **A user closes the browser mid-veto and logs back in. Which query runs, and how does the app drop them back into the right step?** *(Strong: on load, look up the user's active match server-side, route by its stage. Weak: relies on localStorage / can't answer.)*

### Ceiling-finders (optional, score as bonus or to break ties)
- If you went to **5v5**, what changes — and what *doesn't*?
- How would you add an **accept timer with dodge penalties**?
- **What's the weakest part of your design** and what would you fix first? *(Honest, specific self-critique is a strong senior signal.)*
- If **10,000 users queued at once**, where does it break first?

> **Oral subtotal:** sum of question scores → normalize to 50.

---

# PART 3 — Final score & grade bands

| Component | Raw | Weighted |
| --------- | --- | -------- |
| Codebase (raw /100 ÷ 2) | ____ | ____ /50 |
| Oral (normalized) | ____ | ____ /50 |
| **Total** | | **____ /100** |

| Band | Score | Read |
| ---- | ----- | ---- |
| **Exceptional** | 90–100 | Ships it *and* reasons about trade-offs, races, security unprompted. Hire-ready. |
| **Strong** | 75–89 | Solid build, understands his own code, minor gaps. Capstone passed comfortably. |
| **Competent** | 60–74 | Works end-to-end but shallow understanding in places (often security/races/realtime). Pass with notes. |
| **Developing** | 45–59 | Partial flow, leans on copied patterns he can't fully explain. Needs rework before sign-off. |
| **Not yet** | <45 | Major phases missing/broken or can't explain core decisions. |

**Auto-flags regardless of score** (each warrants a conversation):
- Secrets in git history → security fail
- RLS disabled / service key client-reachable → security fail
- Single "initial commit" dump → process fail
- Can't explain the data model or a security choice in conversation → fails the client's explicit sign-off bar
- Active-match restore via localStorage instead of server state → misunderstood the core requirement

---

## Grading-day checklist
- [ ] Clone fresh, follow README only — does it run?
- [ ] `git log --oneline` — scan commit quality + incrementality
- [ ] `grep` history for secrets
- [ ] Open two browsers, run the full flow with test accounts
- [ ] Mid-match: kill a browser, sign back in — does it restore?
- [ ] Try to break permissions (guest queue, no-Steam queue, double-queue)
- [ ] Read the RLS policies and the match-creation code together
- [ ] Run the oral exam with code open
- [ ] Tally, band, write 3 strengths + 3 things to fix
