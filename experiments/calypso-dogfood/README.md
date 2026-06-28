# calypso-dogfood

A dogfood of a real Discord bot's command-dispatch layer running on the
**skeleton-crew** runtime (SCR). It proves SCR's correctness guarantees against
*found code* — command bodies carved from an existing bot rather than written to
flatter the runtime.

## A. What this is

The command layer is carved from **CalypsoBot** (`sabattle/CalypsoBot`, MIT,
discord.js v14) — a real, public GitHub Discord bot. It is used here as a
**pinned-snapshot fork**: we do not track upstream, and upstream was last
maintained ~Jan 2025. We took a representative subset of its commands, fed them
SCR's input/host instead of a live discord.js interaction/client, derived a
contract from each command's `SlashCommandBuilder`, and ran them as SCR plugins.

The goal is correctness properties, not a working bot. Two info commands
(`uptime`, `roleinfo`) and one mutator (`randomcolor`) are enough to exercise
every guarantee below.

## B. Guarantee → demo map

Each SCR guarantee is pinned to the test that proves it. All tests are offline
vitest assertions (see section C).

| Guarantee | What it means here | Proven by |
|---|---|---|
| Atomic hot-swap (no reconnect) | `cmd:uptime` v1 → v2 while serving; the context object is unchanged | `tests/demo1-swap.test.ts` — asserts `ctxAfter === ctxBefore` and v1/v2 output differ |
| Atomic rollback | a swap whose setup throws is rejected and the old version keeps serving | `tests/demo2-rollback.test.ts` — `swapPlugin(...)` rejects with `PluginSwapError`; v1 still answers |
| Fault containment | a throwing `randomcolor` is contained; the sibling `cmd:uptime` still serves | `tests/demo3-containment.test.ts` (b) |
| Enforced contracts | a missing required arg is rejected at the boundary, before the handler runs | `tests/contract.test.ts` + `tests/demo3-containment.test.ts` (a) — `ContractViolationError` |
| Ownership (no silent clobber) | a second plugin registering the same action id is refused | `tests/ownership.test.ts` — `DuplicateRegistrationError` |

Full suite: **18 tests across 11 files, all passing.** `tsc --noEmit` is clean.

## C. Proved-live vs asserted-offline

**This is the honest core of the experiment. Read it before citing any result.**

Every demo above is proven **only** as an **offline vitest assertion** (18 tests).
There is no live coverage in CI.

- **Live mode (`npm run live`) is hand-run only.** It requires a real Discord bot
  token in `config.json` (untracked), is **not** part of CI, and boots the same
  carved commands over a real gateway via `src/runtime/live.ts`.
- **Live confirmation: NOT YET RUN.** No live session has been performed and
  logged. Do not read any of the guarantees above as demonstrated against a real
  Discord gateway. The value shown by this experiment is **offline correctness on
  found code** — nothing more.
- **The "no reconnect" proof is a stand-in.** Demo 1 asserts context-object
  identity (`ctxAfter === ctxBefore`) across a hot-swap. That object identity is
  the *offline stand-in* for "same Discord gateway session, no reconnect." It is
  not the real thing; a live run has not confirmed that a swap leaves the gateway
  session untouched.

## D. What carried verbatim vs what changed

- **`uptime`, `roleinfo` — thin port.** The command bodies are near-verbatim from
  CalypsoBot. The only change is the signature: they are fed SCR `input` + a
  `host` object instead of a live discord.js interaction/client (e.g. uptime
  reads `host.uptimeMs` where the original read `client.uptime`). `roleinfo`'s
  embed is reduced to a deterministic echo — the demonstrand is the contract, not
  embed fidelity.
- **`randomcolor` — capability port, INVERTED from the original.** CalypsoBot's
  original wraps the role mutation in a hand-rolled `try/catch`. Our carve
  **removes** that `try/catch` on purpose, so SCR's runtime containment is what
  protects the host (see `src/commands/randomcolor.ts`). Color selection is also
  **deterministic** — indexed by `(guildId.length + memberId.length) % colors.length`
  — instead of the original's `colors.random()`. This is for test determinism;
  the repo avoids `Math.random()`.

## E. Honest limitations

All of these are real and recorded deliberately:

- **Contracts handle flat options only.** Contracts are derived from each
  command's `SlashCommandBuilder` (`src/runtime/slashToContract.ts`), but the
  derivation handles flat options — **no subcommands or subcommand groups.** None
  of the carved commands use them, so this was never exercised.
- **SCR's contract validator accepts a limited JSON-Schema vocabulary.** It
  supports only: `type`, `required`, `properties`, `items`, `enum`, `nullable`,
  `minLength`, `maxLength`, `minimum`, `maximum`. The plan originally specified
  `additionalProperties: false`; the validator **rejects** it, so it was removed.
  (This is a genuine finding about what contracts SCR will accept, not a
  workaround we are hiding.)
- **Live `/uptime` is frozen.** `src/runtime/live.ts` boots via `bootDogfood()`
  with the default `host.uptimeMs` (`90_061_000`), never refreshed from
  `client.uptime`. A real `/uptime` would therefore show a static value. Accepted
  for the hand-run demo; not wired.
- **No database; `color.ts` out of scope.** The read-only commands carry no DB.
  CalypsoBot's Prisma-coupled commands — including the display-only `color.ts` —
  are out of scope. The genuine mutator carved is `randomcolor.ts`.
- **No throughput / load claims.** This dogfood proves *correctness* properties
  only. Performance under load is a different experiment
  (`experiments/hotswap-stress`), and nothing here should be read as a
  throughput claim.
- **Live adapter coerces all option values to strings.** `src/runtime/adapter.ts`
  (`extractInput`) stringifies every Discord option value, but `slashToContract`
  derives `number`/`boolean` contract types for integer/number/boolean options. A
  future command with a non-string option would have its value stringified and
  then **rejected at the contract boundary in live mode.** Not currently
  reachable — all carved commands use only string/role options — and it lives in
  the hand-run `live.ts` path (see section C: NOT YET RUN). Recorded so it is not
  discovered silently.

## F. Follow-up decision

Evaluate this result. If clean, a **later** experiment may port the same approach
onto an actively-maintained bot that ships its own command framework (e.g.
`yuudachi` or `sudobot`), to show the guarantees hold under a real plugin system
rather than a carved subset. That port is **out of scope here.**
