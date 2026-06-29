# Anticheat Client — Build Decisions (grilling outcome)

> Decision record from a design grilling on 2026-06-28, for a **lightweight user-mode
> anticheat desktop client** for `apps/intradark`. Companion to the future build plan.
> Where this doc and any later plan disagree, **this doc wins** — it reflects choices made
> with the owner, grounded against the live repo (the PUG match loop, the Veritas legitimacy
> system, the redline RCON layer, and the CS2 event ingest).

---

## 0. Headline strategy

Ship a **Tauri** (Rust core + React/`@workspace/ui`) desktop client that gates competitive
play. It is **not** a wall against cheaters — it is a **tripwire + telemetry feed** whose real
power is *correlation with Veritas*. Build the thinnest honest slice (pair → attest → heartbeat
gate → kick → admin flags) before any anti-tamper or kernel ambition.

**The two non-negotiables that shaped every decision:**
1. **Never get a legitimate player VAC-banned** (see §1, the VAC Safety Law).
2. **Never break / falsely punish a legit player** — every ambiguous call resolves in the
   player's favor; bans are always human.

---

## 1. The VAC Safety Law (hard constraint, not a preference)

> **The AC client NEVER touches the `cs2.exe` process.** No `OpenProcess` for memory read/write,
> no module enumeration *of the game*, no DLL injection, no function hooking, no in-game overlay.

VAC bans for **game-process tampering**. We refuse that entire surface. All scanning is
**system-scoped** — the same OS calls Task Manager, Process Explorer, and every AV make, which
VAC has never banned anyone for. This holds even while the player later runs official Valve
matchmaking with our client in the background.

**Cost of the law:** we cannot see a cheat that lives *only* as injected memory inside `cs2.exe`
with zero disk/process/driver footprint. Accepted under posture (A) — that class is what
AC×Veritas correlation and (a future) kernel mode are for.

**To confirm at build time:** the VAC posture of our own MatchZy/Redline PUG servers (no explicit
`sv_vac`/`insecure` setting found in repo). Third-party league servers typically run VAC-insecure
since they bring their own AC; verify before launch.

---

## 2. Locked decisions

