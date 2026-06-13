# Purchasing — User flows

## Suppliers — happy path

| # | User does | System does |
|---|-----------|-------------|
| 1 | Opens suppliers | Lists suppliers |
| 2 | Adds supplier + products | Persists ABN, products, ingredient map |
| 3 | Sets active product per ingredient | Marks active source |

## Orders — happy path

| # | User does | System does |
|---|-----------|-------------|
| 1 | Opens order guide | Forecast-based suggestions |
| 2 | Creates PO | Draft PO per supplier |
| 3 | Submits PO | Email out (when implemented) |

## Error states

| Trigger | UI |
|---------|-----|
| No suppliers | Empty + link onboarding/settings |
| Forecast missing | Degraded suggestions label |
| Permission denied | 403 |

## Cross-module

- Invoice confirm updates supplier product price → recipe GP (see invoices-module flows).
