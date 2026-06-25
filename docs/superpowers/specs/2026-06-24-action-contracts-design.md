# Enforced Action Contracts — Agent-DX Foundation (v1)

**Status:** Approved design — 2026-06-24
**Author:** brainstormed with Claude (Opus 4.8)
**Supersedes/derives from:** the agent build-off experiment (`experiments/agent-buildoff/FINDINGS.md`, PR #21) and the operational-safety repositioning (commit `1425dc6`).

---

## 0. Why this exists (the lineage)

The agent build-off tested SCR's original thesis — that an *enforced* plugin boundary
reduces verification cost / blast radius when an AI agent builds the app. The result
was a largely null 4/9: at N=8 a competent agent built a monolith just as cheaply, and
SCR's only clean structural win was deterministic fault containment. The build-productivity
story is lost in the agent era — generation and comprehension are cheap now.

The surviving edge is **operational safety + machine-honesty**: agents are still bad at
*acting safely on a system they don't fully hold in context* — they call things wrong,
confidently break distant things, and can't cheaply tell whether a change is correct.

This feature attacks that gap. It makes the runtime **self-describing and self-enforcing**
so an AI agent — which is both the **author** and the **consumer** of plugins — can orient,
call, and safely change features **without reading handler source**.

The "vehicle" originally scoped was *route/edge ownership* (the `host.ts` hotspot the
experiment exposed). During design, the real atom underneath that was identified as the
**contract**, and the build order was decided (from the agent's perspective) as
**contracts-on-actions first, routes as slice 2**. This spec is slice 1.

---

## 1. Purpose & north star

The atom is the **contract**: declared once, used three ways — **introspect** (answer the
agent before it acts), **enforce** (reject violations loudly with the fix attached), and
**verify-at-swap** (check declared schemas are honest when a plugin is installed/swapped).

**North star:** 10/10 Agent-DX. The agent is author *and* consumer; we optimize entirely
for the agent. (Per product direction: humans are not expected to author SCR plugins going
forward — agents are. Plugin *simplicity* remains a goal; the *contract* needs no human
ergonomics, only maximal machine-honesty and machine-legibility.)

**Acceptance criterion — the whole effort is measured against this single testable claim:**

> An agent can build a new feature *and* correctly call every existing one having read
> **zero handler bodies** — orienting entirely from `introspect()` and recovering entirely
> from contract errors.

If a test cannot demonstrate that loop, the feature is not done.

**Compatibility guarantee:** the feature is purely **additive and opt-in**. Every existing
plugin and call site behaves identically with no schema present. Ships as a **minor**
(0.7.0); no migration required.

---

## 2. Architecture — the contract atom

A plugin optionally attaches **JSON Schema** documents to an action:

```ts
ctx.actions.registerAction({
  id: 'tasks:create',
  input:  { type: 'object', required: ['title'],
            properties: { title: { type: 'string' }, priority: { enum: [1, 2, 3] } } },
  output: { type: 'object', required: ['id', 'title'],
            properties: { id: { type: 'string' }, title: { type: 'string' } } },
  handler: ({ title, priority }) => ({ id: '…', title }),
});
```

### 2.1 Canonical form: JSON Schema as data

The contract **is** a JSON Schema data document — not a DSL, not executable validator code.
Decided from the agent's seat: the agent consumes the contract at *plan time* (statically,
from the served map, with no process running), so it must be **readable as data**, not
**executable as code**. JSON Schema is agent-native (in every model's training data),
language-portable, zero runtime dependency, and — critically — the **same bytes** serve
introspection and drive enforcement. Any future authoring sugar must compile *to* this
document; the document is canonical.

### 2.2 The three explicit contract states

The map must never silently force the agent back to reading source. Each schema field
(`input`, `output`) is in exactly one of three states, all explicit in `introspect()`:

| State | Declaration | Meaning | Served in map | Enforced |
|---|---|---|---|---|
| **declared-schema** | `input: { … }` | "Takes/returns exactly this shape" | yes | **input:** at the call. **output:** v1 = swap-time well-formedness only (see §5) |
| **declared-none** | `input: null` | An enforced *promise* of "no input" / "no output" | yes | any params (input) → rejected at the call |
| **undeclared** | field absent | Unknown — legacy escape hatch | marked `undeclared` | none |

The "Enforced" column differs by field on purpose: **input** is validated on the hot path
(the agent's active failure mode — calling wrong); **output** is declared and served for
*planning* and checked for well-formedness/honesty at swap time, but not validated on the
live call path in v1 (§5). `declared-none` is the difference between "I promise nothing comes
in" (honest, enforceable) and "I haven't said" (`undeclared`). Without this trichotomy,
"optional schema" silently degrades half the map to "go read the code" — the exact cost being
eliminated.

### 2.3 Closed vocabulary — the critical invariant

**A schema may use only the keyword subset the runtime enforces.** A schema containing any
keyword outside the supported set is **rejected at registration**, loudly, naming the
keyword. This closes the lying-contract trap at the keyword door: without it, an authoring
agent writes `{ type: 'string', pattern: '^[A-Z]', minLength: 3 }`, the checker silently
ignores `pattern`/`minLength`, and `introspect()` then serves a rule the runtime does not
enforce. The map would lie; the agent would trust it.

Rule: **the runtime never serves — or even lets you express — a constraint it will not
enforce.** "Serve only what you enforce" + "accept only what you enforce."

The enforced subset for v1 (see §3): `type` (`object|array|string|number|integer|boolean|null`),
`required`, `properties`, `items`, `enum`, `nullable`, and basic scalar constraints
(`minLength`, `maxLength`, `minimum`, `maximum`). Anything else → rejected at registration.

> **Decision needed at plan time, not now:** the *exact* keyword list is the contract
> between the validator and the closed-vocabulary gate. The implementation plan must pin it
> as a single shared constant consumed by both the validator and the registration guard, so
> they can never drift.

### 2.4 Optional, co-located, uniformly enforced

- **Optional, enforced-when-present.** No `input` → today's behavior, unchanged. No adoption tax.
- **Co-located** with the action it governs (kills the experiment's second-edit-site blast radius).
- **Uniform enforcement (a strength, stated explicitly):** validation lives at the single
  `runAction` funnel, so it applies identically whether the caller is a route, another
  plugin, or a test. There is **no privileged path around a contract** — the guarantee is
  total, not transport-specific. (This is precisely the property the experiment's `host.ts`
  shim lacked.)
- `input`/`output` are confirmed free keys on `ActionDefinition` (currently `id`, `handler`,
  `timeout`, `retry`, `memoryLimitMb`).

---

## 3. Components

All new units mirror the existing registry/error/trace shapes already in the codebase.
References below are to current source.

### 3.1 `src/contract-validator.ts` (new)

A zero-dependency JSON Schema checker over the enforced subset (§2.3).

- **Input:** a JSON Schema document + a candidate value.
- **Output:** `{ ok: true }` or `{ ok: false, violations: Violation[] }` where
  `Violation = { path: string /* JSON-pointer */, expected: string, actual: string, schema: object /* the offending sub-schema */ }`.
- **Returns the full violation set, not first-fail.** An agent missing three fields must get
  all three in one throw — three sequential fix→rerun cycles is 3× the loop cost.
- **Unsupported-keyword rejection:** a separate exported function validates that a *schema
  document itself* uses only enforced keywords; called at registration and at swap pre-flight.
- **DoS-bounded:** recursion depth is capped and cyclic schema documents are rejected. The
  repositioned product runs untrusted/multi-tenant plugins; a pathologically nested or
  recursive schema must not hang the checker.
- **Pure, synchronous, no side effects.** Exhaustively unit-tested.

### 3.2 `ActionEngine` (extend — `src/action-engine.ts`)

- Store `input`/`output` schemas on the action definition at registration; reject
  unsupported-keyword schemas there (loud, at registration).
- In `runAction` (the single execution funnel, ~line 165): validate `params` against the
  `input` schema **once, before the `for (attempt …)` retry/timeout loop**. A contract
  violation is deterministic — retrying wastes work and would emit N identical violation
  traces.
- **Zero overhead when no schema is present:** the validation branch is skipped entirely, so
  non-adopting actions pay nothing (no allocation, no trace change, no latency).
- On violation: throw `ContractViolationError` (§3.3) and emit a trace with `status:'contract'`.

### 3.3 `ContractViolationError` (new error class)

Mirrors `DuplicateRegistrationError` / `ActionExecutionError` house style. The error **is**
the Agent-DX payload — it must let the agent recover in one shot without reading anything:

- `actionId` — which action.
- `code` — stable machine-branchable code, `'CONTRACT_INPUT_VIOLATION'` (not a regex on the message).
- `violations` — the **full batched set**, each `{ path, expected, actual, schema }`.
- Human-readable `message` summarizing the violations (loud, specific, fix-attached).

### 3.4 Trace system (extend)

Add `'contract'` as a first-class `TraceStatus`, distinct from `'error'`. Rationale from the
agent's seat: in a generate→verify loop, "my handler threw" (logic bug) and "I called it with
the wrong shape" (contract bug) have completely different fixes; the trace must keep that one
signal sharp. One-line enum addition; `emitTrace` already records `input`/`output` per run.

### 3.5 `introspect()` (extend — existing `IntrospectionAPI`)

Serve, per action: `input`, `output`, each field's **state** (`declared` / `none` /
`undeclared`), and `owner`. Top-level additions:

- `supportedKeywords: string[]` — so the authoring agent knows its vocabulary *before* it writes a schema.
- `schemaVersion: string` — the map's own shape is a versioned contract the agent can rely on.

**Invariant (asserted by test §6):** the schema bytes `introspect()` returns are the *same
object* the validator enforces — serve = enforce, by identity, not by copy.

### 3.6 Swap path (extend — `commitSwapBuffer` pre-flight)

At swap/test time, check each declared schema (input *and* output) is well-formed and within
the closed vocabulary. This is where **output honesty** is gated in v1 (output is served for
planning but not hot-path-validated — see §5). A swap whose plugin declares a malformed or
out-of-vocabulary schema is rejected before commit, untouched-rollback as today.

---

## 4. Data flow — the agent loop this produces

```
ORIENT   introspect() → { schemaVersion, supportedKeywords:[…],
                          actions:[{ id, input, output, state, owner }] }     ← no source read
CALL     runAction('tasks:create', params)
           → no schema?  → straight to handler (zero overhead)
           → schema?     → validate params, ONCE, before the retry loop
               pass: handler runs, traced status:'success' (unchanged)
               fail: throw ContractViolationError {
                       code:'CONTRACT_INPUT_VIOLATION', actionId,
                       violations:[ { path:'/title', expected:'string',
                                      actual:'undefined', schema:{…} }, … ]   ← ALL at once
                     }, traced status:'contract'
RECOVER  agent reads batched violations + sub-schema, fixes its own input
         in ONE cycle — never opens another file
```

The lying-contract invariant holds three independent ways:
1. **serve = enforce** — `introspect()` returns the same object the validator runs.
2. **express = enforce** — that object can only contain enforceable keywords (§2.3).
3. **no bypass** — the funnel (§2.4) has no privileged path around validation.

---

## 5. Error handling & the v1 line

- **Input violation** → `ContractViolationError`, before the handler, before retries.
  Caller's fault; trivially correct to reject.
- **Output** → declared + served + swap-time well-formedness check; **not** hot-path-validated
  in v1. Decided from the agent's seat: the agent's planning value comes from the *served*
  output schema, not from runtime output-checking; and the author of the output contract is
  itself an agent in a generate→verify loop, so output *honesty* is better caught at
  swap/test time than via a prod hot-path 500. Dropping hot-path output validation dissolves
  every hard cost (latency, availability tension, streaming/void edge cases) without hurting
  the agent's core loop.
- **Validator-internal failure** (a bug in *our* checker) must surface as its own distinct
  error and never be silently caught and reported as a contract violation. A faulty validator
  must not masquerade as a faulty caller.

### Explicitly deferred (named so a future agent does not scope-creep them in)

- Output hot-path enforcement.
- Side-effect contracts (`emits` — declaring which events an action emits).
- Streaming / `void` outputs.
- Production violation-behavior (what a violation *does* under live traffic; only ever
  concerns *inputs* now, which are caller's-fault → reject the call).
- Config-as-contract — `validateConfig` stays exactly as-is; unifying it is a later slice.
- Authoring sugar / DSL.
- **Routes / edge ownership — this is slice 2.** A route becomes `{ method, path }` pointing
  at an already-contracted action; `host.ts` collapses into a generic adapter that reads
  `introspect().routes`. Built on this foundation, after it.

---

## 6. Testing (vitest; grouped by feature; observable-state assertions)

- **`contract-validator.test.ts`** — every supported keyword; nested objects/arrays; the
  batched-violation `{ path, expected, actual, schema }` shape; **unsupported-keyword
  rejection**; **depth-bound + cyclic-schema rejection**.
- **`action-engine` contract tests** —
  - present input schema rejects bad input loudly, with all violations batched;
  - `declared-none` (`input: null`) rejects any params;
  - `undeclared` (no field) behaves exactly as today;
  - valid input passes through untouched;
  - **no-schema path adds zero overhead** (assert trace count + that no validation occurs);
  - violation is traced `status:'contract'`, not `'error'`;
  - **validation runs once, before the retry loop** (asserted via trace/attempt count on a
    retryable action — a contract violation must produce exactly one attempt).
- **`introspect` invariant test** — **served schema bytes === enforced schema bytes** asserted
  by object identity; `supportedKeywords` and `schemaVersion` present; the three states render
  correctly.
- **swap test** — a malformed / unsupported-keyword schema (input or output) is caught at swap
  pre-flight and the running plugin is left untouched.
- **Capstone behavioral test (proves the north star; guards the vacuous-oracle trap the
  experiment already burned us on):** build a small multi-action runtime, then assert an agent
  can, **without reading any handler body**:
  (a) read `introspect()` and call every action correctly;
  (b) receive a usable, batched fix from a wrong-shaped call;
  (c) hit a hard rejection when *authoring* an out-of-vocabulary schema.

---

## 7. Out of scope (YAGNI)

No DSL. No output hot-path validation. No `emits`/side-effect contracts. No streaming. No
config-as-contract. No routes (slice 2). No human-authoring ergonomics. No external schema
library. No statistical/perf benchmark — this is a correctness + Agent-DX feature, validated
by the capstone test, not by tokens.

---

## 8. File structure (informs the implementation plan)

- **Create:** `src/contract-validator.ts` (checker + keyword-vocabulary guard), its types,
  `ContractViolationError` (in the existing errors module).
- **Modify:** `src/action-engine.ts` (store schemas; validate at the funnel before the retry
  loop; emit `'contract'` trace), the `TraceStatus` type, `ActionDefinition` type
  (`input?`/`output?`), `src/runtime-context.ts` + `IntrospectionAPI`
  (`introspect()` serves schemas + state + `supportedKeywords` + `schemaVersion`),
  `src/plugin-registry.ts` (`commitSwapBuffer` pre-flight schema honesty check).
- **Test:** `tests/unit/contract-validator.test.ts`, contract additions to the action-engine,
  introspect, and swap suites, and a new capstone behavioral test.

Each unit has one clear responsibility, a well-defined interface, and is independently
testable — the validator is pure; the engine insertion is a single guarded branch; the
introspect/swap changes are additive reads of already-stored data.
