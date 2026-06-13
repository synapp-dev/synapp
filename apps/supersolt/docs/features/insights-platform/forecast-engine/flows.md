# Forecast Engine — Flows

> No end-user UI. Operational and consumer-visible outcomes.

## 1. Happy path — daily compute

| # | Actor | System |
|---|-------|--------|
| 1 | Cron 4am venue-local | Load venue timezone |
| 2 | — | Read `daily_sales` through yesterday |
| 3 | — | Fetch weather cache + holidays for horizon |
| 4 | — | Write 14×3 `forecasts` rows |
| 5 | — | Compare yesterday actual vs forecast; flag anomaly if ±15% |

## 2. Happy path — Square backfill

| # | Actor | System |
|---|-------|--------|
| 1 | Operator completes Connect POS | Enqueue backfill job |
| 2 | — | Paginate Square orders; batch upsert `daily_sales` |
| 3 | UI (Sales/Dashboard) | Show progress "6 of 24 months" |
| 4 | Job complete | Set `forecast_ready`; full recompute |

## 3. Error states

| Trigger | Outcome | Recovery |
|---------|---------|----------|
| Square rate limit | Backfill pauses; resumes | Exponential retry |
| BOM API down | Generic weather multiplier | Log; use generic |
| Compute failure for one venue | Skip venue; alert ops | Manual recompute |
| Partial backfill crash | Resume from cursor | Idempotent batches |

## 4. Alternate flows

### Anomaly confirmation (Agent)

Operator confirms one-off → `anomaly_resolutions` → exclude date from future baselines permanently.

### Unconfirmed anomaly after 7 days

Default `include_in_baseline` per Notion.

### Post-sync re-run

Square webhook completes → recompute yesterday forecast + actual comparison.

### Manual recompute

Settings or API POST; second call within 1hr → rate limited.

## 5. Consumer-visible outcomes

- Sales KPI deltas appear when `forecast_ready`.
- Cold-start banner when `<14` days available history.
- Low/Medium badges on tiles when 14–41 days.

## 6. Acceptance

- [ ] Tests #1–12 in [`tdd.md`](tdd.md) green.
- [ ] Backfill progress API returns consistent counts.
- [ ] Sales can read forecasts for a seeded 42-day venue.
