# Feature f3: Task assignment

Assign a task to a member.

- `POST /tasks/:id/assign` with body `{ "memberId": string }` → 200 with the
  updated task including `{ "assigneeId": string }`. 404 if task or member is
  missing.
- `GET /tasks/:id` MUST now include `assigneeId` (null when unassigned).
- Assignment MUST record an activity entry of kind `task.assigned` with data
  `{ taskId, memberId }`.
