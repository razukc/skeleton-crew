# Calypso Dogfood Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the command-dispatch subsystem of a real Discord bot (CalypsoBot) with Skeleton Crew Runtime, proving SCR's four guarantees on found code via three demos that run both offline (asserted) and live (watched).

**Architecture:** A new self-contained experiment directory `experiments/calypso-dogfood/`. The published SCR library (unmodified, linked via `file:../..`) owns a command registry: each carved CalypsoBot command becomes a plugin registering one action. A transport adapter translates discord.js interactions into `runAction` calls; contracts are *derived* from each command's `SlashCommandBuilder`. Read-only commands use a thin port (handler keeps the verbatim body, takes the real interaction); the one mutating command (`randomcolor`) uses a capability port (handler takes typed input + an injected `discord` capability) so it runs offline with no Prisma and no live guild.

**Tech Stack:** TypeScript (ESM, NodeNext), discord.js v14, skeleton-crew (`file:../..`), vitest 4, dayjs.

## Global Constraints

- The SCR library under `src/` is **never modified** by this experiment. All work lives under `experiments/calypso-dogfood/`. (verbatim from spec §3, §6)
- CalypsoBot is a **pinned-snapshot fork**: copy source from a fixed commit, never track upstream. (spec §1)
- Carried-over CalypsoBot command bodies are kept **as verbatim as possible** for the thin port — the change is the signature, not the logic — to maximize the "drop-in" proof. (spec §3)
- Contracts must be **derived** from the found `SlashCommandBuilder` declarations, not hand-authored. (spec §4, §9.2)
- Out of scope: any command touching Prisma/`client.configs`; music/voice; `color.ts` (display-only, Prisma-coupled); porting to a maintained framework. (spec §2)
- Honesty gate: the README separates **proved-live** from **asserted-offline**; no unmeasured load/throughput claims. (spec §8)
- Module IDs follow `cmd:<name>` for actions and `cmd-<name>` for plugin names (e.g. action `cmd:uptime`, plugin `cmd-uptime`).
- TypeScript: `"module": "NodeNext"`, `"type": "module"`; relative imports use `.js` extensions (matches the SCR repo).

**SCR public API used throughout (from `skeleton-crew`):**
```ts
import { Runtime, ContractViolationError, DuplicateRegistrationError,
         type PluginDefinition, type ActionDefinition, type RuntimeContext } from 'skeleton-crew';
const rt = new Runtime({ config: {} });
rt.registerPlugin(def);            // before initialize()
await rt.initialize();
const ctx = rt.getContext();
ctx.plugins.registerPlugin(def);   // after initialize()
ctx.actions.registerAction({ id, handler, input });  // input?: JsonSchema = the contract
await ctx.actions.runAction(id, params);
await rt.swapPlugin(def);          // atomic; throws PluginSwapError on failed commit
```
`ActionDefinition.handler` signature: `(params, context) => R | Promise<R>`. The contract is the action's `input` JSON-Schema; `runAction` validates `params` against it before the handler runs and throws `ContractViolationError` on mismatch.

---

### Task 1: Experiment scaffold + SCR smoke test

**Files:**
- Create: `experiments/calypso-dogfood/package.json`
- Create: `experiments/calypso-dogfood/tsconfig.json`
- Create: `experiments/calypso-dogfood/vitest.config.ts`
- Test: `experiments/calypso-dogfood/tests/smoke.test.ts`

**Interfaces:**
- Consumes: the `skeleton-crew` package via `file:../..`.
- Produces: a working build/test toolchain; proves `Runtime` imports and runs an action.

- [ ] **Step 1: Write the failing test**

`experiments/calypso-dogfood/tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew';

describe('scr smoke', () => {
  it('registers a plugin and runs its action', async () => {
    const rt = new Runtime({ config: {} });
    rt.registerPlugin({
      name: 'cmd-smoke',
      version: '1.0.0',
      setup(ctx) {
        ctx.actions.registerAction({ id: 'cmd:smoke', handler: () => 'ok' });
      },
    });
    await rt.initialize();
    const ctx = rt.getContext();
    await expect(ctx.actions.runAction('cmd:smoke')).resolves.toBe('ok');
  });
});
```

- [ ] **Step 2: Create the scaffold files**

`experiments/calypso-dogfood/package.json`:
```json
{
  "name": "calypso-dogfood",
  "version": "1.0.0",
  "description": "Dogfood: run CalypsoBot's command layer on skeleton-crew",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "tsc",
    "test": "vitest --run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit",
    "live": "npm run build && node dist/src/runtime/live.js"
  },
  "dependencies": {
    "skeleton-crew": "file:../..",
    "discord.js": "^14.16.0",
    "dayjs": "^1.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "vitest": "^4.0.15"
  }
}
```

`experiments/calypso-dogfood/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": false
  },
  "include": ["src/**/*", "harness/**/*", "tests/**/*"]
}
```

`experiments/calypso-dogfood/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } });
```

- [ ] **Step 3: Install and run the test to verify it passes**

Run:
```bash
cd experiments/calypso-dogfood && npm install && npx vitest --run tests/smoke.test.ts
```
Expected: 1 passing test. (If `skeleton-crew` fails to resolve, run `npm run build` in the repo root first so `dist/` exists.)

- [ ] **Step 4: Commit**

```bash
git add experiments/calypso-dogfood/package.json experiments/calypso-dogfood/tsconfig.json experiments/calypso-dogfood/vitest.config.ts experiments/calypso-dogfood/tests/smoke.test.ts
git commit -m "chore(calypso-dogfood): scaffold experiment + SCR smoke test"
```

---

### Task 2: `slashToContract` — derive an SCR contract from a SlashCommandBuilder

**Files:**
- Create: `experiments/calypso-dogfood/src/runtime/slashToContract.ts`
- Test: `experiments/calypso-dogfood/tests/slashToContract.test.ts`

