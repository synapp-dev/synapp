# Forecast Engine

> **Product:** `apps/supersolt`
> **Slug:** `insights-platform/forecast-engine`
> **Parent:** [`../plan.md`](../plan.md)
> **Status:** Planned
> **Created:** 2026-05-21
> **Updated:** 2026-05-22

## 1. Summary

The Forecast Engine is the predictive intelligence layer of Supersolt. It generates daily forecasts of **revenue**, **orders**, and **average ticket size** per venue; those forecasts feed Sales Insights KPI deltas, Dashboard tiles, Roster labour budgets, Order Guide demand, P&L trajectory, and Agent insights.

Forecasting is **foundational infrastructure** (scheduled job → canonical `forecasts` table → many consumers), not a Sales sub-feature.

**Core principle:** Pull every byte of historical data the integration provides. A customer with years of Square history should have **High** confidence from day one after backfill. Cold-start applies only when **available history** is genuinely short.

**Personas:** No direct UI — consumed by operators via Sales, Dashboard, Agent; built/tuned by platform team.

**Notion:** [Forecast Engine (Module Overview)](https://www.notion.so/35664094bde68165a84dfc43022e8bee)

## 2. Scope

### In scope

- Daily forecast: revenue, orders, average ticket; **14-day** forward horizon
- Multiplicative model: trailing baseline × monthly seasonality × public holidays × school holidays × weather × trend
- Per-venue learned multipliers; cold-start Low / Medium / High by available history days
- Anomaly detection ±15%; operator one-off confirmation via Agent
- Accuracy logging (MAPE, internal)
- Scheduled orchestration: 4am venue-local, post-sync, event triggers, backfill completion, manual recompute (1/hr)
- Canonical `forecasts` table; AU holiday + school calendars; BOM weather
- Square **full-history** backfill (not cut off by `data_starts_from` unless operator sets benchmark scope)

### Out of scope (Phase 2)

- Hourly granularity; per-item / per-channel forecasts; operator promo bumps; ML models; customer-facing accuracy UI; multi-country beyond AU

### Non-goals

- Forecast computation inside Sales route handlers
- Shared cross-product package ([ARCHITECTURE.md §5.1](../../../../../ARCHITECTURE.md))

## Notion specification

### User flows

*(Infrastructure — no end-user flows on the engine itself. Consumers document UX.)*

### Intended functionality

**Model (worked example):** Baseline = average of last 8 same weekdays → multiply by holiday (×1 or holiday baseline swap), school holiday (venue-learned), weather (venue-learned or generic in cold-start), monthly seasonality, trend (90-day). Produces three metrics per venue per day.

**Historical ingestion:** On Square connect, backfill entire order history to `daily_sales`; progressive UI on Sales/Dashboard; recompute on completion. `data_starts_from` = optional **benchmark scope** only (default null = use all history).

**Cold-start:** 0–13 days available → no forecast; 14–27 Low; 28–41 Medium; 42+ High. Backfill length determines starting band, not Supersolt account age.

**Computation:** Daily 4am local; post-sync when yesterday actual arrives; triggers on settings/trading hours/anomaly resolution/backfill; manual recompute rate-limited.

**Anomalies:** ±15% flag → Agent + optional operator one-off exclusion (permanent); unconfirmed after 7 days → include in baseline.

**MVP forecast consumers (roadmap):** MVP.1 Sales/Dashboard demand-vs-actual; MVP.2 Roster labour budget; MVP.3 Order Guide reorder; MVP.4 Prep lists; MVP.5 Agent forecast-miss notifications. Phase 2/3 items catalogued in Notion (hourly, channel-split, compliance bundle P2.6, 13-week cash P2.7, etc.).

### Data + integrations

- **`forecasts`** — venue, date, metric, value, confidence, bounds, `inputs` JSON, anomaly flags
- **`daily_sales`** — aggregated from Square (live + backfill)
- **`forecast_accuracy_log`**, **`anomaly_resolutions`**
- **AU public/school holiday** tables; **BOM weather** cache
- **Square Orders API** — source of truth; scheduled job runner (Edge/cron)

### Other modules this touches

Connect POS, Setup Accounting (Xero full history precedent), Add Venues / Settings → Venues (`data_starts_from`, lat/lng), Settings → Organisation (industry sub-type), Settings → Integrations, Sales Insights, Dashboard, Agent, Workforce Roster, Purchasing Order Guide, Stock prep lists, Labour/Inventory/P&L (Phase 2).

## Open questions

- Backfill rate limits and orchestration; truncate history older than N years?
- Multi-merchant Square accounts — independent per org (confirmed)
- Backfill partial commit vs rollback (lean: idempotent batches)
- Generic weather multipliers by industry sub-type in cold-start
- Holiday calendar manual year 1 → external feed Phase 2
- Anomaly threshold tuning per venue/industry
- Operator retroactive edit of one-off resolution (Phase 2)
- Forecast horizon 14 vs 30 days
- Multi-venue rollup = sum of per-venue forecasts
- Mid-day "to-go" projection vs original forecast (Phase 2)
- Refunds/voids not forecast features

## Decision log

- *3 May 2026* — Foundational infrastructure; single `forecasts` table; pull all integration history.
- *3 May 2026* — Three metrics, daily, 14-day horizon; multiplicative model; per-venue multipliers.
- *3 May 2026* — Cold-start by available history; `data_starts_from` = benchmark scope only.
- *3 May 2026* — Anomaly ±15%; one-off exclusion permanent; 7-day default include.
- *3 May 2026* — 4am recompute + event triggers; MAPE internal only in MVP.
- *3 May 2026* — Backfill idempotent partial commits.
- *4 May 2026* — MVP consumers roadmap (5 workflows); P2.6 compliance bundle deferred; Phase 2/3 parking lot defined.

## 3. Architecture placement

| Decision | Choice | Section |
|----------|--------|---------|
| Location | `apps/supersolt/server/forecast/`, `entities/forecast/` | §7.1 |
| Migrations | `apps/supersolt/supabase/migrations/` | §8.1 |
| Jobs | Supabase Edge Function cron + optional `pg_cron` fallback | — |
| Auth | Service role for writers; authenticated read via RLS | §3.2 |

## 4. Data model

### `daily_sales`

```sql
CREATE TABLE public.daily_sales (
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  date date NOT NULL,
  revenue_cents bigint NOT NULL DEFAULT 0,
  orders_count integer NOT NULL DEFAULT 0,
  avg_check_cents bigint NOT NULL DEFAULT 0,
  refunds_count integer NOT NULL DEFAULT 0,
  refunds_value_cents bigint NOT NULL DEFAULT 0,
  voids_count integer NOT NULL DEFAULT 0,
  dine_in_revenue_cents bigint NOT NULL DEFAULT 0,
  pick_up_revenue_cents bigint NOT NULL DEFAULT 0,
  delivery_revenue_cents bigint NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'square',
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, date)
);
```

### `forecasts`

```sql
CREATE TABLE public.forecasts (
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  date date NOT NULL,
  metric text NOT NULL CHECK (metric IN ('revenue', 'orders', 'avg_check')),
  forecast_value numeric NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  confidence_lower_bound numeric,
  confidence_upper_bound numeric,
  inputs jsonb NOT NULL DEFAULT '{}',
  is_anomaly_flagged boolean NOT NULL DEFAULT false,
  anomaly_resolution text CHECK (anomaly_resolution IN ('one_off', 'include_in_baseline')),
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, date, metric)
);
```

### Supporting tables

- `forecast_accuracy_log` — weekly MAPE internal.
- `anomaly_resolutions` — operator confirmations.
- `au_public_holidays`, `au_school_holidays` — manual seed migrations.
- `bom_weather_forecasts` — lat/lng/date cache.
- `venue_forecast_state` — `backfill_status`, `available_history_days`, `forecast_ready`, `data_starts_from` (benchmark scope only).

### RLS

- **Select:** users with venue access (same as `venue_square_connections`).
- **Write:** `service_role` only for compute jobs.

### Migration ownership

- Path: `apps/supersolt/supabase/migrations/<timestamp>_forecast_engine.sql`
- Remote: **`user-supabase-supersolt-mvp`** `apply_migration` after review.
- Regenerate `apps/supersolt/utils/supabase/types.ts`.

## 5. API surface

| Operation | Surface | Path | Auth |
|-----------|---------|------|------|
| Read forecasts range | GET | `/api/organisations/[org]/venues/[venue]/forecasts` | session |
| Read daily_sales range | GET | `.../daily-sales` | session |
| Trigger recompute | POST | `.../forecasts/recompute` | session (admin) rate 1/hr |
| Backfill status | GET | `.../square/backfill-status` | session |
| Cron compute | Edge Function | `supabase/functions/forecast-daily` | service secret |

## 6. Compute pipeline

1. **Ingest:** Square orders → upsert `daily_sales` (sync + backfill).
2. **Inputs:** holidays, BOM weather, venue `data_starts_from` filter on baseline.
3. **Model:** per Notion worked example (8-weekday baseline, multipliers).
4. **Write:** upsert `forecasts` 14 days forward × 3 metrics.
5. **Anomaly:** compare yesterday actual vs forecast; write `insights_alerts` + flag row.
6. **Accuracy:** weekly job → `forecast_accuracy_log`.

## 7. Dependencies

- Square OAuth (`venue_square_connections`, existing sales services).
- Venue lat/lng + timezone (Settings → Venues).
- BOM API credentials in `.env.example`.

## 8. Implementation order

1. `feat(supersolt): add forecast engine migrations`
2. `feat(supersolt): daily_sales aggregation from Square`
3. `feat(supersolt): square historical backfill job`
4. `feat(supersolt): forecast compute pure functions + tests`
5. `feat(supersolt): forecast daily edge cron`
6. `feat(supersolt): forecasts read API`
7. `feat(supersolt): anomaly + insights_alerts writer`
8. `docs(supersolt): wire sales consumer` → [`../sales/plan.md`](../sales/plan.md)

## 9. Telemetry

| Event | Trigger |
|-------|---------|
| `forecast.backfill_started` | Connect POS |
| `forecast.backfill_progress` | Batch commit |
| `forecast.computed` | Daily job success |
| `forecast.anomaly_detected` | ±15% breach |
| `forecast.recompute_manual` | Settings/admin trigger |

## 10. Rollout

- Enable per venue when `forecast_ready=true` after backfill + ≥14 days history (or immediate High if 42+ days backfilled).
- **Backout:** stop cron; consumers show cold-start UI.

## 11. Cross-references

- [`tdd.md`](tdd.md), [`flows.md`](flows.md)
- Consumers: [`../sales/plan.md`](../sales/plan.md), [`../../dashboard/plan.md`](../../dashboard/plan.md)

## Compliance audit (program 2026-06-01)

| Notion | Status |
|--------|--------|
| Daily forecasts + backfill | **Partial** — migrations/jobs per plan |
| Order Guide consumer (MVP.3) | **Planned** — [`purchasing/plan.md`](../../purchasing/plan.md) |

**Updated:** 2026-06-01
