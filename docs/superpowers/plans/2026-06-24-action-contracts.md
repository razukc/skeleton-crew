# Enforced Action Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a plugin attach JSON-Schema input/output contracts to an action; the runtime enforces input at the single `runAction` funnel and serves the same schema bytes via `introspect()`, so an AI agent can call and build features without reading handler source.

**Architecture:** A new zero-dependency `ContractValidator` checks a value against the supported JSON-Schema subset and validates that a schema document only uses enforced keywords. `ActionEngine` stores `input`/`output` schemas on the definition, rejects out-of-vocabulary schemas at registration, and validates `params` once before the retry loop, throwing a batched `ContractViolationError` traced as `status:'contract'`. `introspect()` serves the stored schemas plus `supportedKeywords`/`schemaVersion`; the swap pre-flight rejects malformed/out-of-vocabulary schemas. Everything is additive and opt-in — no schema means today's behavior, zero overhead.

**Tech Stack:** TypeScript (ES2022, strict, ESM with `.js` import specifiers), Vitest. Zero new runtime dependencies.

## Global Constraints

- **Zero new runtime dependencies** — the validator is hand-written; no Zod/Ajv/etc. (verbatim spec §0, §7).
- **Additive & opt-in** — every existing plugin/call site behaves identically with no schema present; ships as **0.7.0** minor; no migration (spec §1).
- **Closed vocabulary** — a schema may use ONLY enforced keywords; unsupported keyword → rejected at registration (spec §2.3). The enforced set is a **single shared constant** consumed by both validator and registration guard so they cannot drift.
- **Enforced subset (v1, verbatim spec §2.3):** `type` (`object|array|string|number|integer|boolean|null`), `required`, `properties`, `items`, `enum`, `nullable`, `minLength`, `maxLength`, `minimum`, `maximum`.
- **Serve = enforce, by identity** — `introspect()` returns the same schema object the validator runs (spec §3.5, §4).
- **Input enforced on hot path; output declared+served+swap-checked, NOT hot-path validated in v1** (spec §5).
- **ESM imports use `.js` specifiers; tests under `tests/unit/*.test.ts`; `import { describe, it, expect } from 'vitest'`.**
- **TS is strict + `noUnusedLocals`/`noUnusedParameters`** — no unused symbols.

---

## File Structure

- **Create `src/contract-validator.ts`** — the pure checker + keyword-vocabulary guard + the shared `SUPPORTED_KEYWORDS`/`SUPPORTED_TYPES` constants + `JsonSchema`/`Violation` types. One responsibility: schema validation, no engine/runtime knowledge.
- **Create `tests/unit/contract-validator.test.ts`** — exhaustive unit tests for the checker.
- **Create `tests/unit/action-contracts.test.ts`** — engine-level contract behavior + the capstone behavioral test.
- **Modify `src/types.ts`** — add `input?`/`output?` to `ActionDefinition`; add `'contract'` to `TraceStatus`; add `ContractViolationError`; extend `ActionMetadata` + `IntrospectionAPI` shape.
- **Modify `src/action-engine.ts`** — store/validate schemas; reject out-of-vocabulary at registration; validate input before the retry loop; emit `'contract'` trace.
- **Modify `src/runtime-context.ts`** — `introspect()` serves schemas + state + `supportedKeywords` + `schemaVersion`.
- **Modify `src/plugin-registry.ts`** — swap pre-flight schema honesty check.
- **Modify `src/index.ts`** — export `ContractViolationError`, `ContractValidator` types/consts.
- **Modify `package.json`** — version → `0.7.0`.

---

## Task 1: ContractValidator — supported constants + types + keyword guard

**Files:**
- Create: `src/contract-validator.ts`
- Test: `tests/unit/contract-validator.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SUPPORTED_TYPES: readonly string[]` = `['object','array','string','number','integer','boolean','null']`.
  - `SUPPORTED_KEYWORDS: readonly string[]` = `['type','required','properties','items','enum','nullable','minLength','maxLength','minimum','maximum']`.
  - `SCHEMA_MAX_DEPTH = 32`.
  - `type JsonSchema = Record<string, unknown>` (a plain JSON-Schema object).
  - `interface SchemaCheckResult { ok: boolean; badKeyword?: string; reason?: string }`.
  - `function validateSchemaDocument(schema: unknown, depth?: number): SchemaCheckResult` — returns `{ok:false, badKeyword}` if any keyword is outside `SUPPORTED_KEYWORDS`, `{ok:false, reason}` if a `type` value is unsupported / depth exceeds `SCHEMA_MAX_DEPTH` / a cycle is detected, else `{ok:true}`. Recurses into `properties` values and `items`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/contract-validator.test.ts
import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_KEYWORDS, SUPPORTED_TYPES, SCHEMA_MAX_DEPTH,
  validateSchemaDocument,
} from '../../src/contract-validator.js';