**Interfaces:**
- Consumes: `SlashCommandBuilder` from discord.js (`.toJSON()` yields `{ options: [{ name, type, required }] }`; option `type` 6 = User, 8 = Role, 3 = String, 4 = Integer, 5 = Boolean per Discord's `ApplicationCommandOptionType`).
- Produces:
  ```ts
  export function slashToContract(builder: SlashCommandBuilder | { toJSON(): any }): {
    input: import('skeleton-crew').ActionDefinition['input'];
  };
  ```
  The derived contract always includes `invokerId: {type:'string'}` and `guildId: {type:'string'}` (required), plus one property per slash option. User/Role/String/mentionable options map to `{ type: 'string' }` (we carry IDs as strings); Integer→`{type:'number'}`; Boolean→`{type:'boolean'}`. A slash option marked `required: true` is added to the contract's `required` array.

- [ ] **Step 1: Write the failing test**

`experiments/calypso-dogfood/tests/slashToContract.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { SlashCommandBuilder } from 'discord.js';
import { slashToContract } from '../src/runtime/slashToContract.js';

describe('slashToContract', () => {
  it('derives invokerId+guildId for an arg-less command (ping)', () => {
    const b = new SlashCommandBuilder().setName('ping').setDescription('p');
    const { input } = slashToContract(b);
    expect(input).toEqual({
      type: 'object',
      properties: { invokerId: { type: 'string' }, guildId: { type: 'string' } },
      required: ['invokerId', 'guildId'],
      additionalProperties: false,
    });
  });

  it('maps an optional user option to a non-required string property (avatar)', () => {
    const b = new SlashCommandBuilder().setName('avatar').setDescription('a')
      .addUserOption(o => o.setName('user').setDescription('u').setRequired(false));
    const { input } = slashToContract(b);
    expect(input!.properties).toMatchObject({ user: { type: 'string' } });
    expect(input!.required).toEqual(['invokerId', 'guildId']);
  });

  it('maps a required role option into required[] (roleinfo)', () => {
    const b = new SlashCommandBuilder().setName('roleinfo').setDescription('r')
      .addRoleOption(o => o.setName('role').setDescription('rr').setRequired(true));
    const { input } = slashToContract(b);
    expect(input!.properties).toMatchObject({ role: { type: 'string' } });
    expect(input!.required).toContain('role');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/slashToContract.test.ts`
Expected: FAIL — "Cannot find module '../src/runtime/slashToContract.js'".

- [ ] **Step 3: Write the implementation**

`experiments/calypso-dogfood/src/runtime/slashToContract.ts`:
```ts
import type { ActionDefinition } from 'skeleton-crew';

// Discord ApplicationCommandOptionType numeric codes we handle.
const TYPE_MAP: Record<number, { type: string }> = {
  3: { type: 'string' },   // String
  4: { type: 'number' },   // Integer
  5: { type: 'boolean' },  // Boolean
  6: { type: 'string' },   // User  -> carried as ID string
  7: { type: 'string' },   // Channel
  8: { type: 'string' },   // Role  -> carried as ID string
  9: { type: 'string' },   // Mentionable
  10: { type: 'number' },  // Number
};

export function slashToContract(
  builder: { toJSON(): { options?: Array<{ name: string; type: number; required?: boolean }> } },
): { input: ActionDefinition['input'] } {
  const json = builder.toJSON();
  const properties: Record<string, { type: string }> = {
    invokerId: { type: 'string' },
    guildId: { type: 'string' },
  };
  const required: string[] = ['invokerId', 'guildId'];

  for (const opt of json.options ?? []) {
    properties[opt.name] = TYPE_MAP[opt.type] ?? { type: 'string' };
    if (opt.required) required.push(opt.name);
  }

  return {
    input: { type: 'object', properties, required, additionalProperties: false },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest --run tests/slashToContract.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add experiments/calypso-dogfood/src/runtime/slashToContract.ts experiments/calypso-dogfood/tests/slashToContract.test.ts
git commit -m "feat(calypso-dogfood): derive SCR contracts from SlashCommandBuilder"
```

---

### Task 3: Command-plugin factory + first thin-port command (`uptime`)

**Files:**
- Create: `experiments/calypso-dogfood/src/runtime/commandPlugin.ts`
- Create: `experiments/calypso-dogfood/src/commands/uptime.ts`
- Test: `experiments/calypso-dogfood/tests/uptime.test.ts`

**Interfaces:**
- Consumes: `slashToContract` (Task 2); SCR `PluginDefinition`, `RuntimeContext`.
- Produces:
  ```ts
  // The shape every carved command exports.
  export interface CarvedCommand {
    name: string;                       // e.g. 'uptime'
    builder: { toJSON(): any };         // the SlashCommandBuilder
    // thin-port handler: receives the derived input AND a host capability bag.
    run(input: Record<string, unknown>, host: CommandHost): Promise<CommandResult>;
  }
  export interface CommandHost {
    uptimeMs: number;                   // stand-in for client.uptime
    wsPingMs: number;                   // stand-in for client.ws.ping
    now(): number;                      // injectable clock (testability)
  }
  export type CommandResult = { text?: string; embed?: Record<string, unknown> };
  // Factory: turn a CarvedCommand into an SCR plugin that registers action `cmd:<name>`.
  export function makeCommandPlugin(cmd: CarvedCommand, host: CommandHost): PluginDefinition;
  ```
  The action id is `cmd:<cmd.name>`, plugin name `cmd-<cmd.name>`, version `'1.0.0'`. The action's `input` is `slashToContract(cmd.builder).input`. The handler calls `cmd.run(params, host)` and returns its `CommandResult`.

**Note on the port:** CalypsoBot commands reach into a live `interaction`/`client`. For the **thin port** we keep each command's display logic verbatim but feed it values through `input` (derived args) + `host` (the few `client.*` values it needs, e.g. `client.uptime`). This is the minimal-change port: the body that builds the embed is unchanged; only how it obtains `uptime`/`ping`/args changes.

- [ ] **Step 1: Write the failing test**

`experiments/calypso-dogfood/tests/uptime.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';

const host = { uptimeMs: 90_061_000, wsPingMs: 42, now: () => 1_700_000_000_000 };

describe('uptime command as SCR plugin', () => {
  it('registers cmd:uptime and returns humanized uptime text', async () => {
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));
    await rt.initialize();
    const ctx = rt.getContext();
    const res: any = await ctx.actions.runAction('cmd:uptime', {
      invokerId: 'u1', guildId: 'g1',
    });
    expect(res.text).toContain('1 day');
    expect(res.text).toContain('1 hour');
    expect(res.text).toContain('1 minute');
    expect(res.text).toContain('1 second');
  });
});
```
(90,061,000 ms = 1 day, 1 hour, 1 minute, 1 second.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/uptime.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the factory**

`experiments/calypso-dogfood/src/runtime/commandPlugin.ts`:
```ts
import type { PluginDefinition } from 'skeleton-crew';
import { slashToContract } from './slashToContract.js';

export interface CommandHost {
  uptimeMs: number;
  wsPingMs: number;
  now(): number;
}
export type CommandResult = { text?: string; embed?: Record<string, unknown> };

export interface CarvedCommand {
  name: string;
  builder: { toJSON(): any };
  run(input: Record<string, unknown>, host: CommandHost): Promise<CommandResult>;
}

export function makeCommandPlugin(cmd: CarvedCommand, host: CommandHost): PluginDefinition {
  const { input } = slashToContract(cmd.builder);
  return {
    name: `cmd-${cmd.name}`,
    version: '1.0.0',
    setup(ctx) {
      ctx.actions.registerAction({
        id: `cmd:${cmd.name}`,
        input,
        handler: (params: Record<string, unknown>) => cmd.run(params ?? {}, host),
      });
    },
  };
}
```

- [ ] **Step 4: Implement the carved `uptime` command**

`experiments/calypso-dogfood/src/commands/uptime.ts`:
```ts
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import { SlashCommandBuilder } from 'discord.js';
import type { CarvedCommand } from '../runtime/commandPlugin.js';

dayjs.extend(duration);

// Carried from CalypsoBot src/commands/information/uptime.ts — humanization logic
// is verbatim; the value source changes from `client.uptime` to `host.uptimeMs`.
export const uptimeCommand: CarvedCommand = {
  name: 'uptime',
  builder: new SlashCommandBuilder().setName('uptime').setDescription("Gets the bot's current uptime."),
  async run(_input, host) {
    const d = dayjs.duration(host.uptimeMs);
    const days = `${d.days()} day${d.days() === 1 ? '' : 's'}`;
    const hours = `${d.hours()} hour${d.hours() === 1 ? '' : 's'}`;
    const minutes = `${d.minutes()} minute${d.minutes() === 1 ? '' : 's'}`;
    const seconds = `${d.seconds()} second${d.seconds() === 1 ? '' : 's'}`;
    return { text: `${days}, ${hours}, ${minutes}, and ${seconds}` };
  },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest --run tests/uptime.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add experiments/calypso-dogfood/src/runtime/commandPlugin.ts experiments/calypso-dogfood/src/commands/uptime.ts experiments/calypso-dogfood/tests/uptime.test.ts
git commit -m "feat(calypso-dogfood): command-plugin factory + carved uptime (thin port)"
```

---

### Task 4: Contract enforcement at the boundary (`roleinfo`, required arg)

**Files:**
- Create: `experiments/calypso-dogfood/src/commands/roleinfo.ts`
- Test: `experiments/calypso-dogfood/tests/contract.test.ts`

**Interfaces:**
- Consumes: `makeCommandPlugin`, `CarvedCommand` (Task 3); SCR `ContractViolationError`.
- Produces: `export const roleinfoCommand: CarvedCommand;` — derives a contract with a **required** `role` string. Its `run` looks up a role from `host`-provided data; for this task the body simply echoes the role id (`{ text: 'role <id>' }`) — the point is the contract, not the embed. Roleinfo's embed fidelity is not in scope; the carved body returns a deterministic string so the test asserts on contract behavior.

  Extends `CommandHost` with an optional `roles?: Record<string, { name: string }>` field (consumed by later display tasks; unused here). Add it to the `CommandHost` interface in `commandPlugin.ts`:
  ```ts
  export interface CommandHost {
    uptimeMs: number;
    wsPingMs: number;
    now(): number;
    roles?: Record<string, { name: string }>;
  }
  ```

- [ ] **Step 1: Write the failing test**

`experiments/calypso-dogfood/tests/contract.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { Runtime, ContractViolationError } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { roleinfoCommand } from '../src/commands/roleinfo.js';

const host = { uptimeMs: 0, wsPingMs: 0, now: () => 0 };

async function boot() {
  const rt = new Runtime({ config: {} });
  rt.registerPlugin(makeCommandPlugin(roleinfoCommand, host));
  await rt.initialize();
  return rt.getContext();
}

describe('contract enforcement (roleinfo)', () => {
  it('rejects missing required role arg with ContractViolationError', async () => {
    const ctx = await boot();
    await expect(
      ctx.actions.runAction('cmd:roleinfo', { invokerId: 'u1', guildId: 'g1' }),
    ).rejects.toBeInstanceOf(ContractViolationError);
  });

  it('runs when the required role arg is present', async () => {
    const ctx = await boot();
    const res: any = await ctx.actions.runAction('cmd:roleinfo', {
      invokerId: 'u1', guildId: 'g1', role: 'r123',
    });
    expect(res.text).toBe('role r123');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/contract.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add `roles?` to `CommandHost`**

Edit `experiments/calypso-dogfood/src/runtime/commandPlugin.ts` — add the `roles?` field to the `CommandHost` interface as shown in **Interfaces** above.

- [ ] **Step 4: Implement `roleinfo`**

`experiments/calypso-dogfood/src/commands/roleinfo.ts`:
```ts
import { SlashCommandBuilder } from 'discord.js';
import type { CarvedCommand } from '../runtime/commandPlugin.js';

// Carried from CalypsoBot src/commands/information/roleinfo.ts. The required
// `role` option becomes a required contract field (see slashToContract). The
// embed body is reduced to a deterministic echo; the demonstrand is the contract.
export const roleinfoCommand: CarvedCommand = {
  name: 'roleinfo',
  builder: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Displays role information.')
    .addRoleOption(o => o.setName('role').setDescription('The role.').setRequired(true)),
  async run(input) {
    return { text: `role ${String(input.role)}` };
  },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest --run tests/contract.test.ts`
Expected: 2 passing.

- [ ] **Step 6: Commit**

```bash
git add experiments/calypso-dogfood/src/commands/roleinfo.ts experiments/calypso-dogfood/src/runtime/commandPlugin.ts experiments/calypso-dogfood/tests/contract.test.ts
git commit -m "feat(calypso-dogfood): roleinfo carve + boundary contract enforcement"
```

---

### Task 5: Ownership — duplicate command names rejected

**Files:**
- Test: `experiments/calypso-dogfood/tests/ownership.test.ts`

**Interfaces:**
- Consumes: `makeCommandPlugin`, `uptimeCommand`; SCR `DuplicateRegistrationError`.
- Produces: nothing new — this task proves an existing SCR guarantee holds for our `cmd:<name>` scheme. (CalypsoBot's glob-load would silently clobber; SCR rejects.)

- [ ] **Step 1: Write the failing test**

`experiments/calypso-dogfood/tests/ownership.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { Runtime, DuplicateRegistrationError } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';

const host = { uptimeMs: 0, wsPingMs: 0, now: () => 0 };

describe('ownership: no silent clobber', () => {
  it('rejects a second plugin registering the same cmd:uptime action', async () => {
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));
    // A second plugin that also tries to own cmd:uptime.
    rt.registerPlugin({
      name: 'cmd-uptime-evil',
      version: '1.0.0',
      setup(ctx) {
        ctx.actions.registerAction({ id: 'cmd:uptime', handler: () => ({ text: 'hijacked' }) });
      },
    });
    await expect(rt.initialize()).rejects.toBeInstanceOf(DuplicateRegistrationError);
  });
});
```

- [ ] **Step 2: Run the test to verify it captures the guarantee**

Run: `npx vitest --run tests/ownership.test.ts`
Expected: PASS. (If `initialize()` surfaces the duplicate differently — e.g. throws at `registerAction` time synchronously rather than during `initialize` — adjust the assertion to wrap the second `registerPlugin`/`initialize` accordingly. Verify the actual throw site by reading the error; do not weaken the assertion to a bare `rejects`.)

- [ ] **Step 3: Commit**

```bash
git add experiments/calypso-dogfood/tests/ownership.test.ts
git commit -m "test(calypso-dogfood): ownership rejects duplicate cmd action (no clobber)"
```

---

### Task 6: Demo 1 — hot-swap without reconnect (`uptime` v1→v2)

**Files:**
- Create: `experiments/calypso-dogfood/src/commands/uptime.v2.ts`
- Test: `experiments/calypso-dogfood/tests/demo1-swap.test.ts`

**Interfaces:**
- Consumes: `makeCommandPlugin`, `uptimeCommand`; a v2 variant; SCR `runtime.swapPlugin`.
- Produces: `export const uptimeCommandV2: CarvedCommand;` — same name/builder, reworded output (prefix `"up: "`), version bump handled by the plugin factory (bump to `'2.0.0'` — see step).

**Note:** `makeCommandPlugin` hardcodes version `'1.0.0'`. Add an optional `version` param so v2 can be `'2.0.0'`:
```ts
export function makeCommandPlugin(cmd: CarvedCommand, host: CommandHost, version = '1.0.0'): PluginDefinition
```
and use `version` in the returned def. Update the earlier call sites? No — the default keeps them at `'1.0.0'`.

- [ ] **Step 1: Write the failing test**

`experiments/calypso-dogfood/tests/demo1-swap.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';
import { uptimeCommandV2 } from '../src/commands/uptime.v2.js';

const host = { uptimeMs: 90_061_000, wsPingMs: 42, now: () => 0 };
const input = { invokerId: 'u1', guildId: 'g1' };

describe('Demo 1: hot-swap without reconnect', () => {
  it('swaps cmd:uptime live; transport identity (ctx) is unchanged', async () => {
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));
    await rt.initialize();
    const ctxBefore = rt.getContext();

    const v1: any = await ctxBefore.actions.runAction('cmd:uptime', input);
    expect(v1.text).not.toContain('up:');

    await rt.swapPlugin(makeCommandPlugin(uptimeCommandV2, host, '2.0.0'));

    const ctxAfter = rt.getContext();
    const v2: any = await ctxAfter.actions.runAction('cmd:uptime', input);
    expect(v2.text).toContain('up:');                 // behavior changed
    expect(ctxAfter).toBe(ctxBefore);                 // same context object = no "reconnect"
  });
});
```
(The context-object identity is the offline stand-in for "same Discord session id, no gateway reconnect" — spec §5 demo 1.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/demo1-swap.test.ts`
Expected: FAIL — `uptime.v2` not found.

