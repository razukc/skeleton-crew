# Migration Support Implementation Guide

## Overview

This steering document provides guidance for implementing migration support features in Skeleton Crew Runtime. These features enable legacy applications to incrementally adopt SCR while maintaining SCR's core philosophy.

## Core Principles

### 1. Minimal Core Changes

- Add ONLY what's necessary to core runtime
- Keep new code under 1KB
- No new subsystems
- No new core concepts

### 2. Backward Compatibility

- Zero breaking changes
- All existing tests must pass
- Existing code works without modification
- New features are opt-in

### 3. Philosophy Preservation

- Maintain minimal core
- Stay UI-agnostic
- Remain environment-neutral
- Keep plugin-driven architecture
- No framework assumptions

## Implementation Guidelines

### Host Context Injection

**Location:** `src/types.ts`, `src/runtime.ts`, `src/runtime-context.ts`

**Key Points:**
- Add optional `hostContext` to RuntimeOptions
- Store in Runtime, pass to RuntimeContext
- Expose as readonly via `context.host`
- Use `Object.freeze({ ...context })` for immutability
- Default to empty object if not provided

**Validation:**
```typescript
// Warn about large objects (> 1MB)
// Warn about function values
// Log warnings, don't throw errors
// Don't modify the context
```

**Best Practices to Document:**
- DO inject: database connections, HTTP clients, loggers, config
- DON'T inject: request data, UI state, user sessions, large objects

### Introspection API

**Location:** `src/types.ts`, `src/runtime-context.ts`

**Key Points:**
- Return metadata only, NOT implementations
- Deep freeze all returned objects
- Return null for missing resources
- Use custom deepFreeze function (not structuredClone)

**Deep Freeze Implementation:**
```typescript
function deepFreeze<T>(obj: T): Readonly<T> {
  Object.freeze(obj);
  
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const value = (obj as any)[prop];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  
  return obj as Readonly<T>;
}
```

**Metadata Interfaces:**
```typescript
interface ActionMetadata {
  id: string;
  timeout?: number;
  // NO handler function
}

interface PluginMetadata {
  name: string;
  version: string;
  // NO setup/dispose functions
}

interface IntrospectionMetadata {
  runtimeVersion: string;
  totalActions: number;
  totalPlugins: number;
  totalScreens: number;
}
```

### Testing Requirements

**Unit Tests:**
- Test host context injection
- Test host context immutability
- Test validation warnings
- Test introspection methods
- Test deep freeze utility
- Test backward compatibility

**Integration Tests:**
- Test host context in plugins
- Test introspection with real data
- Test with existing examples

**Property Tests:**
- Test deep freeze with random objects
- Test host context immutability with random mutations

**Follow:** `docs/migration/TEST_STANDARDS.md`

### Documentation Requirements

**API Documentation:**
- Document RuntimeOptions.hostContext
- Document RuntimeContext.host
- Document all introspection methods
- Include TypeScript types
- Provide code examples

**Migration Guide:**
- Add "Level 0: Zero Migration" section
- Document host context best practices
- Show real-world examples
- Explain what NOT to do

**Update Files:**
- `README.md` - Add migration section
- `docs/api/API.md` - Document new APIs
- `docs/guides/migration-guide.md` - Complete guide

## Common Pitfalls to Avoid

### ❌ DON'T: Use structuredClone for Deep Freeze

**Why:** Cannot clone functions, breaks action/plugin definitions

**Instead:** Use custom recursive deepFreeze

### ❌ DON'T: Expose Handler Functions

**Why:** Violates metadata-only principle, security concern

**Instead:** Return metadata without implementations

### ❌ DON'T: Allow Host Context Mutation

**Why:** Breaks immutability guarantee, causes confusion

**Instead:** Return frozen copy via `Object.freeze({ ...context })`

### ❌ DON'T: Add updateHostContext() Method

**Why:** Violates immutability, adds state management complexity

**Instead:** Document that context is immutable after init

### ❌ DON'T: Add Filtered Introspection Yet

**Why:** YAGNI, adds complexity without clear need

**Instead:** Start simple, add later if requested

### ❌ DON'T: Add Runtime Type Checking

