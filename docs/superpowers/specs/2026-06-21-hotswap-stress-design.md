# Hot-Swap Adversarial Stress Harness — Design

**Date:** 2026-06-21
**Status:** Approved (design); pending implementation plan
**Topic:** Stress-test skeleton-crew's atomic hot-swap (0.6.x) under real concurrent HTTP load, using `json-server` as a library-as-harness with scr fronting its request path.

## Goal

Continue the "taste of its own medicine" adversarial hunt — but in the wild instead of deterministic unit probes. Drive real concurrent HTTP traffic into scr actions/services/events while hot-swapping the backing plugins underneath, and prove (per request) whether the swap path holds.

The unit probes hit the swap window deterministically via an `await` we control. The open question this harness answers: **does the 0.6.x hardening hold when the swap window collides with in-flight work by chance, the way it would in production?**

## Decisions (locked during brainstorming)

- **Host:** `typicode/json-server` consumed as a **real dependency** (not forked). It provides the REST contract and lowdb-backed storage; scr **fronts** the request path so every request flows through an scr action. The integration we write is scr's, so the stress lands on scr's swap path. (`express` + `autocannon` are the other deps; `lowdb` comes in transitively via json-server.)
- **Capability under test:** atomic hot-swap (0.6.0 headline; no existing demo exercises it).
- **End state:** adversarial stress test (find/break), not a polished upstreamable showcase.
- **Artifact location:** `experiments/hotswap-stress/` in this repo (a test rig, not a `demo/` teaching app).

## Section 1 — Architecture

Two planes:

- **Data plane (hot, continuous):** `autocannon` → thin Express router → `runtime.runAction(...)` → lowdb. Every HTTP request flows through an scr action, which is what puts load on the swap path.
- **Control plane:** `POST /__swap/*` → `runtime.swapPlugin(v2)`, fired *while the data plane is saturated*. The collision between the planes is the experiment.

```
                  autocannon (load gen)
                        │  hundreds of concurrent HTTP reqs
                        ▼
        ┌────────────────────────────────┐
        │  Express app (thin router)      │
        │  GET /posts → runAction(        │
        │     'posts:list', query)        │
        │  POST /posts → runAction(       │
        │     'posts:create', body)       │
        └───────────────┬────────────────┘
                        ▼
        ┌────────────────────────────────┐
        │  scr Runtime (system under test)│
        │   • posts-plugin  → actions     │
        │   • comments-plugin             │
        │   • store-plugin → service      │  ← lowdb-backed
        └───────────────┬────────────────┘
                        ▲
                        │  control plane:
              POST /__swap/posts → runtime.swapPlugin(postsV2)
```

**Library-vs-fork call:** we depend on the `json-server` package and put scr in front of its storage, rather than forking the repo and grafting into its router. A fork-and-graft would mostly test *their* Express plumbing; consuming json-server as a library while routing the data plane through scr actions keeps the stress squarely on scr's swap path. The `store-plugin` service wraps json-server's lowdb `db` handle, so json-server owns persistence and scr owns the request path.

## Section 2 — The swap surface

Three plugins, each a swap target, chosen so the harness exercises all three hardened swap-path findings plus the net-new concurrent-swap path.

| Plugin | Registers | Swap exercises |
|---|---|---|
| `posts-plugin` | actions `posts:list/get/create/update/delete` | action `replaceAtomic` — in-flight-call collision |
| `store-plugin` | service `store` (lowdb handle) + actions | service re-register + post-commit dispose (Finding 1) |
| `comments-plugin` | actions + subscribes to `post:deleted` | queued event subscriptions committed at swap commit |

**Six swap scenarios, each a `v2` variant fired under load:**

1. **Clean swap** — `posts:list` v2 adds a field. In-flight `GET /posts` must always see *whole-v1* or *whole-v2*, never a mix.
2. **Throwing swap** — `posts-plugin` v2.setup throws after registering. Running v1 stays fully live; not one concurrent request may 500 from the swap. (0.6.0 atomicity, under fire.)
3. **Dispose-clobber bait** — `store-plugin` v2 re-registers `store`; v1.dispose unregisters `store`. After swap, zero requests may hit a missing `store` (Finding 1, identity guard).
4. **Cross-plugin hijack bait** — `posts-plugin` v2 tries to register a `comments:*` action. Must reject with `PluginSwapError`; `comments` keeps serving without a blip (Finding 8).
5. **Config skew bait** — flip runtime config (e.g. `pageSize`) *during* a `posts-plugin` swap's await window via a concurrent control-plane call. validateConfig and v2.setup must agree on one snapshot (Finding 9).
6. **Concurrent dual-swap** *(net-new bug candidate)* — fire `POST /__swap/posts` and `POST /__swap/comments` in the same tick, both real v2 setups, while autocannon floods both resources. The existing concurrent-swap guard is **per-plugin**; two *different* plugins racing through buffered-setup → commit against the same live registries is a path no unit probe hits. Probes:
   - Are the two commits serialized, or can one interleave and leave a registry half-flipped?
   - If `comments` v2 throws (rollback) while `posts` v2 commits, does `posts` survive cleanly and `comments` roll back with zero cross-contamination?
   - Does either swap's `SwapBuffer` read-merge ever observe the other's uncommitted buffer state?

Scenarios 3–5 re-stage our own unit findings under real concurrent HTTP traffic. Scenario 6 is the one with real potential to surface a **new** finding rather than re-confirm a hardened one.

## Section 3 — Adversarial harness & failure oracle

