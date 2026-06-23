# Feature f5: Tags

Tag tasks with free-form labels.

- `POST /tasks/:id/tags` with body `{ "tag": string }` → 200 with the updated
  task including `{ "tags": string[] }` (deduped, insertion order). 404 if the
  task is missing.
- `GET /tasks/:id` MUST include `tags` (empty array when none).
- `GET /tags/:tag/tasks` → 200 with the array of tasks carrying that tag.
- Tagging MUST record an activity entry of kind `task.tagged` with data
  `{ taskId, tag }`.
