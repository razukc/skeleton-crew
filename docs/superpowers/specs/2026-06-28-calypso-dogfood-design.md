# Calypso Dogfood — Running a Real Discord Bot on Skeleton Crew

**Date:** 2026-06-28
**Status:** Design approved, pending spec review
**Type:** Dogfood experiment (operational proof)

## 1. Purpose & Thesis

Skeleton Crew Runtime (SCR) 0.7.0 is stable as a library. This experiment **puts it to work**: it
replaces the command-dispatch subsystem of a real, found-on-GitHub Discord bot with SCR, and runs
the result both live (against a real Discord token) and offline (against a deterministic harness).

The goal is **operational proof on found code** — code written by someone who had never heard of
SCR — not a synthetic showcase. We have already measured the build-productivity story (null) and a
synthetic stress story (`experiments/hotswap-stress`). This experiment proves the four guarantees
hold when SCR is dropped into the dispatch path of an application it did not design.

### The repo

**`sabattle/CalypsoBot`** (MIT, discord.js v14, TypeScript), treated as a **pinned-snapshot fork**.
It was last pushed 2026-01-22 (~17 months stale at time of writing) and is not actively maintained.
For a fork-and-dogfood we pin a commit and never track upstream, so staleness does not bite a frozen
experiment. CalypsoBot was chosen over actively-maintained alternatives (yuudachi, sudobot) because
those ship their *own* command frameworks (monorepo + bespoke plugin systems), which muddies the
"we hardened a naive subsystem" narrative. CalypsoBot's dispatch is a bare `Collection` (Map), which
is the cleanest possible "before" picture.

**Stated follow-up:** evaluate this result first. If it proves the thesis cleanly, a *subsequent*
experiment may port the same approach onto a maintained framework (yuudachi/sudobot) to show it holds
under a real plugin system too. That port is explicitly out of scope here.

### What the found code lacks, by construction

From CalypsoBot's actual `src/events/interactionCreate.ts` and `src/structures/Client.ts`:

```ts
const command = client.commands.get(interaction.commandName)   // a bare Collection (Map)
try { await command.run(client, interaction) }                 // containment = one hand-rolled try/catch
catch (err) { logger.error(...) }
// commands are glob-loaded at process boot → changing one = restart = gateway reconnect
```

| SCR guarantee | CalypsoBot today | After dogfood |
|---|---|---|
| **Ownership** | glob-load silently clobbers duplicate command names | `DuplicateRegistrationError` at registration |
| **Containment** | one try/catch at the single call site; any new dispatch path loses it | contained by the runtime, every path |
| **Atomic hot-swap** | change a command → restart → **gateway reconnect** | `swapPlugin()`, no restart, no reconnect |
| **Contracts** | `SlashCommandBuilder` args validated only by Discord's UI, not at the handler boundary | action contract enforced in-process |

## 2. Scope

**In scope — the carved command layer:**

- **Read-only `information` commands** (~6–8): `ping`, `uptime`, `userinfo`, `serverinfo`, `avatar`,
  `roleinfo`, `botinfo`. Pure read logic, no database (CalypsoBot's Prisma dependency is only used by
  config/persistence commands, which are excluded).