describe('validateSchemaDocument — closed vocabulary', () => {
  it('accepts a schema using only supported keywords', () => {
    const r = validateSchemaDocument({
      type: 'object', required: ['title'],
      properties: { title: { type: 'string', minLength: 1 }, priority: { enum: [1, 2, 3] } },
    });
    expect(r.ok).toBe(true);
  });

  it('rejects an unsupported keyword, naming it', () => {
    const r = validateSchemaDocument({ type: 'string', pattern: '^[A-Z]' });
    expect(r.ok).toBe(false);
    expect(r.badKeyword).toBe('pattern');
  });

  it('rejects an unsupported keyword nested in properties', () => {
    const r = validateSchemaDocument({
      type: 'object', properties: { name: { type: 'string', format: 'email' } },
    });
    expect(r.ok).toBe(false);
    expect(r.badKeyword).toBe('format');
  });

  it('rejects an unsupported type value', () => {
    const r = validateSchemaDocument({ type: 'bigint' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/type/i);
  });

  it('rejects a schema deeper than SCHEMA_MAX_DEPTH', () => {
    let s: any = { type: 'string' };
    for (let i = 0; i < SCHEMA_MAX_DEPTH + 2; i++) s = { type: 'object', properties: { x: s } };
    expect(validateSchemaDocument(s).ok).toBe(false);
  });

  it('rejects a cyclic schema document', () => {
    const s: any = { type: 'object', properties: {} };
    s.properties.self = s;
    expect(validateSchemaDocument(s).ok).toBe(false);
  });

  it('exposes the supported sets as the single source of truth', () => {
    expect(SUPPORTED_KEYWORDS).toContain('enum');
    expect(SUPPORTED_KEYWORDS).not.toContain('pattern');
    expect(SUPPORTED_TYPES).toContain('integer');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/code/playground/skeleton-crew-runtime && npx vitest run tests/unit/contract-validator.test.ts`
Expected: FAIL — `Cannot find module '../../src/contract-validator.js'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/contract-validator.ts

/** JSON-Schema types the v1 validator can enforce. */
export const SUPPORTED_TYPES = [
  'object', 'array', 'string', 'number', 'integer', 'boolean', 'null',
] as const;

/** The ONLY keywords a contract schema may use. The closed vocabulary: the
 *  runtime never serves or even lets you express a constraint it won't enforce.
 *  Consumed by BOTH the value checker and the registration guard so they cannot
 *  drift. */
export const SUPPORTED_KEYWORDS = [
  'type', 'required', 'properties', 'items', 'enum', 'nullable',
  'minLength', 'maxLength', 'minimum', 'maximum',
] as const;

/** Bound on schema nesting — rejects pathological/recursive documents (DoS). */
export const SCHEMA_MAX_DEPTH = 32;

export type JsonSchema = Record<string, unknown>;

export interface SchemaCheckResult {
  ok: boolean;
  badKeyword?: string;
  reason?: string;
}

const KEYWORD_SET = new Set<string>(SUPPORTED_KEYWORDS);
const TYPE_SET = new Set<string>(SUPPORTED_TYPES);

/** Validate that a schema DOCUMENT only uses enforced keywords, only names
 *  supported types, is within depth, and is acyclic. Called at registration and
 *  at swap pre-flight. */
export function validateSchemaDocument(
  schema: unknown,
  depth = 0,
  seen: Set<object> = new Set(),
): SchemaCheckResult {
  if (schema === null || typeof schema !== 'object') {
    return { ok: false, reason: 'schema must be an object' };
  }
  if (depth > SCHEMA_MAX_DEPTH) {
    return { ok: false, reason: `schema nesting exceeds ${SCHEMA_MAX_DEPTH}` };
  }
  if (seen.has(schema as object)) {
    return { ok: false, reason: 'cyclic schema document' };
  }
  seen.add(schema as object);

  const s = schema as JsonSchema;
  for (const key of Object.keys(s)) {
    if (!KEYWORD_SET.has(key)) {
      return { ok: false, badKeyword: key };
    }
  }
  if ('type' in s && !TYPE_SET.has(s.type as string)) {
    return { ok: false, reason: `unsupported type "${String(s.type)}"` };
  }
  if (s.properties && typeof s.properties === 'object') {
    for (const sub of Object.values(s.properties as Record<string, unknown>)) {
      const r = validateSchemaDocument(sub, depth + 1, seen);
      if (!r.ok) return r;
    }
  }
  if (s.items !== undefined) {
    const r = validateSchemaDocument(s.items, depth + 1, seen);
    if (!r.ok) return r;
  }
  seen.delete(schema as object);
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/contract-validator.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/contract-validator.ts tests/unit/contract-validator.test.ts
git commit -m "feat(contracts): schema-document keyword/depth/cycle guard"
```

---

## Task 2: ContractValidator — value validation with batched violations

**Files:**
- Modify: `src/contract-validator.ts`
- Test: `tests/unit/contract-validator.test.ts`

**Interfaces:**
- Consumes: `JsonSchema` (Task 1).
- Produces:
  - `interface Violation { path: string; expected: string; actual: string; schema: JsonSchema }`.
  - `interface ValueCheckResult { ok: boolean; violations: Violation[] }`.
  - `function validateValue(schema: JsonSchema, value: unknown): ValueCheckResult` — checks `value` against `schema`, collecting ALL violations (never first-fail). `path` is a JSON-pointer (`''` for root, `/title`, `/items/0`). Supports the enforced subset only.

- [ ] **Step 1: Write the failing test** (append to the same file)

```ts
import { validateValue } from '../../src/contract-validator.js';

describe('validateValue — batched violations', () => {
  const schema = {
    type: 'object', required: ['title'],
    properties: {
      title: { type: 'string', minLength: 1 },
      priority: { enum: [1, 2, 3] },
      tags: { type: 'array', items: { type: 'string' } },
    },
  };

  it('passes a valid value', () => {
    const r = validateValue(schema, { title: 'x', priority: 2, tags: ['a'] });
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it('reports a missing required field with its path', () => {
    const r = validateValue(schema, { priority: 2 });
    expect(r.ok).toBe(false);
    expect(r.violations).toContainEqual(
      expect.objectContaining({ path: '/title', expected: expect.stringMatching(/required|string/) }),
    );
  });

  it('collects ALL violations, not just the first', () => {
    const r = validateValue(schema, { priority: 9, tags: [5] });
    // missing title + bad enum priority + bad array item type = 3
    expect(r.violations.length).toBeGreaterThanOrEqual(3);
    const paths = r.violations.map(v => v.path).sort();
    expect(paths).toContain('/title');
    expect(paths).toContain('/priority');
    expect(paths).toContain('/tags/0');
  });

  it('reports a wrong scalar type with expected/actual', () => {
    const r = validateValue({ type: 'object', properties: { n: { type: 'number' } } }, { n: 'oops' });
    expect(r.violations[0]).toMatchObject({ path: '/n', expected: 'number', actual: 'string' });
  });

  it('honors nullable', () => {
    expect(validateValue({ type: 'string', nullable: true }, null).ok).toBe(true);
    expect(validateValue({ type: 'string' }, null).ok).toBe(false);
  });

  it('enforces minLength/maxLength/minimum/maximum', () => {
    expect(validateValue({ type: 'string', minLength: 2 }, 'a').ok).toBe(false);
    expect(validateValue({ type: 'number', maximum: 10 }, 11).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/contract-validator.test.ts`
Expected: FAIL — `validateValue is not a function`.

- [ ] **Step 3: Write minimal implementation** (append to `src/contract-validator.ts`)

```ts
export interface Violation {
  path: string;
  expected: string;
  actual: string;
  schema: JsonSchema;
}

export interface ValueCheckResult {
  ok: boolean;
  violations: Violation[];
}

/** JSON-Schema "type" name for a runtime value (integer is a number subset). */
function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v; // 'string' | 'boolean' | 'object' | ...
}

function matchesType(declared: string, actual: string): boolean {
  if (declared === 'number') return actual === 'number' || actual === 'integer';
  if (declared === 'integer') return actual === 'integer';
  return declared === actual;
}

/** Validate a value against a schema, collecting every violation. */
export function validateValue(schema: JsonSchema, value: unknown): ValueCheckResult {
  const violations: Violation[] = [];
  walk(schema, value, '', violations);
  return { ok: violations.length === 0, violations };
}

function walk(schema: JsonSchema, value: unknown, path: string, out: Violation[]): void {
  // nullable short-circuit
  if (value === null) {
    if (schema.nullable === true) return;
    if (schema.type === 'null') return;
  }

  if (typeof schema.type === 'string') {
    const actual = typeOf(value);
    if (!matchesType(schema.type, actual)) {
      out.push({ path: path || '/', expected: schema.type, actual, schema });
      return; // shape is wrong; deeper checks would be noise
    }
  }

  if (Array.isArray(schema.enum)) {
    if (!schema.enum.some((e) => e === value)) {
      out.push({ path: path || '/', expected: `one of ${JSON.stringify(schema.enum)}`, actual: JSON.stringify(value), schema });
    }
  }

  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      out.push({ path: path || '/', expected: `minLength ${schema.minLength}`, actual: `length ${value.length}`, schema });
    }
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
      out.push({ path: path || '/', expected: `maxLength ${schema.maxLength}`, actual: `length ${value.length}`, schema });
    }
  }

  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      out.push({ path: path || '/', expected: `minimum ${schema.minimum}`, actual: String(value), schema });
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      out.push({ path: path || '/', expected: `maximum ${schema.maximum}`, actual: String(value), schema });
    }
  }

  if (schema.type === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(schema.required)) {
      for (const key of schema.required as string[]) {
        if (!(key in obj)) {
          out.push({ path: `${path}/${key}`, expected: 'required', actual: 'undefined', schema });
        }
      }
    }
    if (schema.properties && typeof schema.properties === 'object') {
      const props = schema.properties as Record<string, JsonSchema>;
      for (const [key, sub] of Object.entries(props)) {
        if (key in obj) walk(sub, obj[key], `${path}/${key}`, out);
      }
    }
  }

  if (schema.type === 'array' && Array.isArray(value) && schema.items && typeof schema.items === 'object') {
    value.forEach((el, i) => walk(schema.items as JsonSchema, el, `${path}/${i}`, out));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/contract-validator.test.ts`
Expected: PASS (all Task 1 + Task 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/contract-validator.ts tests/unit/contract-validator.test.ts
git commit -m "feat(contracts): value validation with batched JSON-pointer violations"
```

---

## Task 3: Types — ActionDefinition schemas, 'contract' trace status, ContractViolationError

**Files:**
- Modify: `src/types.ts` (ActionDefinition ~203-222; TraceStatus line 389; ActionMetadata ~379-385; error classes block ~78-90)
- Test: `tests/unit/error-classes.test.ts`

**Interfaces:**
- Consumes: `Violation` (Task 2).
- Produces:
  - `ActionDefinition` gains `input?: JsonSchema | null` and `output?: JsonSchema | null` (`null` = declared-none; absent = undeclared).
  - `TraceStatus` gains `'contract'`.
  - `ActionMetadata` gains `input?`, `output?`, `inputState`/`outputState: 'declared'|'none'|'undeclared'`.
  - `class ContractViolationError extends Error` with `code:'CONTRACT_INPUT_VIOLATION'`, `actionId:string`, `violations:Violation[]`.

- [ ] **Step 1: Write the failing test** (append to `tests/unit/error-classes.test.ts`)

```ts
import { ContractViolationError } from '../../src/types.js';

describe('ContractViolationError', () => {
  it('carries code, actionId, and batched violations with a loud message', () => {
    const err = new ContractViolationError('tasks:create', [
      { path: '/title', expected: 'string', actual: 'undefined', schema: { type: 'string' } },
      { path: '/priority', expected: 'one of [1,2,3]', actual: '9', schema: { enum: [1, 2, 3] } },
    ]);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ContractViolationError');
    expect(err.code).toBe('CONTRACT_INPUT_VIOLATION');
    expect(err.actionId).toBe('tasks:create');
    expect(err.violations).toHaveLength(2);
    expect(err.message).toContain('tasks:create');
    expect(err.message).toContain('/title');
    expect(err.message).toContain('/priority');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/error-classes.test.ts`
Expected: FAIL — `ContractViolationError` not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/types.ts`, add `import type { Violation, JsonSchema } from './contract-validator.js';` at the top of the file (after the leading comment).

Add the error class after `PluginSwapError` (~line 90):

```ts
/**
 * Thrown when an action's input fails its declared contract. Carries the FULL
 * batched violation set so an agent can fix every problem in one cycle.
 */
export class ContractViolationError extends Error {
  public readonly code = 'CONTRACT_INPUT_VIOLATION' as const;
  constructor(
    public actionId: string,
    public violations: Violation[],
  ) {
    super(
      `Action "${actionId}" input violated its contract:\n` +
      violations.map((v) => `  ${v.path}: expected ${v.expected}, got ${v.actual}`).join('\n'),
    );
    this.name = 'ContractViolationError';
  }
}
```

Extend `ActionDefinition` (after `description?` ~line 221):

```ts
  /** JSON-Schema for the action's input. `null` = declared-none (takes no
   *  input; any params rejected). Absent = undeclared (no enforcement). */
  input?: JsonSchema | null;
  /** JSON-Schema for the action's output. Declared+served+swap-checked; NOT
   *  hot-path validated in v1. */
  output?: JsonSchema | null;
```

Change `TraceStatus` (line 389):

```ts
export type TraceStatus = 'success' | 'error' | 'timeout' | 'memory' | 'contract';
```

Extend `ActionMetadata` (~line 379-385):

```ts
export interface ActionMetadata {
  id: string;
  timeout?: number;
  retry?: number;
  memoryLimitMb?: number;
  description?: string;
  input?: JsonSchema | null;
  output?: JsonSchema | null;
  inputState: 'declared' | 'none' | 'undeclared';
  outputState: 'declared' | 'none' | 'undeclared';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/error-classes.test.ts && npx tsc --noEmit`
Expected: PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts tests/unit/error-classes.test.ts
git commit -m "feat(contracts): ActionDefinition schemas, contract trace status, ContractViolationError"
```

---

## Task 4: ActionEngine — reject out-of-vocabulary schemas at registration

**Files:**
- Modify: `src/action-engine.ts` (`registerAction` ~72-103; `replaceAtomic` ~122-131)
- Test: `tests/unit/action-contracts.test.ts`

**Interfaces:**
- Consumes: `validateSchemaDocument` (Task 1), `ValidationError` (existing).
- Produces: `registerAction`/`replaceAtomic` throw `ValidationError('Action','input'|'output', id)` when a declared schema uses an unsupported keyword or is malformed. A `null` or absent schema is accepted.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/action-contracts.test.ts
import { describe, it, expect } from 'vitest';
import { ActionEngine } from '../../src/action-engine.js';
import type { Logger } from '../../src/types.js';
import { ValidationError } from '../../src/types.js';

function logger(): Logger { return { debug() {}, info() {}, warn() {}, error() {} }; }

describe('contract registration guard', () => {
  it('rejects an action whose input schema uses an unsupported keyword', () => {
    const eng = new ActionEngine(logger());
    expect(() => eng.registerAction({
      id: 'x:a', handler: () => 1,
      input: { type: 'string', pattern: '^[A-Z]' } as any,
    })).toThrow(ValidationError);
  });

  it('accepts a supported-only input schema, and accepts null/absent', () => {
    const eng = new ActionEngine(logger());
    expect(() => eng.registerAction({ id: 'x:b', handler: () => 1, input: { type: 'object' } })).not.toThrow();
    expect(() => eng.registerAction({ id: 'x:c', handler: () => 1, input: null })).not.toThrow();
    expect(() => eng.registerAction({ id: 'x:d', handler: () => 1 })).not.toThrow();
  });

  it('rejects an unsupported OUTPUT schema at registration too', () => {
    const eng = new ActionEngine(logger());
    expect(() => eng.registerAction({
      id: 'x:e', handler: () => 1, output: { type: 'object', properties: { e: { format: 'email' } } } as any,
    })).toThrow(ValidationError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/action-contracts.test.ts`
Expected: FAIL — schemas accepted, no throw.

- [ ] **Step 3: Write minimal implementation**

In `src/action-engine.ts`, add the import at the top:

```ts
import { validateSchemaDocument, validateValue } from './contract-validator.js';
```

Add a private helper to the class (e.g. just above `registerAction`):

```ts
  /** Reject a declared schema that uses keywords/types the runtime can't
   *  enforce, or is malformed. `null`/`undefined` schemas are allowed. */
  private assertSchemaEnforceable(schema: unknown, id: string, field: 'input' | 'output'): void {
    if (schema === null || schema === undefined) return;
    const r = validateSchemaDocument(schema);
    if (!r.ok) {
      this.logger.error(`Action "${id}" ${field} schema rejected: ${r.badKeyword ? `unsupported keyword "${r.badKeyword}"` : r.reason}`);
      throw new ValidationError('Action', field, id);
    }
  }
```

In `registerAction`, after the `handler` validation (after line 79) and before the duplicate check:

```ts
    this.assertSchemaEnforceable(action.input, action.id, 'input');
    this.assertSchemaEnforceable(action.output, action.id, 'output');
```

Add the identical two lines to `replaceAtomic` after its handler check (after line 128).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/action-contracts.test.ts && npx vitest run tests/unit/action-engine.test.ts`
Expected: PASS; existing action-engine tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/action-engine.ts tests/unit/action-contracts.test.ts
git commit -m "feat(contracts): reject out-of-vocabulary schemas at registration"
```

---

## Task 5: ActionEngine — enforce input once, before the retry loop, traced 'contract'

**Files:**
- Modify: `src/action-engine.ts` (`runAction` ~165-248)
- Test: `tests/unit/action-contracts.test.ts`

**Interfaces:**
- Consumes: `validateValue` (Task 2), `ContractViolationError` (Task 3).
- Produces: `runAction` validates `params` against the action's `input` schema once before the attempt loop; on failure throws `ContractViolationError` and emits one trace `{status:'contract'}`; `declared-none` (`input:null`) rejects any non-`undefined` params; absent input unchanged; valid/zero-overhead paths unchanged.

- [ ] **Step 1: Write the failing test** (append to `tests/unit/action-contracts.test.ts`)

```ts
import { ContractViolationError } from '../../src/types.js';
import type { RuntimeContext, TraceEntry } from '../../src/types.js';

function ctx(): RuntimeContext { return {} as unknown as RuntimeContext; }

describe('contract input enforcement at runAction', () => {
  it('rejects bad input with ContractViolationError carrying all violations', async () => {
    const eng = new ActionEngine(logger());
    eng.setContext(ctx());
    eng.registerAction({
      id: 't:create', handler: (p: any) => p,
      input: { type: 'object', required: ['title'], properties: { priority: { enum: [1, 2, 3] } } },
    });
    await expect(eng.runAction('t:create', { priority: 9 })).rejects.toBeInstanceOf(ContractViolationError);
    try { await eng.runAction('t:create', { priority: 9 }); }
    catch (e) {
      const err = e as ContractViolationError;
      expect(err.violations.map(v => v.path).sort()).toEqual(['/priority', '/title']);
    }
  });

  it('validates once — a retryable action does NOT retry a contract violation', async () => {
    const traces: TraceEntry[] = [];
    const eng = new ActionEngine(logger(), (t) => traces.push(t));
    eng.setContext(ctx());
    eng.registerAction({ id: 't:r', handler: () => 1, retry: 3, input: { type: 'object', required: ['x'] } });
    await expect(eng.runAction('t:r', {})).rejects.toBeInstanceOf(ContractViolationError);
    const contractTraces = traces.filter(t => t.status === 'contract');
    expect(contractTraces).toHaveLength(1);          // not 1 + retry
  });

  it('declared-none rejects any params but allows undefined', async () => {
    const eng = new ActionEngine(logger());
    eng.setContext(ctx());
    eng.registerAction({ id: 't:n', handler: () => 'ok', input: null });
    await expect(eng.runAction('t:n', { a: 1 })).rejects.toBeInstanceOf(ContractViolationError);
    expect(await eng.runAction('t:n')).toBe('ok');
  });

  it('undeclared input and valid input are unaffected', async () => {
    const eng = new ActionEngine(logger());
    eng.setContext(ctx());
    eng.registerAction({ id: 't:u', handler: (p: any) => p });           // undeclared
    expect(await eng.runAction('t:u', { anything: true })).toEqual({ anything: true });
    eng.registerAction({ id: 't:v', handler: (p: any) => p, input: { type: 'object', required: ['x'] } });
    expect(await eng.runAction('t:v', { x: 1 })).toEqual({ x: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/action-contracts.test.ts`
Expected: FAIL — no contract enforcement yet.

- [ ] **Step 3: Write minimal implementation**

In `runAction`, immediately after the `if (!this.context)` guard (after line 179) and BEFORE `const maxAttempts = …` (line 181), insert:

```ts
    // Contract: validate input ONCE, before the retry loop. A violation is
    // deterministic — retrying wastes work and would spam identical traces.
    if (action.input !== undefined) {
      let violations;
      if (action.input === null) {
        // declared-none: any non-undefined params is a violation
        violations = params === undefined ? [] :
          [{ path: '/', expected: 'no input', actual: typeof params, schema: {} as any }];
      } else {
        // A bug in OUR validator must surface as its own error, never be
        // mistaken for a faulty caller (spec §5: validator-internal failure).
        try {
          violations = validateValue(action.input, params).violations;
        } catch (validatorBug) {
          this.logger.error(`Contract validator failed for "${id}"`, validatorBug as Error);
          throw new Error(`Contract validator internal error for action "${id}": ${(validatorBug as Error).message}`);
        }
      }
      if (violations.length > 0) {
        const runId = nextRunId();
        this.emitTrace({ runId, actionId: id, input: params, output: undefined,
          status: 'contract', durationMs: 0, startedAt: Date.now(),
          error: `contract violation (${violations.length})`, attempt: 1 });
        throw new ContractViolationError(id, violations);
      }
    }
```

Add `ContractViolationError` to the import on line 2:

```ts
import { ValidationError, DuplicateRegistrationError, ActionTimeoutError, ActionExecutionError, ActionMemoryError, ContractViolationError } from './types.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/action-contracts.test.ts && npx vitest run tests/unit/action-engine.test.ts tests/unit/action-retry.test.ts`
Expected: PASS; retry + engine suites still green.

- [ ] **Step 5: Commit**

```bash
git add src/action-engine.ts tests/unit/action-contracts.test.ts
git commit -m "feat(contracts): enforce input once before retry loop, traced 'contract'"
```

---

## Task 6: introspect() serves schemas, states, supportedKeywords, schemaVersion

**Files:**
- Modify: `src/types.ts` (`IntrospectionAPI` ~444-452; `IntrospectionMetadata` ~433-438)
- Modify: `src/runtime-context.ts` (`getActionDefinition` ~313-328; `createIntrospectionAPI` ~299; add `getContractVocabulary`)
- Test: `tests/unit/introspection.test.ts`

**Interfaces:**
- Consumes: `SUPPORTED_KEYWORDS` (Task 1), `ActionMetadata` (Task 3).
- Produces:
  - `IntrospectionAPI` gains `getContractVocabulary(): { schemaVersion: string; supportedKeywords: string[] }`.
  - `getActionDefinition(id)` returns the extended `ActionMetadata` with `input`/`output` (same object the engine stored, frozen) and `inputState`/`outputState`.
  - `const CONTRACT_SCHEMA_VERSION = '1'` exported from `src/contract-validator.ts`.

- [ ] **Step 1: Write the failing test** (append to `tests/unit/introspection.test.ts`)

```ts
import { Runtime } from '../../src/runtime.js';
import type { ActionDefinition, RuntimeContext } from '../../src/types.js';
import { SUPPORTED_KEYWORDS } from '../../src/contract-validator.js';

// Local helper: build a runtime with a single action registered via a plugin,
// initialize it, and return its context. Self-contained (does not depend on
// other helpers in this file).
async function buildRuntimeWithAction(
  def: ActionDefinition<any, any>,
): Promise<{ ctx: RuntimeContext; rt: Runtime }> {
  const rt = new Runtime({ logger: { debug() {}, info() {}, warn() {}, error() {} } });
  rt.registerPlugin({
    name: 'h', version: '1.0.0',
    setup(ctx) { ctx.actions.registerAction(def); },
  });
  await rt.initialize();
  return { ctx: rt.getContext(), rt };
}

describe('introspect contracts', () => {
  it('serves the declared input schema, its state, and the vocabulary', async () => {
    const { ctx, rt } = await buildRuntimeWithAction({
      id: 'tasks:create',
      handler: (p: any) => p,
      input: { type: 'object', required: ['title'], properties: { title: { type: 'string' } } },
      output: null,
    });

    const md = ctx.introspect.getActionDefinition('tasks:create')!;
    expect(md.inputState).toBe('declared');
    expect(md.outputState).toBe('none');
    expect(md.input).toMatchObject({ type: 'object', required: ['title'] });

    const vocab = ctx.introspect.getContractVocabulary();
    expect(vocab.schemaVersion).toBe('1');
    expect(vocab.supportedKeywords).toEqual([...SUPPORTED_KEYWORDS]);
    await rt.shutdown();
  });

  it('marks an undeclared action correctly', async () => {
    const { ctx, rt } = await buildRuntimeWithAction({ id: 'x:u', handler: () => 1 });
    const md = ctx.introspect.getActionDefinition('x:u')!;
    expect(md.inputState).toBe('undeclared');
    expect(md.outputState).toBe('undeclared');
    await rt.shutdown();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/introspection.test.ts`
Expected: FAIL — `getContractVocabulary` undefined / `inputState` undefined.

- [ ] **Step 3: Write minimal implementation**

In `src/contract-validator.ts` add:

```ts
/** Version of the introspection contract shape (the map's own contract). */
export const CONTRACT_SCHEMA_VERSION = '1';
```

In `src/types.ts`, extend `IntrospectionAPI` (after `getMetadata()` line 451):

```ts
  getContractVocabulary(): { schemaVersion: string; supportedKeywords: string[] };
```

In `src/runtime-context.ts`, add imports:

```ts
import { SUPPORTED_KEYWORDS, CONTRACT_SCHEMA_VERSION } from './contract-validator.js';
```

Replace the `getActionDefinition` body (~313-328) to include schemas + states:

```ts
      getActionDefinition: (id: string) => {
        const action = this.actionEngine.getAction(id);
        if (!action) return null;
        const stateOf = (s: unknown): 'declared' | 'none' | 'undeclared' =>
          s === undefined ? 'undeclared' : s === null ? 'none' : 'declared';
        const metadata = {
          id: action.id,
          timeout: action.timeout,
          retry: action.retry,
          memoryLimitMb: action.memoryLimitMb,
          description: action.description,
          input: action.input,
          output: action.output,
          inputState: stateOf(action.input),
          outputState: stateOf(action.output),
        };
        return deepFreeze(metadata);
      },
```

Add `getContractVocabulary` inside the returned object in `createIntrospectionAPI` (e.g. after `getMetadata`):

```ts
      getContractVocabulary: () => ({
        schemaVersion: CONTRACT_SCHEMA_VERSION,
        supportedKeywords: [...SUPPORTED_KEYWORDS],
      }),
```

> Serve = enforce by identity: `metadata.input` is `action.input` — the SAME object the engine validates against (deepFreeze freezes the wrapper; the schema reference is shared). Do not clone it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/introspection.test.ts && npx tsc --noEmit`
Expected: PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/runtime-context.ts src/contract-validator.ts tests/unit/introspection.test.ts
git commit -m "feat(contracts): introspect serves schemas, states, vocabulary, version"
```

---

## Task 7: Swap honesty gate + index exports + version + capstone

**Files:**
- Modify: `src/plugin-registry.ts` (swap pre-flight — find where `runValidateConfig`/semver checks run during `buildBufferedContext`/swap; the registration path already calls `registerAction`, so out-of-vocabulary schemas are rejected during buffered setup — this task adds a test PROVING that and a focused guard if the buffered path bypasses `assertSchemaEnforceable`)
- Modify: `src/index.ts` (exports)
- Modify: `package.json` (version)
- Test: `tests/unit/action-contracts.test.ts` (capstone), `tests/unit/swap-path-regression.test.ts` (swap honesty)

**Interfaces:**
- Consumes: everything from Tasks 1-6.
- Produces: public exports of `ContractViolationError`, `validateValue`, `validateSchemaDocument`, `SUPPORTED_KEYWORDS`, `SUPPORTED_TYPES`, `CONTRACT_SCHEMA_VERSION`, and the contract types; version `0.7.0`.

- [ ] **Step 1: Write the failing tests**

Swap honesty (append to `tests/unit/swap-path-regression.test.ts`, mirror its existing `Runtime` setup):

```ts
describe('contract honesty across swap', () => {
  it('rejects swapping in a plugin whose action declares an unsupported schema', async () => {
    const rt = new Runtime({ logger: { debug() {}, info() {}, warn() {}, error() {} } });
    rt.registerPlugin({ name: 'p', version: '1.0.0',
      setup(ctx) { ctx.actions.registerAction({ id: 'p:a', handler: () => 1, input: { type: 'object' } }); } });
    await rt.initialize();
    const bad = { name: 'p', version: '2.0.0',
      setup(ctx: any) { ctx.actions.registerAction({ id: 'p:a', handler: () => 1, input: { type: 'string', pattern: 'x' } }); } };
    await expect(rt.swapPlugin(bad)).rejects.toBeTruthy();   // buffered setup throws ValidationError → swap aborts, v1 untouched
    expect(rt.getContext().actions.hasAction('p:a')).toBe(true);
    await rt.shutdown();
  });
});
```

Capstone (append to `tests/unit/action-contracts.test.ts`):

```ts
import { Runtime } from '../../src/runtime.js';

describe('CAPSTONE — agent works from the map alone (north star)', () => {
  it('orient via introspect, call correctly, recover from a batched error, hit author-time rejection — zero handler reads', async () => {
    const rt = new Runtime({ logger: logger() });
    rt.registerPlugin({
      name: 'tasks', version: '1.0.0',
      setup(ctx) {
        ctx.actions.registerAction({
          id: 'tasks:create', handler: (p: any) => ({ id: '1', title: p.title }),
          input: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, priority: { enum: [1, 2, 3] } } },
          output: { type: 'object', required: ['id', 'title'] },
        });
      },
    });
    await rt.initialize();
    const ctx = rt.getContext();

    // (a) ORIENT from the map — no source read
    const vocab = ctx.introspect.getContractVocabulary();
    const md = ctx.introspect.getActionDefinition('tasks:create')!;
    expect(md.inputState).toBe('declared');
    expect((md.input as any).required).toEqual(['title']);

    // (a) CALL correctly using only what the map told us
    expect(await ctx.actions.runAction('tasks:create', { title: 'buy milk', priority: 2 }))
      .toMatchObject({ id: '1', title: 'buy milk' });

    // (b) RECOVER — a wrong call yields a batched, usable fix
    try { await ctx.actions.runAction('tasks:create', { priority: 9 }); expect.fail('should throw'); }
    catch (e: any) {
      expect(e.code).toBe('CONTRACT_INPUT_VIOLATION');
      expect(e.violations.map((v: any) => v.path).sort()).toEqual(['/priority', '/title']);
    }

    // (c) AUTHOR-TIME rejection — out-of-vocabulary schema can't even register
    expect(() => ctx.actions.registerAction({ id: 'tasks:bad', handler: () => 1, input: { type: 'string', pattern: 'x' } as any }))
      .toThrow();

    // invariant: served schema IS the enforced object (identity)
    expect(vocab.supportedKeywords).not.toContain('pattern');
    await rt.shutdown();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/action-contracts.test.ts tests/unit/swap-path-regression.test.ts`
Expected: capstone may already mostly pass (Tasks 1-6 wired it); the import/export of `Runtime` works. If the swap honesty test fails because the buffered swap path does NOT route through `assertSchemaEnforceable`, proceed to Step 3 to add the guard. If both pass, Step 3 is exports/version only.

- [ ] **Step 3: Implement**

Export from `src/index.ts` (add near the other core exports, ~line 54-62):

```ts
export {
  validateValue, validateSchemaDocument,
  SUPPORTED_KEYWORDS, SUPPORTED_TYPES, SCHEMA_MAX_DEPTH, CONTRACT_SCHEMA_VERSION,
} from './contract-validator.js';
export type { JsonSchema, Violation, ValueCheckResult, SchemaCheckResult } from './contract-validator.js';
```

`ContractViolationError` is exported via `export * from './types.js'` if present; verify it appears in the built `dist/index.js` exports. If `types.js` is not re-exported with `*`, add:

```ts
export { ContractViolationError } from './types.js';
```

If the swap honesty test failed in Step 2: locate the buffered registration in `src/plugin-registry.ts` (`buildBufferedContext`'s `registerAction`) and ensure it calls the engine's `registerAction` (which now guards schemas) rather than writing the buffer directly without validation. The engine guard (Task 4) is the single enforcement point; the buffered path must not bypass it.

Bump version in `package.json`:

```json
  "version": "0.7.0",
```

- [ ] **Step 4: Run the FULL suite**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: entire suite PASS (existing + new), tsc clean, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/plugin-registry.ts src/index.ts package.json tests/unit/action-contracts.test.ts tests/unit/swap-path-regression.test.ts
git commit -m "feat(contracts): swap honesty gate, public exports, capstone, v0.7.0"
```

---

## Notes for the implementer

- **Run from the package root** `C:/code/playground/skeleton-crew-runtime`. Vitest config and tsconfig anchor there.
- **CRLF warnings on commit are benign** (the repo is LF-normalized on Windows).
- **The enforced-keyword list is the contract between Task 1 and Task 4** — never hardcode it twice; both consume `SUPPORTED_KEYWORDS`/`validateSchemaDocument`.
- **Serve = enforce by identity (Task 6)** — `introspect()` returns `action.input` itself, not a copy. The capstone's invariant depends on it.
- **Zero overhead when absent** — the `if (action.input !== undefined)` guard in `runAction` (Task 5) is the whole opt-in story; undeclared actions never touch the validator.
