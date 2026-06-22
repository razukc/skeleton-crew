# Agent Build-Off — Findings

One live run, `claude-opus-4-8`, K=3 repeats per feature in Phase 1. The same
headless agent built the same 8-feature backlog two ways — as SCR plugins
(`scr-app/`) and as a competent Fastify monolith (`mono-app/`) — judged by one
frozen, arm-agnostic HTTP oracle suite. Predictions were pre-registered in
`PREDICTIONS.md` and committed before the run.

**Headline: this is a largely null / mildly pro-monolith result. 4 of 9
pre-registered predictions held, and the misses fall squarely on SCR's core
structural thesis.** That is a valid, publishable outcome — the experiment was
built to be able to say this, and the oracles were never edited to avoid it.

## Scorecard (4/9)

| # | Claim | Result |
|---|---|---|
| 1 | SCR tokens/feature at f1 HIGHER than mono (plugin ceremony) | ✅ |
| 2 | SCR tokens/feature LOWER than mono by f8 (containment amortizes) | ❌ |
| 3 | Cost crossover somewhere in f3–f6 | ❌ (transient crossover at f2, outside window, not sustained) |
| 4 | SCR read-surface roughly flat in N | ✅ |
| 5 | Mono read-surface grows in N | ✅ |
| 6 | Modification files-outside-target: SCR < mono | ❌ (SCR 2, mono 1) |
| 7 | Modification foreign breaks: SCR 0, mono > 0 | ❌ (both 0) |
| 8 | Parallel: SCR loud-and-local, mono silent | ❌ (both silent) |
| 9 | Fault containment: SCR contains both injected faults | ✅ |

## What held up

- **Plugin ceremony is real and measurable (P1).** SCR's first feature cost more
  than the monolith's — the boundary has an up-front tax.
- **SCR's read-surface stays flat as features accumulate (P4, P5).** The agent
  reads a roughly constant slice of the SCR codebase per feature, while the
  monolith's grows. This is the one comprehension-cost signal that pointed
  SCR's way — though the margins are small (a read or two) and should be read
  as suggestive, not robust.
- **Deterministic fault containment is SCR's one unambiguous structural win
  (P9).** A colliding action registration is rejected loudly with a typed
  `DuplicateRegistrationError`, and a throwing hotspot handler is contained to
  its caller while the runtime stays alive. The monolith offers these by
  convention; SCR offers them by construction. This is the only phase that
  exercises the *enforced* boundary, and it is fully deterministic and
  re-runnable.

## What did not — and why it matters

- **The token-amortization thesis is unsupported at N=8 (P2, P3).** SCR's
  cumulative cost never sustainably drops below the monolith's; by f8 it is
  *above* it (5.65M vs 5.54M tokens). There is a transient crossover at f2, but
  it is an artifact of a thin sample (see caveat 1) and sits outside the
  pre-registered f3–f6 window, so it does not confirm the hypothesis. At this
  app size, the boundary's verification savings do not outrun its ceremony cost.
- **Modification blast radius did not favor SCR (P6, P7).** Adding a `priority`
  field to `tasks` broke no foreign oracles in *either* arm (0/0), and SCR
  actually touched one *more* file outside the target than the monolith. That
  extra file is `host.ts` — SCR's centralized route-shim layer — which must
  forward the new field. SCR's shim indirection makes the route layer a second
  mandatory edit site for any request-schema change. The monolith co-locates its
  route with its handler and touched one fewer file. This is honest blast radius
  for *this* SCR layout, not domain coupling.
- **Parallel contention was silent in both arms (P8).** Two agents independently
  reshaping the activity-feed read path collided — and in *both* arms the
  collision was a silent last-writer-wins file clobber, not a loud conflict.
  Crucially, SCR's collision landed on `host.ts` (the shared route shim), and the
  monolith's on `features/activity.ts` (the shared handler). **SCR's enforced
  boundary protects the action/registry layer, not the HTTP route-wiring layer**
  — so contention that surfaces at routing clobbers just as silently in SCR. The
  registry conflict-detection that *would* fire loudly (and does, in Phase 4) is
  simply never reached, because both features edit a plain shared file rather
  than registering colliding actions.

## The thesis, restated honestly

SCR's bet is that an *enforced* boundary pays measurable rent — in agent
verification cost, blast radius, and safe parallelism — even when a competent
agent builds both sides. At an 8-feature task-tracker, **that rent did not show
up in the token, blast-radius, or parallel-contention metrics.** The one place
the enforced boundary demonstrably earns its keep is deterministic fault
containment: colliding registrations and throwing handlers are structurally
contained rather than conventionally avoided.

The sharpest lesson is about *where* the boundary lives. SCR enforces isolation
at the action/registry seam, but the experiment's app funnels every HTTP route
through a single shared `host.ts` shim. Both the Phase-2 extra-file count and the
Phase-3 silent clobber trace to that shared file — not to the runtime. **An
enforced boundary is only as strong as the narrowest shared file on the change
path.** A per-plugin route layout (rather than a central shim) would be the
honest next iteration to test whether SCR's isolation can extend to the routing
layer.

## Caveats (read the numbers with these)

1. **f2 is a thin SCR sample.** Two of three scr/f2 builder repeats timed out
   (recorded `ok=false`, 0 tokens). The honest f2 SCR figure (682,868) rests on
   the single surviving build. The raw harness initially let those two zeros
   collapse the median to 0 and fabricate a crossover at f2; the final-review
   pass fixed this (failed builds are now excluded from the median, and
   `crossoverIndex` skips features that lack a real build in either arm — see
   `harness/metrics.ts`). The corrected table shows the real 682,868, and the
   scorer now enforces the registered f3–f6 window, which is what flips P3 to ❌.
   This was a measurement bug in the rig, caught and fixed before publication —
   not a finding about SCR.
2. **One run, K=3 — a trend, not a proof.** Phases 1–3 are non-deterministic.
   Treat every Phase 1–3 number as a single sample. Only Phase 4 is deterministic
   and re-runnable.
3. **Both arms built by the same agent.** By design — this isolates the effect of
   the *boundary*, not of coder skill. It does not measure how SCR fares against a
   careless monolith author, which is a different (and easier) question.
4. **N=8, one app shape.** A task tracker with a single activity-feed hotspot.
   The amortization thesis is explicitly about scale; "no crossover at this size"
   leaves open whether one emerges at 30+ features or in a domain with more
   cross-cutting state. This run does not settle that — it bounds the claim.
