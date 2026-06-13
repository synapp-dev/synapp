# Veritas — platform behavior signals (Phase 3)

> **Product:** `apps/intradark`
> **Slug:** `platform-behavior` (child of [`veritas-legitimacy`](../plan.md))
> **Status:** Stub — blocked on sandbox PUG ingest; run `/build-feature` grill pass before implementation
> **Created:** 2026-06-11

## Summary

Add in-platform ground-truth signals after the PUG loop ships: match completion vs dodges/abandons, reports-received-per-match, platform account age/activity. Recalibrate axis weights; extend `LegitimacyInput` and breakdown.

## Blocked on

- [`sandbox/pug-system/plan.md`](../../sandbox/pug-system/plan.md) — real match state + CS2 ingest

## Reference

- [`docs/veritas-algorithm.md`](../../../veritas-algorithm.md) — Phase 3
- Parent Phase 1: [`../plan.md`](../plan.md)