- [ ] **Step 3: Add the `version` param to the factory**

Edit `experiments/calypso-dogfood/src/runtime/commandPlugin.ts`: change the signature to `makeCommandPlugin(cmd, host, version = '1.0.0')` and use `version` for the returned `version` field.

- [ ] **Step 4: Implement `uptime.v2`**

`experiments/calypso-dogfood/src/commands/uptime.v2.ts`:
```ts
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import { SlashCommandBuilder } from 'discord.js';
import type { CarvedCommand } from '../runtime/commandPlugin.js';

dayjs.extend(duration);

// v2 of uptime: same command, reworded output. Used to demonstrate a live swap.
export const uptimeCommandV2: CarvedCommand = {
  name: 'uptime',
  builder: new SlashCommandBuilder().setName('uptime').setDescription("Gets the bot's current uptime."),
  async run(_input, host) {
    const d = dayjs.duration(host.uptimeMs);
    return { text: `up: ${d.days()}d ${d.hours()}h ${d.minutes()}m ${d.seconds()}s` };
  },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest --run tests/demo1-swap.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add experiments/calypso-dogfood/src/commands/uptime.v2.ts experiments/calypso-dogfood/src/runtime/commandPlugin.ts experiments/calypso-dogfood/tests/demo1-swap.test.ts
git commit -m "feat(calypso-dogfood): Demo 1 — hot-swap uptime v1->v2, no reconnect"
```

