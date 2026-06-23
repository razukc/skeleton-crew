# Feature f7: Reactions

React to activity entries with an emoji.

- `POST /activity/:id/reactions` with body `{ "memberId": string, "emoji": string }`
  → 201 with `{ "activityId": string, "memberId": string, "emoji": string }`.
  404 if the activity entry or member is missing.
- `GET /activity/:id/reactions` → 200 with the array of reactions for that
  entry. 404 if the entry is missing.
- Adding a reaction MUST itself record an activity entry of kind
  `reaction.added` with data `{ activityId, emoji }`.