| # | Area | Decision |
|---|------|----------|
| Q1 | **Trust posture** | **(A) Deterrence + signal.** Client is honest-until-anomalous; forging takes effort that filters 90%+. Real net = AC × Veritas correlation. **Anti-tamper (integrity self-checks, obfuscation, challenge/response) deferred** to a later phase. No over-engineered heartbeat crypto. |
| Q2 | **The gate** | **(B) Hard at accept, surgical in-match.** No live AC session → can't accept (queue back-fills as a decline; least collateral). In-match heartbeat gap → backend **RCON-kicks that one steamid** (MatchZy pauses 5v4, player re-attests + rejoins), never cancels the match. In-match severity promotes soft→hard after a shakeout period. |
| — | **VAC** | See §1. Hard law. |
| Q3 | **Scan surface** | **(A) Loaded kernel drivers + system process list + on-disk SHA-256 hashes + window titles/classes.** Centerpiece = the **loaded-driver list** (kernel/DMA cheat vector). Signatures = **server-delivered versioned signed bundle**; client is dumb, **server owns detection logic**. (Module enum of *non-game* processes deferred.) |
| Q3b | **Performance** | Heavy pass (driver enum + hash unknown binaries) runs **once at accept/staging**, off the firefight path. In-match = **cheap process-list deltas only** (hash only new+unseen binaries). **Hash cache** keyed on path+size+mtime. Scanner on a **below-normal-priority background thread**, throttled. Zero per-frame work, zero `cs2` polling, zero memory reads. **Full inventory at session-start, deltas in-match.** |
| Q4 | **Auth / identity** | **(A) Deep-link pairing.** Logged-in browser → `intradark-ac://pair?code=…` → client exchanges short-lived code at `/api/ac/pair` for a long-lived **device token stored in Windows Credential Manager**. Steam identity rides along (account already Steam-linked). Heartbeats are authenticated; backend correlates **player→match server-side**. **No per-match token in the heartbeat path** (those stay scoped to MatchZy event ingest). |
| Q5 | **Liveness thresholds** | Heartbeat every **10s**. **Accept-gate freshness = 30s** (client actively asserts "ready" on queue open). **In-match kick at 90s of silence**, with warnings at **30s (client UI)** and **60s (MatchZy in-game chat)**. Re-attest before 90s clears the timer. **cs2-alive-but-AC-dead vs both-dead** treated identically (same 90s grace), difference only *logged* as a Veritas signal. |
| Q6 | **Distribution** | **EV code-signing cert** (instant SmartScreen reputation — mandatory for a day-one-required app) + **proactive AV/Defender false-positive whitelisting** + **Tauri signed auto-updater** for the binary. All **hard launch prerequisites** (an AC's process/driver enumeration looks like malware to AV heuristics). |
| Q7 | **Veritas feed** | **Tiered, never auto-bans.** Every finding → **admin review queue** (`ac_flags`). Confirmed (admin-reviewed) detections score hard; soft anomalies (unknown driver, repeated AC declines, frequent dropouts) auto-score lightly to flag who to scrutinize. **Environment attestation (TPM/SecureBoot/IOMMU/VBS) is informational/displayed only — NOT a gate, NOT an auto-penalty in v1** (auto-excluding older/disabled-TPM hardware punishes legit players); a "require TPM to play" toggle is a future per-cohort option. |
| Q8 | **Backend-down fail mode** | **Fail OPEN on backend unavailability**, marking those sessions/matches **"AC-unverified"** for admin visibility (a backend outage is *our* fault; a cheater can't force it on demand). **Not running the client still fails closed at accept** (clean local check). Fail-open covers only "client is trying, server isn't answering." |
| Q9 | **Data model** | Five tables (§3). Service-role-only writes — clients never touch the DB, everything via `/api/ac/*` (mirrors CS2 ingest). **No per-heartbeat table** (too much write volume, zero forensic value); heartbeats bump `ac_sessions.last_heartbeat_at` + counters, only deltas/findings become `ac_events`. |

---

## 3. Data model

- **`ac_devices`** — paired machines: `user_id`, hashed device token, OS fingerprint, `last_seen`,
  `revoked_at`. One player may pair multiple PCs.
- **`ac_sessions`** — one client run: `device_id`, `user_id`, `match_id?`, `app_version`,
  **embedded environment snapshot** (TPM/SecureBoot/IOMMU/VBS/OS-build columns), `last_heartbeat_at`,
  `status`. ← the gate reads `last_heartbeat_at`.
- **`ac_events`** — forensic findings: `session_id`, `user_id`, `match_id?`, `kind`
  (`signature_match`/`new_driver`/`env_snapshot`/`ac_dropout`/`kicked`/…), `severity`, `signature_id?`,
  `payload` jsonb, **composite dedupe key** (mirrors `match_events` — don't trust client-supplied IDs).
- **`ac_signatures`** — server-delivered detection list: `kind` (`hash`/`process_name`/`driver_name`/`window`),
  `value`, `severity`, `label`, `enabled`, `version`. Served as a versioned signed bundle.
- **`ac_flags`** — admin review queue: `user_id`, `event_id`, `status`
  (`open`/`reviewing`/`confirmed`/`dismissed`), `reviewed_by`, `resolution`. Feeds human-gated hard
  penalties into Veritas.

---

## 4. Integration points (existing repo)

- **Gate** → slots into the PUG state machine (`pending_accept → accepted → … → awaiting_connect → live`):
  accept requires fresh `ac_sessions.last_heartbeat_at`; `markConnected` unaffected for liveness.
- **Kick** → `rconExec` in `entities/redline/lib/rcon.ts` (`kickid <steamid>` after a `status` parse,
  same technique as connect-tracking).
- **Ingest** → new `/api/ac/*` routes mirror `/api/cs2/events`: zod, **fail-closed bearer**
  (`lib/cs2-ingest-auth.ts` pattern), idempotent composite dedupe.
- **Veritas** → AC summary rolls into `LegitimacyInput`; `collectPenalties`
  (`entities/players/lib/legitimacy/penalties.ts`) emits AC penalties only from **confirmed** flags +
  soft auto-signals. Environment stays out of the penalty path.
- **App location** → new `apps/intradark-ac/` sibling (native build target; Tauri frontend reuses
  `@workspace/ui`).

---

## 5. Suggested phased build (to expand into a full plan)

- **P0 — Scaffold.** `apps/intradark-ac/` Tauri app; window chrome matching the FACEIT-style
  reference; dev-unsigned build; `/api/ac/*` route skeleton (fail-closed bearer).
- **P1 — Pairing + device token.** `intradark-ac://` protocol handler; `/api/ac/pair`; Credential
  Manager storage; `ac_devices`.
- **P2 — Environment attestation.** Rust TPM/SecureBoot/IOMMU/VBS reads; the green/red panel;
  `ac_sessions` env snapshot (informational).
- **P3 — Heartbeat + accept gate.** 10s heartbeat; `last_heartbeat_at`; gate wired into accept
  (fail-open on backend-down + "AC-unverified" marking).
- **P4 — In-match kick.** 90s-silence detection in the resolver/ingest; warnings (client UI + MatchZy
  chat); `kickid` via RCON; re-attest/rejoin.
- **P5 — Scan engine.** System process/driver enum + on-disk hashing; hash cache; background
  low-priority thread; `ac_signatures` server bundle; `ac_events`.
- **P6 — Admin review + Veritas.** `ac_flags` queue UI; confirmed→hard-penalty wiring; soft
  auto-signals into `LegitimacyInput`.
- **P7 — Distribution.** EV cert; AV whitelisting; Tauri signed auto-updater; installer.

**Anti-tamper, module-enum of non-game processes, and any kernel ambition are explicitly post-v1.**

---

## 5.1 Implementation status (2026-06-28)

Built P0–P6 in one pass. **Web/backend fully typechecks (0 errors) + 21 unit tests
pass; the Tauri frontend renders + typechecks. Rust is written but UNCOMPILED (needs
`rustup`).** Nothing is applied to the live DB yet.

**Backend / web (`apps/intradark`) — verified:**
- Migration `drizzle/0042_anticheat.sql` (renumbered from 0040 — collision with
  parallel 0040_news_views/0041_utility_editor_role) + drizzle defs. **Unapplied.**
- `/api/ac/{pair,heartbeat,events,signatures}` + `lib/ac/*` (device-token auth,
  dedupe, pairing JWT, gate, server-side event writes). Pure helpers unit-tested.
- **P1 web:** `entities/anticheat/actions.ts` (`createAcPairingLink`/`getAcStatus`)
  + Settings → Anticheat card (`app/(main)/settings/anticheat-card.tsx`).
- **P3 gate:** wired into `/api/match/[id]/accept` behind `AC_GATE_ENABLED` (default
  off), fail-open on backend-down with `recordUnverifiedAccept`.
- **P4 kick:** `entities/anticheat/lib/server/kick.ts` (`sweepAcKicks`,
  `parseStatusUserIds`) wired into the resolver; activates with `AC_GATE_ENABLED` +
  provisioned live servers (P4 of the PUG loop).
- **P6 Veritas:** `acConfirmedDetections` → `LegitimacyInput` → `collectPenalties`
  (`ac_confirmed_detection`, confirmed-only). Admin queue at `/admin/anticheat`
  (developer-gated) with confirm/dismiss → recompute.

**Client (`apps/intradark-ac`) — written, needs `rustup` to compile:**
- **P2 attestation:** `src-tauri/src/attestation.rs` — single PowerShell pass
  (Confirm-SecureBootUEFI / Get-Tpm / DeviceGuard CIM) → JSON.
- **P1 pairing:** deep-link (`intradark-ac://`) + single-instance forwarding in
  `lib.rs`; device token in Credential Manager (`secrets.rs`, keyring).
- **P5 scan:** `scan.rs` — Get-Process + driver CIM enumeration, on-disk SHA-256 with
  a path+size+mtime cache. **VAC-safe: never touches cs2.exe.**
- **P3 loop:** React orchestrator (`src/lib/use-anticheat.ts` + `ac-client.ts`):
  pair → heartbeat (10s) → fetch signature bundle → scan (5m) → match → report.

**Launch prerequisites still owner-side:** EV cert, AV whitelisting, privacy/EULA,
PUG-server VAC posture, signature sourcing (§6). AC can ship after launch.

---

## 6. Open / to-confirm at build time
- VAC posture of our MatchZy/Redline PUG servers (§1).
- Exact RCON kick invocation on the live box (`kickid` vs `css_kick`/MatchZy command form).
- Signature sourcing — where the initial cheat hash/driver/process list comes from (curated +
  community feeds).
- EV cert procurement (hardware token / cloud HSM) — lead time is a launch dependency.
- Tauri Windows API crates for TPM/SecureBoot/driver enum (`windows` crate coverage).
