# Modification: tasks gain a required `priority`

Change the `tasks` feature so every task has a `priority` of `"low" | "med" | "high"`.

- `POST /tasks` body now accepts `{ "title": string, "priority": "low"|"med"|"high" }`.
  If `priority` is omitted, default to `"med"`.
- `GET /tasks` and `GET /tasks/:id` MUST include `priority`.
- The `task.created` activity entry's data MUST include `priority`.
- All existing task-related features (assignment f3, tags f5, search f6, comments
  f1) MUST continue to pass their oracles unchanged.
