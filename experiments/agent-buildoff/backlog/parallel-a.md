# Parallel A: Activity pagination

- `GET /activity?limit=<n>&offset=<m>` → 200 with at most `n` activity entries
  starting at offset `m` (defaults: limit 50, offset 0). Order unchanged.
- This feature reads and shapes the activity hotspot. It records no new activity.
