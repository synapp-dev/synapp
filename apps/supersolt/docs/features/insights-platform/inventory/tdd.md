# Inventory Insights — TDD

## 1. Test list

| # | Layer | Behavior | File |
|---|-------|----------|------|
| 1 | unit | Food cost % = cost / revenue | `food-cost.test.ts` |
| 2 | unit | Explained vs unexplained variance split | `variance.test.ts` |
| 3 | unit | Menu engineering quadrant classification | `menu-engineering.test.ts` |
| 4 | unit | Multi-venue rollup weighted average | `rollup.test.ts` |
| 5 | integration | Nightly aggregate job idempotent | `inventory-aggregate.int.test.ts` |
| 6 | integration | Summary API Demo flag | `inventory-api.int.test.ts` |
| 7 | component | Six tabs; Overview tiles tappable | `inventory-page.test.tsx` |
| 8 | component | Comparison toggle shows deltas | `inventory-compare.test.tsx` |
| 9 | e2e | No stock counts → Variance empty state CTA | `e2e/insights-inventory.spec.ts` |

## 2. Fixtures

Venue with approved stock count + waste entries vs empty venue.

## 3. Acceptance

Menu engineering quadrant renders four labeled quadrants; export produces CSV header with venue + period.
