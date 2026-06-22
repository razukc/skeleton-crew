# Feature f1: Comments on tasks

Add the ability to comment on a task.

- `POST /tasks/:id/comments` with body `{ "author": string, "text": string }` →
  201 with `{ "id": string, "taskId": string, "author": string, "text": string }`.
  404 if the task does not exist.
- `GET /tasks/:id/comments` → 200 with an array of that task's comments (in
  creation order). 404 if the task does not exist.
- Creating a comment MUST record an activity entry of kind `comment.created`
  with data `{ taskId, commentId }`.
