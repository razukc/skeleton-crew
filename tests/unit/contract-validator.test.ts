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
