import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_KEYWORDS, SUPPORTED_TYPES, SCHEMA_MAX_DEPTH,
  validateSchemaDocument, validateValue,
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
