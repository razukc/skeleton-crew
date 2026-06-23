# Agent Build-Off — Does SCR's Boundary Pay Off When AI Agents Build the App?

**Date:** 2026-06-22
**Status:** Approved (design); pending implementation plan
**Topic:** A controlled experiment that tests skeleton-crew's core bet — *enforced feature isolation* — in the agent era, by having the same AI-agent harness build the same feature backlog two ways (SCR-plugins vs. a competent monolith) and measuring verification cost, cross-feature blast radius, and safe parallelism.

## Why this experiment exists (context)

SCR was built to solve a *human* problem: onboarding to a large app is slow, so isolate features behind a plugin contract to shrink what a newcomer must understand, and cap the blast radius of a change. The "understand the whole codebase first" tax was the motivating pain.

The agent era inverts which half of that thesis matters:

- **Comprehension cost weakened.** Reading and tracing a codebase is among an agent's *cheapest* operations. The onboarding tax SCR was built to dodge is largely a human tax.
- **Verification cost strengthened.** Producing a change is fast for an agent; *proving it didn't break something elsewhere* is the expensive, failure-prone part. A bounded plugin interface caps what must be re-verified.
- **A new pillar — safe parallelism.** What makes N concurrent agents safe (no shared-state races, no merge clobbers, loud-and-local conflicts instead of silent-and-spread) is exactly SCR's plugin boundary. SCR was designed for one human's comprehension; it may be even better suited to a *swarm* of agents that need contracts, not conversations.

This experiment asks, and tries hard to *answer with numbers*: **when an AI agent (or several in parallel) incrementally builds and modifies an app, does SCR's enforced boundary measurably reduce verification cost and contain blast radius — and at what feature count, if ever, does its overhead amortize?**

It is the sibling of `experiments/hotswap-stress/`: same discipline (frozen oracles, honest "a null result is a valid finding" calibration, generated `RESULTS.md`), applied to a different claim. Where the stress harness tested the runtime *mechanically* under load, this tests the *development-time* bet with a live agent in the loop.

## What "SCR's actual bet" means here (the framing the whole experiment rests on)

SCR **forces** isolation; a monolith **permits** coupling. A capable agent *could* write a well-isolated monolith. So this experiment is **not** "good code vs. bad code." It is: **does the enforced boundary pay off even when a competent agent builds both sides?** That is SCR's real wager, and it is the only framing that isn't rigged. Every fairness control below exists to protect it.

The predicted shape of the result: SCR's advantage is **small or negative for early features** (plugin ceremony is real overhead) and **grows with N** as accumulated coupling makes the Nth monolith feature costlier to reason about and safer-to-break. The **slope over N**, not any single feature, is the signal. A flat slope is a real null result.

## Architecture: two arms at functional parity

Both arms live under `experiments/agent-buildoff/`, are Fastify apps, expose **identical HTTP contracts**, and start seeded with the **same 3 baseline features**. An external, black-box oracle suite runs unmodified against either arm — that identical HTTP surface is what makes the comparison apples-to-apples.

```
experiments/agent-buildoff/
├── README.md
├── package.json              # workspace root for the rig; scripts orchestrate phases
├── PREDICTIONS.md            # pre-registered, committed BEFORE any agent runs (lever 7)
├── backlog/                  # the fixed feature specs, fed verbatim to BOTH arms
│   ├── baseline/             #   3 seed features (built by us, not agents)
│   ├── f1.md … f8.md         #   ~6–8 build-off features (agent-built)
│   ├── modify.md             #   the Phase-2 modification spec
│   └── parallel-a.md, parallel-b.md  # the two contending features (Phase 3)
├── scr-app/                  # ARM 1: every feature is an SCR plugin (collab-hub pattern)
│   ├── src/host.ts           #   Fastify host; routes are runAction shims
│   ├── src/plugins/*.ts      #   one plugin per feature
│   └── src/store-plugin.ts   #   in-memory store as a service (the shared hotspot)
├── mono-app/                 # ARM 2: a COMPETENT monolith (the control)
│   ├── src/server.ts         #   Fastify; per-feature route modules
│   ├── src/store.ts          #   shared mutable store module (the shared hotspot)
│   └── src/features/*.ts     #   one route module per feature
├── oracles/                  # FROZEN, arm-agnostic black-box HTTP tests (lever 6)
│   └── *.oracle.ts           #   authored from specs before the build; never touched by builders
└── harness/
    ├── builder.ts            # dispatches a sandboxed building subagent for one feature+arm
    ├── instrument.ts         # captures tokens, opened-files, touched-files, oracle results
    ├── faults.ts             # Phase-4 deterministic fault injectors (no agents)
    ├── phases.ts             # phase orchestration (sequential, modify, parallel, fault)
    └── run.ts                # entry point → writes RESULTS.md
```