---

### Task 7: Demo 2 — failed swap rolls back (atomicity)

**Files:**
- Test: `experiments/calypso-dogfood/tests/demo2-rollback.test.ts`

**Interfaces:**
- Consumes: `makeCommandPlugin`, `uptimeCommand`; a deliberately-throwing plugin `setup`; SCR `runtime.swapPlugin` (rejects on failed commit) and `PluginSwapError`.
- Produces: nothing new — proves atomic rollback for our command scheme.

- [ ] **Step 1: Write the failing test**

`experiments/calypso-dogfood/tests/demo2-rollback.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';

const host = { uptimeMs: 90_061_000, wsPingMs: 42, now: () => 0 };
const input = { invokerId: 'u1', guildId: 'g1' };

describe('Demo 2: failed swap rolls back', () => {
  it('keeps v1 serving when a swap setup throws', async () => {
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));
    await rt.initialize();
    const ctx = rt.getContext();

    const before: any = await ctx.actions.runAction('cmd:uptime', input);

    // A swap whose setup throws mid-install.
    const brokenSwap = {
      name: 'cmd-uptime',
      version: '2.0.0',
      setup() { throw new Error('boom during setup'); },
    };
    await expect(rt.swapPlugin(brokenSwap)).rejects.toBeTruthy();

    // v1 still serves, unchanged.
    const after: any = await ctx.actions.runAction('cmd:uptime', input);
    expect(after.text).toBe(before.text);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest --run tests/demo2-rollback.test.ts`
