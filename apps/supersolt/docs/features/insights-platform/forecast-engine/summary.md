# Forecast Engine — Launch summary

> Predictive infrastructure: daily revenue, orders, and avg-check forecasts per venue — no UI; feeds Sales, Dashboard, Agent, and future modules. [Forecast Engine (Notion)](https://www.notion.so/35664094bde68165a84dfc43022e8bee)

**Legend:** `[Blocker]` = launch gate · `[Post-launch]` = can follow · `(UI)` = demo/seeded OK · `(Live)` = real data required

## Data model

- [ ] **[Blocker] (Live)** `daily_sales` table migrated with channel split columns
- [ ] **[Blocker] (Live)** `forecasts` table: revenue, orders, avg_check × 14-day horizon
- [ ] **[Blocker] (Live)** `venue_forecast_state`: backfill status, available history days, `forecast_ready`
- [ ] **[Blocker] (Live)** `forecast_accuracy_log`, `anomaly_resolutions` tables
- [ ] **[Blocker] (Live)** AU public + school holiday calendar tables seeded
- [ ] **[Blocker] (Live)** `bom_weather_forecasts` cache table
- [ ] **[Blocker] (Live)** RLS: authenticated venue read; service_role write

## Historical ingestion

- [ ] **[Blocker] (Live)** Square full-history backfill on Connect POS (not cut off by account age)
- [ ] **[Blocker] (Live)** Idempotent batch upsert; resume from cursor on crash
- [ ] **[Blocker] (Live)** Rate-limit handling with exponential retry
- [ ] **[Blocker] (UI)** Backfill progress API for Sales/Dashboard UI ("6 of 24 months")
- [ ] **[Blocker] (Live)** `data_starts_from` optional benchmark scope only (default: all history)

## Compute pipeline

- [ ] **[Blocker] (Live)** Multiplicative model: 8-weekday baseline × seasonality × holidays × weather × trend
- [ ] **[Blocker] (Live)** Daily 4am venue-local cron (Edge Function + `pg_cron` fallback)
- [ ] **[Blocker] (Live)** Post-sync recompute when yesterday actual arrives
- [ ] **[Blocker] (Live)** Manual recompute API rate-limited (1/hr)
- [ ] **[Blocker] (Live)** Event triggers: settings change, trading hours, anomaly resolution, backfill complete

## Cold-start & confidence

- [ ] **[Blocker] (Live)** 0–13 days history → no forecast (`forecast_ready: false`)
- [ ] **[Blocker] (Live)** 14–27 Low · 28–41 Medium · 42+ High confidence bands
- [ ] **[Blocker] (Live)** Existing Square user with 42+ days backfilled → High from day one in app

## Anomaly detection

- [ ] **[Blocker] (Live)** Flag ±15% actual vs forecast; write `insights_alerts`
- [ ] **[Blocker] (Live)** Operator one-off confirmation via Agent → permanent baseline exclusion
- [ ] **[Blocker] (Live)** Unconfirmed after 7 days → default include in baseline

## Read APIs

- [ ] **[Blocker] (Live)** GET forecasts range
- [ ] **[Blocker] (Live)** GET daily-sales range
- [ ] **[Blocker] (Live)** GET forecast state / backfill status
- [ ] **[Blocker] (Live)** POST recompute (admin)

## Consumer outcomes

- [ ] **[Blocker] (Live)** Sales KPI deltas appear when `forecast_ready`
- [ ] **[Post-launch] (Live)** Dashboard demand-vs-actual tile (MVP.1)
- [ ] **[Post-launch] (Live)** Agent forecast-miss notifications (MVP.5)
- [ ] **[Post-launch] (Live)** Roster labour budget, Order Guide, Prep lists (MVP.2–4)

## Rollout

- [ ] **[Blocker] (Live)** `FORECAST_ENGINE_ENABLED` env gates cron/compute
- [ ] **[Blocker] (Live)** Per-venue `forecast_ready` set after backfill + min history
- [ ] **[Post-launch] (Live)** Weekly MAPE accuracy logging (internal only)