**The monolith must be competent**, not a strawman: Fastify + a shared `store.ts` + per-feature route modules — the structure a good developer writes. A rigged monolith makes a clean SCR result worthless.

**The baseline (3 seed features) is built by us, identically in spirit across arms**, so every agent run starts from a real, already-coupled app — not a blank slate.

## Fairness controls (non-negotiable)

These are what make any result mean something. (Levers 1, 2, 5, 6 are load-bearing; without them the experiment either doesn't bite or isn't fair.)

- **Identical feature specs (lever 6 input).** Each backlog feature is one spec doc in `backlog/`, fed *verbatim* to both arms. The only difference the agent sees is which codebase it opens and which architectural convention it follows.
- **Identical agent harness.** Same prompt template, same model, same tool set, same per-feature token-budget ceiling. One instrument, two arms.
- **Sandboxed builders.** A building subagent sees **only** its arm's codebase plus the one feature spec. It never sees the oracle suite, the other arm, or the metrics. That isolation keeps the instrument honest.
- **Frozen, arm-agnostic oracle suite (lever 6).** Black-box HTTP oracles, derived from the feature specs, written **once before the build**, committed, never edited by the building agents, run unmodified against both arms after every feature lands.
- **Honest debit accounting (lever 5).** SCR's real costs — plugin boilerplate, `runAction` indirection, the learn-the-contract tax — are counted as **SCR losses**. The experiment actively hunts the **crossover index**: the feature N where SCR's cumulative-cost slope dips below the monolith's. "Never, at this size" is a valid, publishable outcome that echoes the README's own "may be overkill for small apps."
- **Pre-registered predictions (lever 7).** Before any agent runs, `PREDICTIONS.md` records predicted *direction and rough magnitude* for each metric. Committed first. This is what makes a null result honest instead of explained-away.

## The backlog is engineered to make isolation matter (lever 1)

Independent-island features would make SCR's boundary pure ceremony and the monolith would never tangle — no contest. So the backlog has genuine cross-feature pull and **one shared-state hotspot**:

- A **hotspot resource** (e.g. an activity feed / counter / shared record) that *multiple* features read and mutate. This is where a monolith grows tendrils and SCR *forces* a service/event seam.
- **Read-across:** a later feature reads data an earlier feature owns.
- **React-across:** a feature subscribes to an event another emits.
- **Aggregate-across:** a feature aggregates over several others' data.

Feature specs are written so each new feature *wants* to touch prior ones — that pull is the independent variable.

## Phases (each phase lands specific levers)

**Phase 0 — Setup & pre-registration (lever 7).**
Build both baseline apps to identical HTTP contracts. Author the frozen oracle suite from the specs. Write and **commit** `PREDICTIONS.md` before anything else runs.

**Phase 1 — Sequential build-off (levers 1, 5, 6, 8, 9).**
For each backlog feature (~6–8), in each arm, dispatch a fresh sandboxed builder with the identical spec, **K=3 repeats**. After each landing, run the **entire** frozen oracle suite. Capture per (feature, arm, repeat): tokens spent, files the agent actually opened, files touched, and which *foreign* features' oracles broke.

**Phase 2 — Modification (lever 2).** *(The compounding money shot.)*
After the full backlog exists, issue `backlog/modify.md` ("feature 2's data shape changes now") to both arms. Measure blast radius: files touched **outside** feature 2, *other* features' oracles broken, tokens to re-verify. SCR containment should keep this roughly flat in N; the monolith should grow with N. **Single-shot per arm** (not K-repeated): it runs against the full post-backlog app, so the per-run cost is large and one comparison is informative enough — repeating it 3× × 2 arms is not worth the tokens.

