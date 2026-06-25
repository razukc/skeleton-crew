import { describe, it, expect } from 'vitest';
import { ActionEngine } from '../../src/action-engine.js';
import type { Logger, RuntimeContext, TraceEntry } from '../../src/types.js';
import { ValidationError, ContractViolationError } from '../../src/types.js';
import { Runtime } from '../../src/runtime.js';

function logger(): Logger { return { debug() {}, info() {}, warn() {}, error() {} }; }

function ctx(): RuntimeContext { return {} as unknown as RuntimeContext; }

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
