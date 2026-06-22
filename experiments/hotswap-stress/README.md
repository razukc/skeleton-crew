# Hot-Swap Adversarial Stress Harness

Drives concurrent HTTP load through skeleton-crew actions while hot-swapping the
backing plugins underneath — the "taste of its own medicine" swap-path hunt, in
the wild instead of deterministic unit probes.

## What it does

A thin Fastify server whose every route is a `runAction` shim (scr owns all
logic + state via an in-memory `store` service). `autocannon` saturates a
resource while the harness fires `runtime.swapPlugin(v2)` mid-flood. A separate
`fetch` verifier records each response's body + swap-phase so per-request
oracles can judge correctness — not just "did it crash."

## Scenarios

| # | Scenario | What it probes |
|---|---|---|
| 1 | Clean swap | In-flight reads see whole-v1 or whole-v2, never a mix |
| 2 | Throwing swap | A v2 whose setup throws never 5xxes a live request (0.6.0 atomicity) |
| 3 | Dispose-clobber | v1.dispose must not delete v2's re-registered `store` (Finding 1) |
| 4 | Cross-plugin hijack | A swap grabbing another plugin's action is rejected (Finding 8) |
| 5 | Config skew | validateConfig + setup observe one config snapshot (Finding 9) |
| 6 | Concurrent dual-swap | Two plugins swapping at once — the net-new bug candidate |

## Run

```bash
npm install
npm run stress              # all six scenarios → RESULTS.md
npm run stress -- --scenario=6   # just one
npm test                    # unit tests for plugins, server, oracles
```

Exit code is non-zero if any oracle fails. A failing oracle is a *candidate*
finding: reproduce and minimize it to a unit probe under the repo's `tests/`
before claiming a bug. A clean sweep confirms the 0.6.x hardening held under
real HTTP load.

## Design

See [`docs/superpowers/specs/2026-06-21-hotswap-stress-design.md`](../../docs/superpowers/specs/2026-06-21-hotswap-stress-design.md).