**Phase 3 — Parallel contention (lever 3).**
Dispatch `parallel-a` and `parallel-b` — both touching the hotspot — **simultaneously** in each arm. Classify the outcome per arm: **silent** (monolith lost-update / merge clobber that oracles later catch) vs. **loud-and-local** (SCR clean compose, or an attributable `DuplicateRegistrationError` at registration). The bet is not "no conflicts" — it is "conflicts become loud-and-local instead of silent-and-spread." Capture the attributable error text when present. **Single-shot per arm**; the outcome here is a *category* (silent vs. loud), not a continuous metric, so a distribution adds little.

**Phase 4 — Fault injection (lever 4; the deterministic "B" half — no agents).**
Inject faults into a feature *other features depend on* (so there is a propagation path): a throwing action, corrupted shared state, a colliding plugin/route registration, and a leaky `dispose`. Measure cross-feature breakage via the oracle suite. SCR's rollback, cross-plugin ownership guard (`plugin-registry.ts` Finding-8 guard), and per-plugin `OwnedIds` cleanup should pin cross-feature breakage to **0**; the monolith's shared state should bleed. Fully reproducible.

## Metrics & instrumentation

| Metric | How captured | Lever |
|---|---|---|
| **Verification surface** | what the builder subagent *actually opened* (its Read/Grep targets, logged by `instrument.ts`) **plus** a static upper bound: shared-mutable-state reachable from the feature's entry point | 8 |
| **Tokens / feature** | subagent `usage.subagent_tokens`; report **median + spread** over K=3 | 9 |
| **Cross-feature breakage** | frozen oracle suite re-run after every landing; count failures in *foreign* features | 6 |
| **Modification blast radius** | git-diff scope outside the target feature + foreign-oracle breaks + re-verify tokens | 2 |
| **Parallel incidents** | classified silent vs. loud-and-local, with the attributable error captured | 3 |
| **Fault containment** | foreign-feature oracle failures after each injected fault (target = 0 for SCR) | 4 |
| **Crossover index** | the feature N where SCR's cumulative-cost slope drops below the monolith's, or "never at this size" | 5 |

**Lever 8 is the deepest measurement** and must not be diluted: do **not** "let both agents read everything and diff tokens" — that hides SCR's entire context advantage. Measure what each agent *must* open to ship safely; the token delta falls out of that asymmetry.

## Reporting

A single generated `RESULTS.md`:

- Per-phase tables (build-off, modification, parallel, fault).
- An ASCII slope of **cumulative cost over N** for both arms, with the **crossover index** marked (or annotated "no crossover at N=8").
- A **predictions-vs-outcomes** block scoring each pre-registered prediction hit/miss.
- **Honest-calibration clause** (carried from the stress harness): a **null or pro-monolith result is a valid, publishable finding.** If SCR's overhead never amortizes at this app size, the report says exactly that.

## Scope & deliverables

**Definition of done:**
- Both arms built to functional parity; frozen oracle suite green against both at baseline.
- `PREDICTIONS.md` committed before any agent runs.
- All five phases execute via the harness; `RESULTS.md` generated with every table, the slope chart, and the predictions scorecard.
- Phase 4 is deterministic and re-runnable.
- A clean trend **or** a null/pro-monolith result is an acceptable done state.

**Out of scope (YAGNI):**
- No production deployment, no persistence (in-memory stores both arms — keeps the instrument clean, matching the stress-harness rationale).
- No UI/dashboard — `RESULTS.md` is the artifact.
- No CI wiring — live-agent phases are non-deterministic and token-expensive; this is a run-on-demand experiment, not a gate.
- No claim of statistical significance — K=3 yields a **defensible trend**, not a theorem. Phases 1–3 are non-deterministic by construction; only Phase 4 is deterministic. This fidelity/reproducibility split is stated, not hidden.
- No second substrate app or second runtime — one app, two architectural arms.

## Honest limitations (stated up front)

- **Non-determinism.** Live agents vary run-to-run; K=3 + median/spread mitigates but does not eliminate. The output is a trend.
- **Single app, single domain.** Results generalize to "small-to-mid modular apps," not all software. The `collab-hub`-scale substrate is deliberately realistic-but-small.
- **The harness builder is itself an agent of a particular capability.** A more or less capable model could move the crossover index. The pre-registered model/prompt is recorded so a re-run is comparable.
- **SCR's advantage is hypothesized to compound past N=8.** The experiment may end *before* the crossover even if one exists at larger N; the report must not claim "no benefit" when it can only honestly claim "no crossover observed within N=8."
