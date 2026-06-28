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