Expected: PASS. (If `swapPlugin` rejects with a specific `PluginSwapError`, tighten `.rejects.toBeTruthy()` to `.rejects.toBeInstanceOf(PluginSwapError)` and import it. Verify the real error type before tightening.)

- [ ] **Step 3: Commit**

```bash
git add experiments/calypso-dogfood/tests/demo2-rollback.test.ts
git commit -m "test(calypso-dogfood): Demo 2 — failed swap rolls back, v1 keeps serving"
```

---

### Task 8: Capability port — carve `randomcolor` (the mutating command)

**Files:**
- Create: `experiments/calypso-dogfood/src/capabilities/discord.ts`
- Create: `experiments/calypso-dogfood/src/commands/randomcolor.ts`
- Test: `experiments/calypso-dogfood/tests/randomcolor.test.ts`

**Interfaces:**
- Consumes: SCR plugin/action APIs; `slashToContract`.
- Produces:
  ```ts
  // src/capabilities/discord.ts — the injected capability (option b port).
  export interface DiscordCapability {
    getColorRoles(guildId: string): Promise<Array<{ id: string; name: string; hexColor: string }>>;
    getMemberColor(guildId: string, memberId: string): Promise<string | null>;   // current color role id
    setMemberColor(guildId: string, memberId: string, roleId: string): Promise<void>;  // remove others + add
  }
  // A deterministic fake for tests, with an injectable failure mode.
  export function makeFakeDiscord(opts?: {
    colorRoles?: Array<{ id: string; name: string; hexColor: string }>;
    failOnSet?: boolean;     // simulate role-hierarchy throw
  }): DiscordCapability;

  // src/commands/randomcolor.ts
  export interface MutatingCommand {
    name: string;
    builder: { toJSON(): any };
    run(input: Record<string, unknown>, discord: DiscordCapability): Promise<{ text: string }>;
  }
  export const randomcolorCommand: MutatingCommand;
  export function makeMutatingPlugin(
    cmd: MutatingCommand, discord: DiscordCapability, version?: string,
  ): import('skeleton-crew').PluginDefinition;  // registers cmd:<name> with derived contract
  ```
  `randomcolorCommand.run`: pick a random color role, call `discord.setMemberColor`; on success return `{ text: 'old ➔ new' }`. It does **not** swallow errors — a failing `setMemberColor` throws out of the handler, so SCR's containment (not a hand-rolled try/catch) is what protects the host. This is the deliberate inversion of CalypsoBot's original try/catch.

- [ ] **Step 1: Write the failing test**

`experiments/calypso-dogfood/tests/randomcolor.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew';
import { makeFakeDiscord } from '../src/capabilities/discord.js';
import { randomcolorCommand, makeMutatingPlugin } from '../src/commands/randomcolor.js';

const roles = [
  { id: 'c1', name: 'Color Red', hexColor: '#ff0000' },
  { id: 'c2', name: 'Color Blue', hexColor: '#0000ff' },
];
const input = { invokerId: 'u1', guildId: 'g1' };

describe('randomcolor (capability port)', () => {
  it('mutates the member color via the capability and reports the change', async () => {
    const discord = makeFakeDiscord({ colorRoles: roles });
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeMutatingPlugin(randomcolorCommand, discord));
    await rt.initialize();
    const res: any = await rt.getContext().actions.runAction('cmd:randomcolor', input);
    expect(res.text).toMatch(/➔ (Color Red|Color Blue)/);
    // capability observed the mutation
    await expect(discord.getMemberColor('g1', 'u1')).resolves.toMatch(/c1|c2/);
  });

  it('reports "no colors" when the guild has none (does not throw)', async () => {
    const discord = makeFakeDiscord({ colorRoles: [] });
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeMutatingPlugin(randomcolorCommand, discord));
    await rt.initialize();
    const res: any = await rt.getContext().actions.runAction('cmd:randomcolor', input);
    expect(res.text).toContain('no colors');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/randomcolor.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the capability**

`experiments/calypso-dogfood/src/capabilities/discord.ts`:
```ts
export interface DiscordCapability {
  getColorRoles(guildId: string): Promise<Array<{ id: string; name: string; hexColor: string }>>;
  getMemberColor(guildId: string, memberId: string): Promise<string | null>;
  setMemberColor(guildId: string, memberId: string, roleId: string): Promise<void>;
}

export function makeFakeDiscord(opts: {
  colorRoles?: Array<{ id: string; name: string; hexColor: string }>;
  failOnSet?: boolean;
} = {}): DiscordCapability {
  const colorRoles = opts.colorRoles ?? [];
  const memberColor = new Map<string, string>();   // key `${guildId}:${memberId}` -> roleId
  return {
    async getColorRoles() { return colorRoles; },
    async getMemberColor(g, m) { return memberColor.get(`${g}:${m}`) ?? null; },
    async setMemberColor(g, m, roleId) {
      if (opts.failOnSet) throw new Error('Missing Permissions: role hierarchy');
      memberColor.set(`${g}:${m}`, roleId);
    },
  };
}
```

- [ ] **Step 4: Implement `randomcolor` + its plugin factory**

`experiments/calypso-dogfood/src/commands/randomcolor.ts`:
```ts
import { SlashCommandBuilder } from 'discord.js';
import type { PluginDefinition } from 'skeleton-crew';
import { slashToContract } from '../runtime/slashToContract.js';
import type { DiscordCapability } from '../capabilities/discord.js';

