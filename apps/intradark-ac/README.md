# Intradark Anticheat (`intradark-ac`)

Lightweight **user-mode** anticheat desktop client for the Intradark competitive
platform, built in **Tauri v2** (Rust core + React frontend). Design + decisions:
[`../intradark/docs/anticheat-client-build-decisions.md`](../intradark/docs/anticheat-client-build-decisions.md).

## ⚖️ VAC Safety Law (non-negotiable)

**This client NEVER touches the `cs2.exe` process** — no memory reads/writes, no
module enumeration of the game, no DLL injection, no hooks, no overlay. All system
inspection (attestation, scanning) uses **system-scoped** Windows APIs only — the
same calls Task Manager / AV make, which VAC has never banned anyone for. Do not add
any code that opens a handle to the game process.

## What it does (scope)

- Pairs the device to an Intradark account (deep link → device token in Credential Manager).
- Attests the environment (TPM / Secure Boot / IOMMU / VBS) — **informational only**.
- Heartbeats so the backend can gate match accept + kick a non-running client mid-match.
- Scans system processes / drivers / on-disk hashes against a server-delivered signature
  bundle; findings feed the admin review queue + Veritas. **Never auto-bans.**

## Build status

- ✅ **P0 scaffold** (this) — app shell, env attestation panel, Rust command surface.
- ⬜ P1 pairing · P2 real attestation reads · P3 heartbeat/gate · P4 RCON kick ·
  P5 scan engine · P6 admin/Veritas · P7 distribution (EV signing, auto-update).

## Prerequisites (one-time, your machine)

The Rust toolchain is **not** installed in this environment yet — the app can't be
compiled/run until you set it up:

1. **Rust** — install via [rustup](https://rustup.rs/) (`rustup-init.exe`).
2. **WebView2** — preinstalled on Windows 11.
3. **MSVC build tools** — "Desktop development with C++" from the VS Build Tools.
4. **App icons** — `pnpm tauri icon <path-to-logo.png>` (generates `src-tauri/icons/`,
   which is gitignored). Required before `tauri build`.

## Run

```bash
pnpm install            # from the monorepo root
cd apps/intradark-ac
pnpm tauri:dev          # launches the desktop app with HMR
# or, frontend only (browser, mock attestation):
pnpm dev
```

## Backend

The client talks to the Next app's `/api/ac/*` routes (in `apps/intradark`):
`pair`, `heartbeat`, `events`, `signatures`. Set `AC_PAIRING_SECRET` there (see its
`env.example`). DB tables ship in migration `0042_anticheat.sql`.
