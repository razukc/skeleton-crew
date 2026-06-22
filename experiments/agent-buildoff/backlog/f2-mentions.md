# Feature f2: Mentions

When a comment's text contains `@<member-name>` for an existing member, record
a mention.

- On comment creation (f1), scan the text for `@name` tokens. For each token
  matching an existing member's name, record an activity entry of kind
  `mention.created` with data `{ commentId, memberId }`.
- `GET /members/:id/mentions` → 200 with an array of `{ commentId }` for that
  member (creation order). 404 if the member does not exist.
