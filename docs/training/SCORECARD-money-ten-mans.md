# Scorecard — `money-ten-mans` capstone

Candidate: ____________________  Reviewer: ____________________  Date: __________

Scores below are the **static code-review** assessment. Adjust any 🔴 item after live testing. `___` = fill during/after oral.

## Part 1 — Codebase (per item 0–2; phase avg × weight)

| Phase (weight) | Items (provisional) | Phase avg | × weight |
|---|---|---|---|
| **A — Foundation (3)** | run-from-README **0**, .env.example **0**, real shell **2**, folders **2** | 1.0 | **3.0** |
| **B — Accounts/Steam (7)** ★ | reg names **1**, signin **2**🔴, steam-link **1**, alias+avatar **2**, guest **1**, no-steam **1**, persona-only **2** | 1.43 | **10.0** |
| **C — Data/security (6)** | migrations **0**, map seed **1**, diagram **1**, RLS **1**, schema **1** | 0.8 | **4.8** |
| **D — Matchmaking (12)** ★ | join/leave **2**, configurable **1**, decline **1**, teams persist **2**, veto **2**, validation **1**, in-match block **1**, authoritative **2** | 1.5 | **18.0** |
| **E — Realtime (6)** | 2-browser **2**🔴, match-push **2**, ban-visible **1**🔴, reconnect/docs **1** | 1.5 | **9.0** |
| **F — Screens (8)** ★ | full journey **2**🔴, no-strand **2**, guest view **2**, **restore 2**, queue-block **1**, persona **2**, mobile **1**🔴 | 1.71 | **13.7** |
| **G — Polish (2)** | README demo **0**, leftover UI **1**, copy **1** | 0.67 | **1.3** |
| **H — Reliability (4)** | ≥3 tests **0**, strict TS **1**, live URL **0** | 0.33 | **1.3** |
| **Git hygiene (2)** ★ | **UNVERIFIABLE — no .git in deliverable; needs GitHub repo** | ? | **0.0*** |

**Raw ≈ 61 / 100  →  Codebase ≈ 30.5 / 50**  (*Git pending — could add up to +2 raw / +1 final*)

## Part 2 — Oral (see ANNOTATED-oral-exam-money-ten-mans.md)

| Q | Topic | Score /3 | Q | Topic | Score /3 |
|---|---|---|---|---|---|
| 1 | Schema | ___ | 8 | Alias enforcement | ___ |
| 2 | Source of truth | ___ | 9 | **Race** | ___ |
| 3 | Lifecycle | ___ | 10 | Team balance | ___ |
| 4 | **RLS / direct update** | ___ | 11 | Veto turn | ___ |
| 5 | **Act on others' behalf** | ___ | 12 | **Double-queue** | ___ |
| 6 | Service-role key | ___ | 13 | Realtime vs poll | ___ |
| 7 | **Steam OpenID** | ___ | 14 | Restore | ___ |

Oral raw ___ / (n×3) → normalize ___ / 50

## Part 3 — Final
| Component | Weighted |
|---|---|
| Codebase | ~30.5 / 50 |
| Oral | ___ / 50 |
| **Total** | **___ / 100** |

Bands: Exceptional 90–100 · Strong 75–89 · Competent 60–74 · Developing 45–59 · Not yet <45

## Auto-flags (each warrants a conversation)
- [ ] **No server-side authorization** — every API route trusts body `userId`; no session read. (Accept/decline/ban-as-anyone.)
- [ ] **Live secrets in deliverable** (`.env`/`.env.local`: real DB password, service JWT, Steam key) → **rotate**.
- [ ] **DB not reproducible from migrations** (matches/match_users absent; queue_entries stale).
- [ ] **Steam OpenID assertion unverified** (spoofable SteamID).
- [ ] **No transaction/lock in `tryCreateMatch`** (match-creation race).
- [ ] Git history: ____________ (verify against real repo).
- [x] RLS enabled ✅ · [x] Restore is server-side, not localStorage ✅ (these PASS).

## 3 strengths / 3 fixes
**Strengths:** 1) ____  2) ____  3) ____
**Fix first:** 1) Server-side auth on every route  2) ____  3) ____
