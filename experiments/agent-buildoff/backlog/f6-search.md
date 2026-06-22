# Feature f6: Search

Search across tasks and comments.

- `GET /search?q=<term>` → 200 with `{ "tasks": Task[], "comments": Comment[] }`
  where tasks match on title (case-insensitive substring) and comments match on
  text. Empty term returns empty arrays.
- Search MUST read existing tasks (baseline) and comments (f1); it adds no new
  state and records no activity.