- **One mutating command**: `color` (assigns/changes a member's color role). Provides the dramatic
  containment + contract story (throws on role-hierarchy violation, rejects bad input) while staying
  low-stakes — no banning or kicking real users.

**Out of scope:** any command touching Prisma/config persistence; music/voice (CalypsoBot has none);
buttons/select-menu components beyond what a carved command needs; tracking upstream CalypsoBot;
porting to a maintained framework (that is the stated follow-up, a separate experiment).

## 3. Architecture

SCR replaces the dispatch subsystem; **discord.js stays as the transport, unchanged**. We do not
touch how the bot talks to Discord — we replace the `client.commands.get(name).run()` middle.

```
            ┌────────────────────────── transport (unchanged) ──────────────────────────┐
  Discord gateway ──► interactionCreate ──► [ADAPTER] ──► SCR Runtime ──► command plugin
       (live)            (discord.js)         maps          runAction()       run()
                                          interaction→        + contract     (found code,
                                          action input        + containment   ~unchanged)
            └───────────────────────────────────────────────────────────────────────────┘
```

Three layers, each independently testable:

1. **Transport adapter** (`src/runtime/`) — the *only* substantial new glue. On `interactionCreate`,
   it translates a discord.js interaction into an SCR action call
   (`ctx.actions.runAction('cmd:userinfo', { userId, guildId, ... })`). It catches
   `ContractViolationError` and handler throws and renders them as Discord replies. This seam lets the
   *same* command run live (real interaction) or offline (synthetic input).

2. **SCR runtime** (the published library, unmodified) — owns the command registry. Each command is one
   plugin registering one action, with the `SlashCommandBuilder` options translated into an action
   contract. Boot registers all plugins; `swapPlugin()` replaces one live.

3. **Command plugins** (`src/commands/*`, carved from CalypsoBot) — the found code. A command's `run`
   body moves nearly verbatim into an action handler. The change is its *signature*: instead of reaching
   into a live `interaction` for everything, it receives a typed input object + a thin reply capability.
   This decoupling is what makes the command runnable without a live gateway.

### Decoupling strategy — deliberately mixed

CalypsoBot commands call `interaction.guild.members.fetch()`, `interaction.reply()`, etc. — deeply
coupled to a live Discord object. Two ports:

- **(a) Thin port** — handler still takes the real `interaction`; the offline harness passes a *mocked*
  interaction. Minimal code change → strongest "drop-in" proof. **Used for the read-only info commands.**
- **(b) Capability port** — handler takes a plain input + a small injected `discord` capability
  (`fetchMember`, `setRole`, `reply`…); live and offline differ only in which capability impl is passed.
  More upfront change, cleaner contracts, trivial offline testing. **Used for the mutating `color`
  command**, where the injected capability makes the containment/rollback story crisp.

Mixing the two deliberately shows both the cheap path and the principled path on the same codebase.

## 4. Data Flow & Contract Mapping

Every command undergoes the same translation (shown for `userinfo`):

```
Discord interaction                 Adapter                      SCR action
───────────────────                 ───────                      ──────────
/userinfo user:@bob      ─►  extract options →           ─►  runAction('cmd:userinfo', {
  (ChatInputCommand)           { targetUserId: '...',          targetUserId, invokerId, guildId
                                 invokerId, guildId }         }, { contract })
                                                                   │
                             render reply ◄──── string/embed ◄─────┘ run() returns payload
```

### Contract derivation — the heart of the "drop-in" proof

CalypsoBot already declares argument shape declaratively:

```ts
new SlashCommandBuilder().setName('userinfo')
  .addUserOption(o => o.setName('user').setRequired(false))
```

A `slashToContract()` helper reads that builder and emits the SCR action contract:

```ts
{ input: { type: 'object',
    properties: { targetUserId: { type: 'string' }, guildId: { type: 'string' } },
    required: ['guildId'] } }
```

The contract is **derived from the found code**, not hand-authored — the bot's own arg declarations
become enforced boundaries for free. This is the cleanest possible demonstration of
contracts-on-real-code.

### The adapter is the single seam

`src/runtime/adapter.ts`: interaction-in → action-call → reply-out, plus error rendering. Live mode
passes the real interaction's extracted values; offline mode passes synthetic values. **Identical
action path both ways** — that is what makes the offline harness a faithful proxy for live behavior.

## 5. The Three Demos

Each maps to a guarantee and runs in **both** modes: A (live, watched) and B (offline, asserted).

1. **Hot-swap without reconnect** (atomic swap). Boot the bot; `/uptime` returns v1 text. Call
   `swapPlugin('cmd:uptime', v2)` with reworded output. `/uptime` now returns v2 — **same process, same
   Discord session id, no reconnect**. Live: watch it in a real channel. Offline: assert
   session-id / ports-object identity unchanged across the swap.

2. **Failed swap rolls back** (atomicity). Swap in a `userinfo` v2 whose `setup` throws. The buffer is
   dropped; `/userinfo` still serves v1. Prove observers never saw a half-swapped state.

3. **Contained crash + bad input** (containment + contracts), using the mutating **`color`** command.
   (a) Fire `color` with malformed input → `ContractViolationError` at the boundary, typed reply, handler
   never runs. (b) Swap in a deliberately-buggy `color` that throws inside `run` → runtime contains it,
   the bot and all sibling commands keep serving. Read-only scope would have made "it threw and nothing
   else died" undramatic; the mutating command makes it visible.

Demo 3 is **offline-first by design** — crashes and bad input are injected deterministically without
role-thrashing a real server. Live mode confirms the same code path under a real token.

## 6. Project Layout

A new self-contained experiment directory; the library is untouched.

```
experiments/calypso-dogfood/
  src/
    runtime/      adapter.ts, slashToContract.ts, bootstrap.ts
    commands/     userinfo.ts, serverinfo.ts, ping.ts, uptime.ts, ... , color.ts   (carved)
    capabilities/ discord.ts        (the injected capability for color, option b)
  harness/        offline driver (synthetic interactions; scripted swap/crash/bad-input)
  tests/          vitest: the 3 demos as assertions
  README.md       findings (honest, à la agent-buildoff)
  config.example  token slot for live mode
```

## 7. Test Layer & Error Handling

**Test layer (the B harness, doing double duty):** a vitest suite that scripts each demo
deterministically — register → swap → assert; register → crash → assert-siblings-alive; fire-bad-input
→ assert-`ContractViolationError`. These *are* both the regression tests and the proof artifacts. Live
mode (A) is a thin `npm run live` that boots the same plugins against a real token for the
watch-it-happen confirmation.

**Error handling:** the adapter is the only place that turns runtime outcomes into user-facing replies:

- `ContractViolationError` → "your input was invalid" + the JSON-pointer detail.
- contained handler throw → generic "command errored" (logged, bot stays alive).
- swap failure → logged, never surfaced to users (old version keeps serving).
- everything else propagates as a typed SCR error, never a silent swallow.

## 8. Honesty Gate

Matching the repo's culture (`experiments/agent-buildoff/FINDINGS.md`), the README records what the
dogfood **actually proved** vs. what stayed **asserted**:

- If live mode (A) is only ever run by hand, say so; do not imply automated live coverage.
- Do not claim load/throughput numbers we did not measure (that is `hotswap-stress`'s job).
- State plainly which guarantees were exercised under a real gateway vs. only under the offline harness.
- Record the follow-up decision: evaluate this result, then decide whether to port to a maintained
  framework.

## 9. Success Criteria

The experiment succeeds if:

1. The carved `information` commands run unchanged in behavior through the SCR action path (parity with
   the original `run` output), proving the drop-in carve.
2. Contracts are **derived** from the found `SlashCommandBuilder` declarations, not hand-authored, and
   reject malformed input at the boundary.
3. All three demos pass as offline vitest assertions.
4. At least one live run (A) confirms hot-swap with an unchanged Discord session id (no reconnect).
5. The README honestly separates proved-live from asserted-offline.

Failure (e.g. the carve turns out to require rewriting the commands wholesale, or contracts cannot be
derived cleanly) is itself a reportable finding and must be recorded honestly rather than worked around.
