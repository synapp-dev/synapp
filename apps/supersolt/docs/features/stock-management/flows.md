# Stock management — User flows

## Stock counts — happy path

| # | User does | System does |
|---|-----------|-------------|
| 1 | Opens stock counts | List periods |
| 2 | Starts count | Draft session |
| 3 | Enters quantities | Saves lines |
| 4 | Submits | Locks count; feeds insights |

## Waste — happy path

| # | User does | System does |
|---|-----------|-------------|
| 1 | Opens waste | List recent |
| 2 | Logs waste | Persists with ingredient + qty |

## Error states

| Trigger | UI |
|---------|-----|
| Permission denied | Toast |
| No ingredients | Empty state CTA to catalog |
| Submit incomplete count | Validation |