export interface MutatingCommand {
  name: string;
  builder: { toJSON(): any };
  run(input: Record<string, unknown>, discord: DiscordCapability): Promise<{ text: string }>;
}

// Carried from CalypsoBot src/commands/color/randomcolor.ts. The original wraps
// the role mutation in a hand-rolled try/catch; here we DELIBERATELY remove that
// try/catch so SCR's containment is what protects the host (spec §5 demo 3).
export const randomcolorCommand: MutatingCommand = {
  name: 'randomcolor',
  builder: new SlashCommandBuilder()
    .setName('randomcolor')
    .setDescription('Changes your current color to a randomly selected one.'),
  async run(input, discord) {
    const guildId = String(input.guildId);
    const memberId = String(input.invokerId);
    const colors = await discord.getColorRoles(guildId);
    if (colors.length === 0) return { text: 'Sorry, there are no colors set on this server.' };
    // Deterministic-enough random: index by current ms is disallowed in tests, so
    // pick based on member+guild hash to stay reproducible without Math.random.
    const idx = (guildId.length + memberId.length) % colors.length;
    const chosen = colors[idx];
    const old = await discord.getMemberColor(guildId, memberId);
    await discord.setMemberColor(guildId, memberId, chosen.id);   // may throw -> contained by SCR
    const oldName = colors.find(c => c.id === old)?.name ?? 'None';
    return { text: `${oldName} ➔ ${chosen.name}` };
  },
};

export function makeMutatingPlugin(
  cmd: MutatingCommand, discord: DiscordCapability, version = '1.0.0',
): PluginDefinition {
  const { input } = slashToContract(cmd.builder);
  return {
    name: `cmd-${cmd.name}`,
    version,
    setup(ctx) {
      ctx.actions.registerAction({
        id: `cmd:${cmd.name}`,
        input,
        handler: (params: Record<string, unknown>) => cmd.run(params ?? {}, discord),
      });
    },
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest --run tests/randomcolor.test.ts`
Expected: 2 passing.

- [ ] **Step 6: Commit**

```bash
git add experiments/calypso-dogfood/src/capabilities/discord.ts experiments/calypso-dogfood/src/commands/randomcolor.ts experiments/calypso-dogfood/tests/randomcolor.test.ts
git commit -m "feat(calypso-dogfood): capability-port carve of randomcolor (mutating)"
```

---

### Task 9: Demo 3 — contained crash + bad input (`randomcolor`)

**Files:**
- Test: `experiments/calypso-dogfood/tests/demo3-containment.test.ts`

**Interfaces:**
- Consumes: `makeMutatingPlugin`, `randomcolorCommand`, `makeFakeDiscord` (with `failOnSet`); `uptimeCommand` + `makeCommandPlugin` (the surviving sibling); SCR `ContractViolationError`.
- Produces: nothing new — proves containment + contracts together.

- [ ] **Step 1: Write the failing test**

`experiments/calypso-dogfood/tests/demo3-containment.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { Runtime, ContractViolationError } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';
import { makeFakeDiscord } from '../src/capabilities/discord.js';
import { randomcolorCommand, makeMutatingPlugin } from '../src/commands/randomcolor.js';

const host = { uptimeMs: 90_061_000, wsPingMs: 42, now: () => 0 };
const good = { invokerId: 'u1', guildId: 'g1' };

async function boot(failOnSet: boolean) {
  const discord = makeFakeDiscord({
    colorRoles: [{ id: 'c1', name: 'Color Red', hexColor: '#ff0000' }],
    failOnSet,
  });
  const rt = new Runtime({ config: {} });
  rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));            // sibling
  rt.registerPlugin(makeMutatingPlugin(randomcolorCommand, discord));  // mutating
  await rt.initialize();
  return rt.getContext();
}

