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
