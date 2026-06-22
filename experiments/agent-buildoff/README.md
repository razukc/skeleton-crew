# Agent Build-Off

Tests skeleton-crew's core bet — *enforced feature isolation* — in the agent
era. The same headless Claude agent builds the same feature backlog two ways:
as SCR plugins (`scr-app/`) and as a competent Fastify monolith (`mono-app/`),
both seeded at functional parity with a shared activity-feed hotspot.

The wager is **not** "good code vs. bad code." A capable agent *could* write a
well-isolated monolith. The question is whether SCR's *enforced* boundary pays
off even when a competent agent builds both sides. Every fairness control exists
to protect that framing.

## What it measures

| Phase | Question | Determinism |
|---|---|---|
| 1 Sequential build-off | tokens/feature, read-surface, cross-feature breakage; cost crossover index | live agent, K=3 |
| 2 Modification | blast radius of a data-shape change (files touched outside target + foreign oracle breakage) | live agent, single-shot |
| 3 Parallel contention | does a hotspot conflict surface loud-and-local or silent | live agent, single-shot |
| 4 Fault injection | does SCR contain a colliding registration / throwing hotspot | deterministic |

The building agent runs sandboxed: it sees **only** its arm's codebase plus one
feature spec — never the oracle suite, the other arm, or the metrics. Predictions
are pre-registered in `PREDICTIONS.md` and committed before any live run.

## Layout

```
backlog/            frozen, arm-agnostic feature specs (f1–f8, modify, parallel-a/b)
builder-prompt.md   the template fed to each builder agent ({{FEATURE_SPEC}}, {{ARM_CONVENTION}})
scr-app/            ARM 1 — every feature is an SCR plugin; routes are runAction shims
mono-app/           ARM 2 — a competent Fastify monolith; features share store.ts
harness/
  agent-invoke.ts   spawn headless claude, parse stream-json (tokens/cost/files); build timeout
  sandbox.ts        copy an arm into an isolated sandbox; land a chosen build back
  oracles/          FROZEN black-box HTTP oracles, grouped by feature, run against either arm
  oracle-runner.ts  run oracles, summarize feature-pass + foreign-breakage
  phases.ts         pure decisions (chooseLanding, classifyParallel) + measureRun + bootSandboxArm
  metrics.ts        median / spread / cumulative / crossoverIndex
  report.ts         renderResults → RESULTS.md
  faults.ts         Phase-4 deterministic containment probes (no agents)
  run.ts            entry point; --live gates the token-expensive phases
PREDICTIONS.md      pre-registered, committed before any live run
RESULTS.md          generated (gitignored)
```

## Run

All commands are run **from this package root** (the harness anchors paths on
`process.cwd()`, and `npm run experiment` launches the compiled entry from here):

```bash
npm install
npm test                                 # deterministic unit suite (no tokens)
npm run experiment                       # build + Phase 4 + smoke (no tokens) → RESULTS.md
npm run build && node dist/harness/run.js --live   # FULL experiment — token-expensive
```

### Live-run prerequisites

- An authenticated `claude` CLI. The harness spawns the binary named by
  `CLAUDE_CODE_EXECPATH` (falling back to `claude` on `PATH`) — important in a
  wrapped setup (e.g. a gateway proxy), where a bare `claude` on `PATH` may
  resolve to a different build the gateway rejects.
- Cost is real: a single feature build is on the order of ~$5 / ~800K tokens /
  ~3.5 min. The full K=3 run is ~54 builds (8 features × 2 arms × 3, plus the
  modification and parallel phases) — budget hours and hundreds of dollars.

### Reliability for the long unattended run

- **Per-build timeout** (`DEFAULT_BUILD_TIMEOUT_MS`, 10 min): a hung builder is
  tree-killed and recorded `ok=false` rather than blocking the whole batch.
- **Scrubbed builder env** (`builderEnv()`): builders don't inherit the parent
  session's hooks or MCP servers, keeping each build clean and isolated.
- **Checkpointing**: `RESULTS.md` is rewritten after every feature, so an
  interruption loses at most the in-flight feature, not the whole run.
- Launch the live run as a tracked background job (not a detached `&` process)
  so it stays supervised.

## Reading the result

A null or pro-monolith result is a **valid finding**. The signal is the *slope*
of cumulative cost over feature count, not any single feature: SCR's overhead is
expected to be small-or-negative early (plugin ceremony) and to amortize as
accumulated coupling makes each new monolith feature costlier to reason about.
"No crossover at this size" is a real, publishable outcome.

Phases 1–3 are non-deterministic — one K-repeated run is a defensible *trend*,
not a statistical proof. Phase 4 is fully deterministic and re-runnable. If an
agent can't build a feature in one arm, `RESULTS.md` reflects it honestly; it is
never papered over.

See the design spec: `docs/superpowers/specs/2026-06-22-agent-buildoff-design.md`.

## Out of scope (YAGNI)

No persistence (both arms in-memory). No UI/dashboard. No CI wiring (live phases
are non-deterministic and token-expensive). No second substrate or runtime. No
statistical-significance claim — K=3 is a trend.
