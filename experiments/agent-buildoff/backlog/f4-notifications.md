# Feature f4: Notifications

Maintain a per-member notification list driven by activity.

- React to `mention.created` activity: append a notification to the mentioned
  member's list with `{ kind: "mention", commentId }`.
- React to `task.assigned` activity: append a notification to the assignee's
  list with `{ kind: "assignment", taskId }`.
- `GET /members/:id/notifications` → 200 with that member's notifications
  (creation order). 404 if the member does not exist.

Notifications MUST be produced by reacting to activity, not by callers invoking
notifications directly.
