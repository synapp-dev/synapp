# Veritas — community karma (Phase 2)

> **Product:** `apps/intradark`
> **Slug:** `community-karma` (child of [`veritas-legitimacy`](../plan.md))
> **Status:** Stub — run `/build-feature` grill pass before implementation
> **Created:** 2026-06-11

## Summary

Add axis **D (Community karma)** via `player_trust_events` (vouches/reports), server actions with forums-style `{ ok, data } | { ok: false, code }`, score-weighted aggregation, and anti-gaming (sybil resistance, caps, decay, collusion detection). Wire into `computeLegitimacy` and recompute on trust events.

## Deferred until grill pass

- Full `plan.md`, `tdd.md`, `flows.md` triad
- RBAC for who may vouch/report
- Report reason categories + demo corroboration weight

## Reference

- [`docs/veritas-algorithm.md`](../../../veritas-algorithm.md) — Karma section
- Parent Phase 1: [`../plan.md`](../plan.md)