**Why:** TypeScript types are compile-time only

**Instead:** Keep types for TypeScript users, no runtime overhead

## Code Review Checklist

### Before Merging

- [ ] Zero breaking changes confirmed
- [ ] All existing tests pass
- [ ] New tests added with 90%+ coverage
- [ ] Documentation updated
- [ ] TypeScript types exported
- [ ] Philosophy alignment verified
- [ ] Performance benchmarks pass
- [ ] Memory leak tests pass
- [ ] Code follows existing patterns
- [ ] No new dependencies added

### Philosophy Check

- [ ] Core remains minimal (< 1KB increase)
- [ ] No new subsystems added
- [ ] No UI assumptions made
- [ ] No environment assumptions made
- [ ] Plugin-driven architecture maintained
- [ ] Explicit over implicit maintained

## File Modification Guide

### Files to Modify

1. **src/types.ts**
   - Add `hostContext` to RuntimeOptions
   - Add `host` to RuntimeContext
   - Add IntrospectionAPI interface
   - Add metadata interfaces

2. **src/runtime.ts**
   - Store hostContext in constructor
   - Add validateHostContext method
   - Pass hostContext to RuntimeContext

3. **src/runtime-context.ts**
   - Accept hostContext in constructor
   - Implement `host` getter
   - Implement `introspect` getter
   - Add deepFreeze utility

4. **tests/unit/host-context.test.ts** (NEW)
   - Test injection
   - Test immutability
   - Test validation
   - Test defaults

5. **tests/unit/introspection.test.ts** (NEW)
   - Test all introspection methods
   - Test metadata format
   - Test deep freeze
   - Test null returns

6. **docs/api/API.md**
   - Document new APIs
   - Add examples
   - Update RuntimeOptions
   - Update RuntimeContext

7. **docs/guides/migration-guide.md**
   - Add Level 0 section
   - Document best practices
   - Add real examples

### Files NOT to Modify

- `src/plugin-registry.ts` - No changes needed
- `src/action-engine.ts` - No changes needed
- `src/event-bus.ts` - No changes needed
- `src/screen-registry.ts` - No changes needed
- `src/ui-bridge.ts` - No changes needed

## Example Implementation Snippets

### Host Context Injection

```typescript
// src/runtime.ts
export class Runtime {
  private hostContext: Record<string, unknown>;
  
  constructor(options?: RuntimeOptions) {
    this.logger = options?.logger ?? new ConsoleLogger();
    this.hostContext = options?.hostContext ?? {};
    this.validateHostContext(this.hostContext);
  }
  
  private validateHostContext(context: Record<string, unknown>): void {
    Object.entries(context).forEach(([key, value]) => {
      const size = JSON.stringify(value).length;
      if (size > 1024 * 1024) {
        this.logger.warn(`Host context key "${key}" is large (${size} bytes)`);
      }
      if (typeof value === 'function') {
        this.logger.warn(`Host context key "${key}" is a function`);
      }
    });
  }
}
```

### Introspection API

```typescript
// src/runtime-context.ts
export class RuntimeContextImpl implements RuntimeContext {
  get introspect(): IntrospectionAPI {
    return {
      listActions: () => 
        this.actionEngine.getAllActions().map(a => a.id),
      
      getActionDefinition: (id) => {
        const action = this.actionEngine.getAction(id);
        if (!action) return null;
        return deepFreeze({ id: action.id, timeout: action.timeout });
      },
      
      // ... other methods
    };
  }
}
```

## Success Metrics

### Technical
- Core size: < 5KB (target: +0.5KB)
- Test coverage: > 90%
- Performance: < 1ms overhead
- Memory: < 100KB increase

### Quality
- Zero breaking changes
- All tests pass
- Documentation complete
- Philosophy preserved (95%)

## References

- **Spec:** `.kiro/specs/migration-support/requirements.md`
- **Plan:** `docs/migration/FINAL_PLAN.md`
- **Tests:** `docs/migration/TEST_STANDARDS.md`
- **Roadmap:** `docs/migration/IMPLEMENTATION_ROADMAP.md`

---

**Document Version:** 1.0
**Status:** ACTIVE
**Phase:** Phase 1 - Core Stabilization