describe('Demo 3: containment + contracts', () => {
  it('(a) rejects bad input at the boundary; handler never runs', async () => {
    const ctx = await boot(false);
    // invokerId missing -> contract violation
    await expect(
      ctx.actions.runAction('cmd:randomcolor', { guildId: 'g1' }),
    ).rejects.toBeInstanceOf(ContractViolationError);
  });

  it('(b) a throwing randomcolor is contained; sibling cmd:uptime still serves', async () => {
    const ctx = await boot(true);   // setMemberColor throws (role hierarchy)
    await expect(ctx.actions.runAction('cmd:randomcolor', good)).rejects.toBeTruthy();
    // The host and the sibling are unharmed:
    const res: any = await ctx.actions.runAction('cmd:uptime', good);
    expect(res.text).toContain('1 day');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest --run tests/demo3-containment.test.ts`
Expected: 2 passing. (Confirms: contract rejects before the handler; a handler throw propagates to the caller as a rejected `runAction` but does not crash the runtime or the sibling action.)

- [ ] **Step 3: Commit**

```bash
git add experiments/calypso-dogfood/tests/demo3-containment.test.ts
git commit -m "test(calypso-dogfood): Demo 3 — contained crash + bad-input rejection"
```

---

### Task 10: Offline harness driver (scripted demo runner)

**Files:**
- Create: `experiments/calypso-dogfood/harness/run.ts`
- Test: `experiments/calypso-dogfood/tests/harness.test.ts`

**Interfaces:**
- Consumes: all command/plugin factories above.
- Produces:
  ```ts
  // A single boot that registers every carved command and returns a driver.
  export interface Driver {
    dispatch(name: string, input: Record<string, unknown>): Promise<unknown>;  // = runAction('cmd:'+name, input)
    swap(name: string, plugin: import('skeleton-crew').PluginDefinition): Promise<void>;
  }
  export async function bootDogfood(opts?: {
    host?: Partial<import('../src/runtime/commandPlugin.js').CommandHost>;
    discord?: import('../src/capabilities/discord.js').DiscordCapability;
  }): Promise<Driver>;
  ```
  `bootDogfood` wires uptime + roleinfo (thin) and randomcolor (capability) into one runtime, returns a `Driver` whose `dispatch` is the offline analog of the live adapter. This is the reusable harness the three demo tests could share and the `live` entry will mirror.

- [ ] **Step 1: Write the failing test**

`experiments/calypso-dogfood/tests/harness.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { bootDogfood } from '../harness/run.js';

describe('offline harness driver', () => {
  it('dispatches uptime and randomcolor through one runtime', async () => {
    const driver = await bootDogfood();
    const up: any = await driver.dispatch('uptime', { invokerId: 'u1', guildId: 'g1' });
    expect(up.text).toMatch(/day|d /);
    const rc: any = await driver.dispatch('randomcolor', { invokerId: 'u1', guildId: 'g1' });
    expect(typeof rc.text).toBe('string');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/harness.test.ts`
Expected: FAIL — `harness/run.js` not found.

- [ ] **Step 3: Implement the harness**

`experiments/calypso-dogfood/harness/run.ts`:
```ts
import { Runtime, type PluginDefinition } from 'skeleton-crew';
import { makeCommandPlugin, type CommandHost } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';
import { roleinfoCommand } from '../src/commands/roleinfo.js';
import { makeFakeDiscord, type DiscordCapability } from '../src/capabilities/discord.js';
import { randomcolorCommand, makeMutatingPlugin } from '../src/commands/randomcolor.js';

export interface Driver {
  dispatch(name: string, input: Record<string, unknown>): Promise<unknown>;
  swap(name: string, plugin: PluginDefinition): Promise<void>;
}

export async function bootDogfood(opts: {
  host?: Partial<CommandHost>;
  discord?: DiscordCapability;
} = {}): Promise<Driver> {
  const host: CommandHost = {
    uptimeMs: 90_061_000, wsPingMs: 42, now: () => 0, ...opts.host,
  };
  const discord = opts.discord ?? makeFakeDiscord({
    colorRoles: [{ id: 'c1', name: 'Color Red', hexColor: '#ff0000' }],
  });

  const rt = new Runtime({ config: {} });
  rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));
  rt.registerPlugin(makeCommandPlugin(roleinfoCommand, host));
  rt.registerPlugin(makeMutatingPlugin(randomcolorCommand, discord));
  await rt.initialize();
  const ctx = rt.getContext();

  return {
    dispatch: (name, input) => ctx.actions.runAction(`cmd:${name}`, input),
    swap: (_name, plugin) => rt.swapPlugin(plugin),
  };
}

// CLI entry: run the three demos and print a summary (used by `npm run` smoke, not live).
if (import.meta.url === `file://${process.argv[1]}`) {
  bootDogfood().then(async (d) => {
    const up = await d.dispatch('uptime', { invokerId: 'u1', guildId: 'g1' });
    console.log('uptime →', up);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest --run tests/harness.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add experiments/calypso-dogfood/harness/run.ts experiments/calypso-dogfood/tests/harness.test.ts
git commit -m "feat(calypso-dogfood): offline harness driver wiring all carved commands"
```

---

### Task 11: Live adapter + entrypoint (A mode, hand-run)

**Files:**
- Create: `experiments/calypso-dogfood/src/runtime/adapter.ts`
- Create: `experiments/calypso-dogfood/src/runtime/live.ts`
- Create: `experiments/calypso-dogfood/config.example.json`
- Test: `experiments/calypso-dogfood/tests/adapter.test.ts`

**Interfaces:**
- Consumes: `bootDogfood` (Task 10); discord.js `ChatInputCommandInteraction`, `Client`, `GatewayIntentBits`, `Events`; SCR `ContractViolationError`.
- Produces:
  ```ts
  // adapter.ts — translate a discord.js interaction into a dispatch + render the reply.
  export function extractInput(interaction: {
    user: { id: string }; guildId: string | null;
    options: { get(name: string): { value?: unknown } | null };
    commandName: string;
    optionNames: string[];   // names to pull from options (derived from the builder)
  }): Record<string, unknown>;
  export function renderReply(result: unknown): string;     // CommandResult|string -> reply text
  export function renderError(err: unknown): string;        // ContractViolationError -> friendly text
  ```
  `live.ts` boots a real discord.js `Client`, calls `bootDogfood`, and on `Events.InteractionCreate` does `extractInput → driver.dispatch → renderReply`, catching errors into `renderError`. It reads a token from `config.example.json` (copied to `config.json`, gitignored). This entry is **hand-run only** and is not part of CI.

- [ ] **Step 1: Write the failing test (adapter pure functions only — no live client)**

`experiments/calypso-dogfood/tests/adapter.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ContractViolationError } from 'skeleton-crew';
import { extractInput, renderReply, renderError } from '../src/runtime/adapter.js';

describe('adapter pure functions', () => {
  it('extractInput pulls invokerId/guildId + named options', () => {
    const interaction = {
      user: { id: 'u1' }, guildId: 'g1', commandName: 'roleinfo',
      options: { get: (n: string) => (n === 'role' ? { value: 'r9' } : null) },
      optionNames: ['role'],
    };
    expect(extractInput(interaction)).toEqual({ invokerId: 'u1', guildId: 'g1', role: 'r9' });
  });

  it('renderReply turns a CommandResult into text', () => {
    expect(renderReply({ text: 'hello' })).toBe('hello');
  });

  it('renderError gives a friendly message for ContractViolationError', () => {
    const err = new ContractViolationError('cmd:roleinfo', [
      { path: '/role', expected: 'string', actual: 'undefined' } as any,
    ]);
    expect(renderError(err)).toMatch(/invalid/i);
  });
});
```
(Verify `ContractViolationError`'s constructor signature before this step — read `src/types.ts` around line 95-110. If it differs, construct it via a real failed `runAction` in the test instead of `new`.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/adapter.test.ts`
Expected: FAIL — `adapter.js` not found.

- [ ] **Step 3: Implement the adapter**

`experiments/calypso-dogfood/src/runtime/adapter.ts`:
```ts
import { ContractViolationError } from 'skeleton-crew';

export function extractInput(interaction: {
  user: { id: string }; guildId: string | null;
  options: { get(name: string): { value?: unknown } | null };
  optionNames: string[];
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    invokerId: interaction.user.id,
    guildId: interaction.guildId ?? '',
  };
  for (const name of interaction.optionNames) {
    const opt = interaction.options.get(name);
    if (opt && opt.value !== undefined) out[name] = String(opt.value);
  }
  return out;
}

export function renderReply(result: unknown): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && 'text' in result) {
    return String((result as { text: unknown }).text);
  }
  return 'Done.';
}

export function renderError(err: unknown): string {
  if (err instanceof ContractViolationError) {
    return `Your input was invalid: ${err.message}`;
  }
  return 'That command errored — the bot is still running.';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest --run tests/adapter.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Implement the live entry + config example**

`experiments/calypso-dogfood/config.example.json`:
```json
{ "token": "PUT-YOUR-DISCORD-BOT-TOKEN-HERE", "guildId": "YOUR-TEST-GUILD-ID" }
```

`experiments/calypso-dogfood/src/runtime/live.ts`:
```ts
import { readFile } from 'node:fs/promises';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { bootDogfood } from '../../harness/run.js';
import { extractInput, renderReply, renderError } from './adapter.js';

// Hand-run only (npm run live). Not part of CI. Proves the SAME carved commands
// serve over a real gateway; hot-swap is invoked from a REPL/SIGUSR2 by hand.
const cfg = JSON.parse(await readFile(new URL('../../config.json', import.meta.url), 'utf8'));
const driver = await bootDogfood();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const optionNames = interaction.options.data.map((o) => o.name);
  try {
    const input = extractInput({
      user: interaction.user, guildId: interaction.guildId,
      options: { get: (n) => interaction.options.get(n) }, optionNames,
    });
    const result = await driver.dispatch(interaction.commandName, input);
    await interaction.reply(renderReply(result));
  } catch (err) {
    await interaction.reply(renderError(err));
  }
});

client.once(Events.ClientReady, (c) => console.log(`live as ${c.user.tag} — session ${c.ws.shards.first()?.id}`));
await client.login(cfg.token);
```

- [ ] **Step 6: Gitignore the real config; commit**

Append to `experiments/calypso-dogfood/.gitignore` (create it):
```
config.json
dist/
node_modules/
```
```bash
git add experiments/calypso-dogfood/src/runtime/adapter.ts experiments/calypso-dogfood/src/runtime/live.ts experiments/calypso-dogfood/config.example.json experiments/calypso-dogfood/.gitignore experiments/calypso-dogfood/tests/adapter.test.ts
git commit -m "feat(calypso-dogfood): live adapter + hand-run entrypoint (A mode)"
```

---

### Task 12: Full suite green + honest README (findings)

**Files:**
- Create: `experiments/calypso-dogfood/README.md`

**Interfaces:**
- Consumes: every test above.
- Produces: the findings artifact (spec §8 honesty gate).

- [ ] **Step 1: Run the entire suite**

Run: `cd experiments/calypso-dogfood && npx vitest --run`
Expected: all tests across smoke, slashToContract, uptime, contract, ownership, demo1-3, randomcolor, harness, adapter pass. Record the exact pass count.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors. Fix any type drift before proceeding.

- [ ] **Step 3: Write the README**

`experiments/calypso-dogfood/README.md` — must contain:
- **What this is:** dogfood of CalypsoBot's command layer on SCR.
- **Guarantee → demo table** (the four guarantees, which test proves each).
- **Proved-live vs asserted-offline** section: state plainly that Demos 1–3 are proven as **offline vitest assertions**; live mode (`npm run live`) is **hand-run only** and, unless a live run was actually performed and logged, says "live confirmation: not yet run" — do not imply otherwise (spec §8).
- **What carried verbatim vs changed:** uptime/roleinfo bodies are near-verbatim (thin port); randomcolor was inverted from a hand-rolled try/catch to rely on SCR containment (capability port).
- **Honest limitations:** read-only commands carry no DB; `color.ts` excluded; no throughput claims (that's `hotswap-stress`).
- **Follow-up decision:** evaluate this result; if clean, a later experiment ports onto a maintained framework (yuudachi/sudobot).

- [ ] **Step 4: Commit**

```bash
git add experiments/calypso-dogfood/README.md
git commit -m "docs(calypso-dogfood): honest findings README + guarantee/demo map"
```

---

## Self-Review

**Spec coverage:**
- §1 thesis / found-code gaps → Tasks 5 (ownership), 6 (swap), 7 (rollback), 9 (containment/contracts). ✓
- §2 scope (info commands + randomcolor; color.ts excluded) → Tasks 3,4,8; color.ts never carved. ✓ (Note: spec lists ping/userinfo/serverinfo/avatar/botinfo as candidates; the plan carves a representative subset — uptime, roleinfo (thin) + randomcolor (capability) — sufficient to prove every guarantee. Additional read-only carves are mechanical repeats of Task 3 and intentionally not enumerated to avoid bloat; the README notes the representative subset.)
- §3 architecture (3 layers; thin vs capability port) → Tasks 3 (factory/thin), 8 (capability), 11 (adapter). ✓
- §4 contract derivation → Task 2. ✓
- §5 three demos → Tasks 6, 7, 9. ✓
- §6 layout → matches Tasks 1–12 file paths. ✓
- §7 test layer + error handling → Tasks 10 (harness), 11 (adapter render/error). ✓
- §8 honesty gate → Task 12. ✓
- §9 success criteria → parity (Task 3), derived contracts (Task 2), 3 demos offline (6,7,9), one live run (Task 11 hand-run; README records status), honest README (Task 12). ✓

**Placeholder scan:** No TBD/TODO. Two tasks (5, 7) include conditional assertion-tightening guidance with explicit instruction to verify the real error type first — these are verification directions, not placeholders.

**Type consistency:** `CarvedCommand`/`CommandHost`/`CommandResult` defined in Task 3, extended once (Task 4 adds `roles?`), consumed consistently. `MutatingCommand`/`DiscordCapability` defined Task 8, consumed Tasks 9–11. `makeCommandPlugin(cmd, host, version?)` signature settled in Task 6 and used thereafter. Action ids `cmd:<name>`, plugin names `cmd-<name>` consistent throughout. `bootDogfood`/`Driver` defined Task 10, consumed Task 11.

**Known intentional simplifications (flagged honestly, not hidden):**
- `slashToContract` handles flat options only (no subcommands/groups) — none of the carved commands use them.
- `randomcolor` uses a deterministic index (member+guild length) instead of `Math.random()`, because the SCR repo bans `Math.random()` in some contexts and determinism aids testing; the README notes this differs from the original's `colors.random()`.
- Roleinfo's embed is reduced to an echo; the demonstrand is the contract, not embed fidelity (stated in Task 4).
