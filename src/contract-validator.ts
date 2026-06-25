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
