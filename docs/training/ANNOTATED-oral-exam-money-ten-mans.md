# Annotated Oral Exam — `money-ten-mans` apprentice

Grounded in the actual code as of review. For each question: **what the code really does**, the **strong vs weak** band, **what he'll likely say** (given the code), and the **follow-up that finds his ceiling**. Score each 0–3.

> Golden thread to keep pulling: **there is no server-side authorization anywhere — every API route trusts `userId` from the request body and never reads the session.** Half the questions below lead here. How he handles that gap (owns it vs. doesn't see it) is the single biggest aptitude signal.

---

## A. Architecture & data modelling

### Q1 — Walk me through your schema. Why is each table shaped that way?
- **Code reality:** `user_profiles`, `queue_entries` (PK = userId), `matches` (kitchen-sink: status, currentTurn, bannedMaps[], selectedMap, connectString, captains, scores, timeoutCount), `match_users` (per-player status + team), `queue_penalties` (unused-ish). Bans are an **array column**, not rows. Map pool is **not** a table.
- **Strong:** clear entities, explains why `match_users` is separate rows (per-player accept state) not an array on `matches`.
- **Weak:** "I put match stuff in matches." Can't justify the array columns.
- **Push:** "Why are banned maps an array on `matches` instead of their own rows? What would rows give you?" (audit trail, who banned what, ordering). "Where's the map pool stored?" (it's hardcoded in TS, duplicated in `ban-map` route and `lib/maps.ts`).
- Score: ___/3

### Q2 — Single source of truth for match state? If two browsers disagree, who wins?
- **Code reality:** The DB row **is** authoritative; clients render from it; `current-match`/`match/get` read it. This is done well.
- **Strong:** "The `matches` row; clients are dumb renderers." ✅ expect a good answer here.
- **Push:** "Then why do you have `setInterval` polling AND realtime AND a Zustand store all tracking status?" (see Q13 — the store can drift from the DB).
- Score: ___/3

### Q3 — How is the lifecycle represented (queue→accept→lobby→veto→ready→live→done)?
- **Code reality:** A **plain `text` status field** with the states listed in a *comment*. No enum, no state-machine guard — transitions are scattered across `orchestrator.accept`, `ban-map`, `set-status`, dev routes. Nothing prevents an illegal jump (e.g. `completed` → `veto`).
- **Strong:** acknowledges it's a string convention, knows the legal transitions, can point to where each is enforced.
- **Weak:** thinks the comment enforces anything.
- **Push:** "What stops me setting a completed match back to `veto`? Show me the guard." (There isn't one — `set-status`/dev routes write freely.)
- Score: ___/3

---

## B. Security & permissions  ← push hardest, this is the weak spine

### Q4 — From the browser, can I `update` the matches table directly? Show me the RLS.
- **Code reality:** RLS **is** enabled on `matches`/`match_users`/`queue_entries` with `SELECT USING(true)` and **no INSERT/UPDATE/DELETE policies** → a direct Supabase write with the publishable key **is** blocked. Server writes go through a **direct `postgres://` connection (Drizzle)** that bypasses RLS. So far, good.
- **Strong:** explains exactly the above — RLS blocks client writes, server uses a privileged connection server-side only.
- **Weak:** "RLS is off" / "the UI prevents it."
- **🔑 Killer follow-up:** "OK, RLS blocks the *Supabase* client. So what stops me from `curl`-ing your `/api/match/accept` with another player's `userId`?" → **Nothing.** No route reads the session. If he sees this unprompted: 3. If he needs the nudge but then gets it: 2. If he insists it's safe: 1.
- Score: ___/3

### Q5 — How do you stop a player accepting or banning on someone else's behalf?
- **Code reality:** `accept` route does **no** identity check at all. `ban-map` checks the *supplied* `userId` is a captain & correct turn — but never that the **caller** is that user. So I can ban for the enemy captain by sending their id (readable via `USING(true)`).
- **Strong:** would describe checking `auth.uid()` is a participant + correct turn server-side. The honest version: "...I don't actually — the routes trust the body. That's a bug."
- **Weak:** "the ban-map route checks the captain" (true but misses that it checks the *claimed* id, not the *caller*).
- **Push:** "Where do you read who's actually logged in, in that route?" (nowhere — `req.json()` only).
- Score: ___/3

### Q6 — Where's the service-role key used, and why must it never reach the client?
- **Code reality:** Writes use `DATABASE_URL` via the `postgres` lib (server-only), **not** the service-role key. `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local` but I didn't find it imported in a write path — possibly **unused**. ⚠️ All three secrets in the env files are **real and live** (DB password, service JWT, Steam key).
- **Strong:** "service role bypasses RLS, server-only, game-over if leaked — but I actually use a direct DB connection for writes." Bonus if he flags the live secrets should be rotated.
- **Weak:** doesn't know what the key is or whether he uses it.
- **Push:** "Is that key even used? And those are real keys in the repo folder — what's your plan?" (Answer you want: rotate them.)
- Score: ___/3

---

## C. Auth & Steam identity

### Q7 — Walk me through Steam linking. What do you store and when?
- **Code reality:** `steam/login` → Steam OpenID → `steam/callback` reads `openid.claimed_id`, **splits the SteamID off the URL string, and trusts it** — it **never verifies the assertion** with Steam (`check_authentication`). Then fetches the profile and persists `steam_name`/`steam_avatar`/`url` at link time (✅ persisted, not re-fetched).
- **Strong:** OpenID round-trip, captures alias+avatar once, stored on profile. Top marks if he knows verification is required.
- **Weak:** hand-waves OpenID; thinks reading `claimed_id` *is* the verification.
- **🔑 Push:** "What stops me hitting your callback URL with `claimed_id` set to any SteamID I want?" → **Nothing — he'd link/spoof any account.** Real OpenID needs the verification POST back to Steam.
- Score: ___/3

### Q8 — Why Steam alias instead of signup name in the lobby — and where is that enforced?
- **Code reality:** Match UIs read `steamName`/`steamAvatar`. Signup names only go to auth `user_metadata.full_name`; there are **no first/last columns** on `user_profiles`, so signup names physically can't leak onto cards.
- **Strong:** product requirement + "the data layer doesn't even carry the legal name into match queries."
- **Weak:** "it's just what I display."
- **Push:** "Where do the registration first/last names actually live, and could they ever reach a lobby card?"
- Score: ___/3

---

## D. Matchmaking logic  ← push hard, the heart

### Q9 — Required count is 4. Five people click join in the same second. What happens?
- **Code reality:** `tryCreateMatch` does `select queue → check existing → insert match → insert match_users → delete queue` with **no transaction and no row lock** (`server/services/match-orchestrator.ts`). Two concurrent join requests can both read ≥4 and both create matches with overlapping players.
- **Strong:** names the race, describes a transaction + `SELECT ... FOR UPDATE SKIP LOCKED` or an atomic claim/advisory lock so only one match of 4 forms.
- **Weak:** "it just works" / "the safety check handles it" (it doesn't — the check runs before either insert commits).
- **🔑 Push:** "Show me the lock. Two requests are inside `tryCreateMatch` at the same millisecond — what serializes them?" → there's nothing. This is a real latent bug; how he reasons about it is the ceiling-finder for the whole project.
- Score: ___/3

### Q10 — How do you form two balanced teams? What if you have no skill rating?
- **Code reality:** Pure **queue-order split** — first 2 = teamA, last 2 = teamB. No skill field exists. Captains = first non-bot per team.
- **Strong:** documents the heuristic, sensible fallback, admits it's arbitrary without ratings (acceptable per brief Phase G).
- **Weak:** random with no acknowledgement that it's unbalanced.
- **Push:** "If you added Elo tomorrow, what changes — schema and split logic?"
- Score: ___/3

### Q11 — In veto, whose turn is it to ban? Can the wrong captain ban?
- **Code reality:** `matches.currentTurn` holds `teamA`/`teamB`; `ban-map` rejects if `currentTurn !== player.team` and if not captain. Turn is **server-derived** ✅. **But** identity is still the body's `userId` (see Q5), so a malicious client can supply the rightful captain's id.
- **Strong:** server-derived turn from the row, rejects wrong team/non-captain.
- **Push:** "Turn check is server-side — good. But who proves the request came from *that* captain and not me impersonating him?"
- Score: ___/3

### Q12 — How do you prevent someone already in a live match from queueing?
- **Code reality:** The `queue/join` route inserts **regardless**. The only guard is inside `tryCreateMatch`, which—if a selected player is in an active match—**returns null and blocks match creation for the whole group** (a griefing side-effect), rather than rejecting the queue insert. UI also routes them away.
- **Strong:** "server checks for an active match before the queue insert and rejects it."
- **Weak:** "the play page won't show the button" (UI-only).
- **Push:** "I POST straight to `/api/queue/join` while I'm mid-match. What happens to me, and what happens to the next group I get pulled into?"
- Score: ___/3

---

## E. Realtime & resilience

### Q13 — How does another browser learn someone joined the queue — and why not poll every 2s?
- **Code reality:** Genuine Supabase `postgres_changes` subscriptions (`use-match-realtime-bridge.ts`) ✅ — **and also** `setInterval` polling at 3000ms and 1200ms on the play page as "safety nets," plus no reconnect resync. Subscribes to whole tables, filters client-side.
- **Strong:** explains subscriptions + the latency/cost trade-off vs polling.
- **🔑 Push (he's exposed both ways):** "You *do* have realtime — so why the `setInterval` safety nets? What were they papering over?" A strong dev admits the realtime wasn't reliable enough and explains why; a weak one doesn't realize they're effectively polling anyway.
- Score: ___/3

### Q14 — User closes the browser mid-veto and logs back in. Which query runs, how do they land in the right step?
- **Code reality:** On load, `GET /api/user/current-match?userId=` filters `match_users` joined to `matches` where status ∈ active set; the play page then routes by stage to `/lobby/[matchId]`. **Server-side, not localStorage** ✅ — this is the cleanly-done headline requirement.
- **Strong:** describes exactly that — server lookup of the active match, route by `status`.
- **Push:** "Why server-side and not localStorage? What breaks if you'd used localStorage?" (different device, stale state, tampering). Expect a confident, correct answer here — this is his strongest area.
- Score: ___/3

---

## Ceiling-finders (bonus / tie-break)
- **5v5 — what changes, what doesn't?** Good answer: only `MATCH_SIZE` and team-split math; lifecycle/veto/realtime unchanged. (Tests whether he sees that `MATCH_SIZE` is the one config knob — and that the brief *required* it to be configurable, which he hardcoded.)
- **Accept timer with dodge penalties?** Note the schema already has `queue_penalties` + `timeoutCount`/`timedOutAt` scaffolding — ask why it's there and unused.
- **Weakest part of your design, fixed first?** Ideal honest answer: "no server-side auth." If he names it unprompted, that's a strong senior signal — bump the band.
- **10,000 users queue at once — first thing to break?** The unlocked `tryCreateMatch` + a single global queue scan on every join.

---

## Scoring
Pick ~12–14, sum, normalize to 50. Banding: 0 = no clue, 1 = buzzword/surface, 2 = solid, 3 = deep + reasons about trade-offs.

**Predicted exposure zones:** Q4/Q5/Q7/Q9/Q12 (auth + race). **Predicted strengths:** Q2, Q14 (source of truth, restore).
