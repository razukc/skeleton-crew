# Parallel B: Activity filtering by kind

- `GET /activity?kind=<k>` → 200 with only the activity entries whose `kind`
  equals `k` (order unchanged). When `kind` is absent, behavior is unchanged.
- This feature reads and shapes the activity hotspot. It records no new activity.