A stress test is only as good as its ability to **notice** a failure. "It didn't crash" is not an oracle. Every scenario gets an explicit invariant checked on *every* request.

**Load generator:** `autocannon` programmatic API (not CLI), so we can start the flood, `await` a swap mid-flood at a known offset, and collect per-request results. Each scenario = flood + timed swap + assertion sweep. Fixed concurrency (e.g. 50 connections) and duration.

**Oracles, per scenario:**

| # | Scenario | Invariant asserted |
|---|---|---|
| 1 | Clean swap | Every 2xx body parses as *either* whole-v1 *or* whole-v2 shape — never a mix. Zero 5xx. |
| 2 | Throwing swap | Zero 5xx across the flood. Post-swap, v1 behavior still served (swap observably rejected). |
| 3 | Dispose-clobber | Zero "service `store` not found" errors. Every request resolves the store. |
| 4 | Cross-plugin hijack | Swap returns `PluginSwapError`; `comments` serves 100% 2xx throughout. |
| 5 | Config skew | All requests during the swap reflect *one* consistent config snapshot, not a torn pageSize. |
| 6 | Concurrent dual-swap | Both registries end coherent; no half-flip; a rollback of one doesn't perturb the other. Zero 5xx attributable to interleave. |

**Crash-signal discipline** (carried over from the event-delivery-flake lesson — a failure must be provably scr's fault, not the harness's):

- Every non-2xx is captured with body + swap-phase it landed in (pre-swap / mid-swap-window / post-commit). A 5xx *outside* the swap window is harness noise, reported separately, never counted as a finding.
- Each candidate finding is reproduced, then **minimized to a unit probe** under scr's own `tests/` if real. The wild harness *finds*; the unit probe *proves*. No bug claimed from HTTP flakiness alone.
- Swap timeline logged (`swap:start`, `buffered-setup-done`, `commit`, `dispose-done`) with high-res offsets so a failed request can be placed on it.

**Determinism knobs:** concurrency, duration, swap-offset are config so any finding can be replayed. For scenario 6's "same tick," both swaps fire without awaiting between them; the actual interleave is recorded.

## Section 4 — What we measure & report

**Correctness ledger (primary):** per scenario — pass/fail vs. oracle, total requests, non-2xx split by swap-phase, and for any failure a captured repro (request + response body + swap-timeline offset). Six rows, each green or with a linked finding.

**Performance delta (secondary):** the 0.6.0 commit is a *synchronous* batch on the live registries — for its duration the event loop is blocked and requests queue. Measure:
- **Latency during swap window vs. steady-state** — does p99 spike when commit fires, and by how long? Quantifies the stop-the-world cost the docs claim is fast but never measured under load.
- **Throughput dip** — req/s in the ~100ms around commit vs. baseline.
- **Zero-downtime claim, quantified** — *N requests in flight during the rejected swap, 0 failed.*

**Artifact:** a single generated `RESULTS.md` — six-row ledger, latency/throughput numbers, and a Findings section (empty if scr holds, or minimized repros if not). Honest calibration: if all six pass, the report says "no new findings; 0.6.x swap path holds under HTTP load" with no manufactured drama.

**Expectation set:** there's a real chance scenario 6 surfaces something while 1–5 don't (they're hardened; 6 isn't). Either outcome is valid — a clean sweep *confirms* the hardening held in the wild, which is itself worth knowing.

## Section 5 — Scope & deliverables

**Location:** `experiments/hotswap-stress/` (test rig, not a `demo/` teaching app, not a json-server fork). Depends on `skeleton-crew` (local workspace), `json-server` (provides REST contract + lowdb storage), `express`, `autocannon`.

```
experiments/hotswap-stress/
├── README.md              # how to run, what it proves
├── package.json           # json-server, express, autocannon, skeleton-crew (local)
├── src/
│   ├── server.ts          # thin Express router → scr actions (data plane)
│   ├── control.ts         # /__swap/* control plane → runtime.swapPlugin
│   ├── plugins/
│   │   ├── store-plugin.ts    # wraps json-server's lowdb db handle as a service + v2 dispose-clobber variant
│   │   ├── posts-plugin.ts    # CRUD actions + v2 variants (clean/throwing/hijack/skew)
│   │   └── comments-plugin.ts # actions + post:deleted subscriber + v2 variant
│   └── swap-timeline.ts   # high-res swap-phase logger (shared oracle util)
├── harness/
│   ├── oracles.ts         # per-scenario invariant assertions
│   ├── load.ts            # autocannon programmatic driver
│   └── run.ts             # orchestrates: flood → timed swap → assert → ledger
└── RESULTS.md             # generated: 6-row ledger + perf delta + findings
```

**Run model:** `npm run stress` runs all six scenarios sequentially (boot runtime → flood → timed swap → assert → tear down), writes `RESULTS.md`. Each scenario runnable solo: `npm run stress -- --scenario=6`.

**Definition of done:** all six scenarios run to completion with oracles wired; `RESULTS.md` generated; any real finding minimized into a unit probe under scr's own `tests/`. A clean sweep is a valid done state.

**Out of scope (YAGNI):**
- No fork/PR to typicode/json-server — we replicate its REST contract on express + lowdb, nothing upstreamed.
- No UI/dashboard — `RESULTS.md` is the artifact.
- No CI wiring — run-on-demand experiment, not a gate (load-heavy and timing-sensitive; CI would reintroduce the flakiness we fought).
- No coverage of non-swap scr surfaces (event bus, retry, memory limits) — swap path only.
- Not a json-server feature-parity clone — only the routes the six scenarios need.
