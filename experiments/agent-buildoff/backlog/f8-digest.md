# Feature f8: Digest

Aggregate a per-member digest across features.

- `GET /members/:id/digest` → 200 with
  `{ "memberId": string, "mentions": number, "assignments": number, "notifications": number }`
  computed from existing state: `mentions` = count of that member's mentions
  (f2), `assignments` = count of tasks assigned to them (f3), `notifications`
  = length of their notification list (f4). 404 if the member is missing.
- Digest reads only; it records no activity and adds no new state.
