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
