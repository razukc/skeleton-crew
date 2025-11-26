---
inclusion: always
---

# Project Structure & Architecture

## File Organization Rules

### Source Code (`src/`)

**Core Files (DO NOT add new files here without strong justification):**
- `types.ts` - ALL type definitions, interfaces, and error classes
- `index.ts` - Public API exports ONLY (no implementation)
- `runtime.ts` - Runtime orchestrator (initialization, lifecycle, coordination)
- `runtime-context.ts` - Unified API facade for all subsystems

**Subsystem Files (one file per subsystem):**
- `plugin-registry.ts` - Plugin registration and lifecycle management
- `screen-registry.ts` - Screen storage and retrieval
- `action-engine.ts` - Action registration and execution
- `event-bus.ts` - Event pub/sub system
- `ui-bridge.ts` - Optional UI provider integration

**File Modification Guidelines:**
- Adding new subsystems requires architectural review
- Keep each file focused on single subsystem responsibility
- All public APIs must be exported through `src/index.ts`
- Private utilities stay in their respective subsystem files

### Test Organization (`tests/`)

**Structure:**
```
tests/
├── unit/                    # Test individual components in isolation
│   ├── <subsystem>.test.ts  # One test file per src file
│   └── deep-freeze.test.ts  # Utility function tests
├── integration/             # Test cross-subsystem interactions
│   ├── cross-subsystem.test.ts
│   ├── backward-compatibility.test.ts
│   └── host-context-plugins.test.ts
└── property/                # Property-based tests with fast-check
    ├── <property-name>.property.test.ts
    └── ...
```

**Naming Conventions:**
- Unit: `<component>.test.ts` (matches source file name)
- Integration: `<feature-description>.test.ts`
- Property: `<property-name>.property.test.ts`

**Test File Requirements:**
- Each `src/*.ts` file MUST have corresponding `tests/unit/*.test.ts`
- Integration tests for cross-subsystem features
- Property tests for invariants and correctness properties

## Architecture Patterns

### Subsystem Pattern (CRITICAL)

Every subsystem follows this exact structure:

**Implementation (`src/<subsystem>.ts`):**
```typescript
// 1. Imports with .js extensions
import { Type } from './types.js';

// 2. Private implementation class
class SubsystemImpl {
  // Internal state
  // Private methods
}

// 3. Public factory or class
export class Subsystem {
  // Public API only
  // Delegates to implementation
}
```

**Test (`tests/unit/<subsystem>.test.ts`):**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Subsystem } from '../../src/<subsystem>.js';

describe('Subsystem', () => {
  // Test public API
  // Test error cases
  // Test edge cases
});
```

**Export (`src/index.ts`):**
```typescript
export { Subsystem } from './subsystem.js';
export type { SubsystemInterface } from './types.js';
```

### Core Subsystems (Required - DO NOT remove)

1. **PluginRegistry** - Plugin registration, lifecycle (setup/dispose), validation
2. **ScreenRegistry** - Screen storage, retrieval by ID, validation
3. **ActionEngine** - Action registration, execution with timeout, error handling
4. **EventBus** - Event subscription, emission (sync/async), auto-cleanup

### Optional Subsystems

5. **UIBridge** - UI provider integration (can be omitted if no UI needed)

### Orchestration Layer

**Runtime (`runtime.ts`):**
- Creates all subsystems in strict order
- Manages initialization sequence
- Coordinates shutdown
- Provides RuntimeContext to external code

**RuntimeContext (`runtime-context.ts`):**
- Unified API facade for plugins
- Exposes: `plugins`, `screens`, `actions`, `events`, `ui`, `host`, `introspect`
- Immutable after creation
- Passed to plugin setup/dispose callbacks

### Initialization Sequence (STRICT ORDER)

```typescript
// 1. Instantiate subsystems
const pluginRegistry = new PluginRegistry();
const screenRegistry = new ScreenRegistry();
const actionEngine = new ActionEngine();
const eventBus = new EventBus();
const uiBridge = new UIBridge();

// 2. Create RuntimeContext (provides unified access)
const context = new RuntimeContextImpl(
  pluginRegistry, screenRegistry, actionEngine, 
  eventBus, uiBridge, hostContext
);

// 3. Execute plugin setup callbacks
// Plugins can now register screens/actions/events via context
for (const plugin of plugins) {
  plugin.setup(context);
}
```

**Why this order matters:**
- RuntimeContext needs all subsystems instantiated
- Plugins need RuntimeContext to register resources
- Changing order breaks plugin initialization

### Type System Organization

**All types in `src/types.ts` organized by category:**

```typescript
// 1. Core interfaces (PluginDefinition, ScreenDefinition, etc.)
// 2. Subsystem interfaces (PluginRegistry, ActionEngine, etc.)
// 3. RuntimeContext interface
// 4. RuntimeOptions interface
// 5. Error classes (ValidationError, DuplicateRegistrationError, etc.)
// 6. Utility types (EventHandler, ActionHandler, etc.)
```

**Type Definition Rules:**
- NO implementation in types.ts (types and interfaces only)
- Export ALL public types
- Use interface for extensibility, type for unions/intersections
- Document complex types with JSDoc

## Code Conventions

### Import/Export Rules

**ALWAYS use .js extensions (ESM requirement):**
```typescript
// ✅ Correct
import { Runtime } from './runtime.js';
import { PluginDefinition } from './types.js';

// ❌ Wrong - will break at runtime
import { Runtime } from './runtime';
```

**Export through index.ts:**
```typescript
// src/index.ts - public API surface
export { Runtime } from './runtime.js';
export { RuntimeContext } from './runtime-context.js';
export type { PluginDefinition, ScreenDefinition } from './types.js';
```

### Method Signature Rules

**Public methods MUST have explicit return types:**
```typescript
// ✅ Correct
public getScreen(id: string): ScreenDefinition | undefined {
  return this.screens.get(id);
}

// ❌ Wrong - implicit return type
public getScreen(id: string) {
  return this.screens.get(id);
}
```

**Include JSDoc with requirement references:**
```typescript
/**
 * Registers a screen definition.
 * @param screen - Screen definition to register
 * @throws {ValidationError} If screen is invalid
 * @throws {DuplicateRegistrationError} If screen ID already exists
 * @requirement REQ-SCREEN-001 - Screen registration
 */
public registerScreen(screen: ScreenDefinition): void {
  // Implementation
}
```

### Error Handling Rules

**Use custom error classes from types.ts:**
```typescript
// ✅ Correct
throw new ValidationError('Screen', 'id', 'ID is required');
throw new DuplicateRegistrationError('Screen', screenId);

// ❌ Wrong - generic errors lose context
throw new Error('Invalid screen');
```

**Validate before mutation:**
```typescript
// ✅ Correct - validate first
if (!screen.id) {
  throw new ValidationError('Screen', 'id', 'ID is required');
}
this.screens.set(screen.id, screen);

// ❌ Wrong - mutate then validate
this.screens.set(screen.id, screen);
if (!screen.id) throw new Error('Invalid');
```

### Lifecycle Method Rules

**Make idempotent where possible:**
```typescript
// ✅ Correct - safe to call multiple times
public dispose(): void {
  if (this.disposed) return;
  this.disposed = true;
  this.cleanup();
}

// ❌ Wrong - breaks on second call
public dispose(): void {
  this.cleanup(); // May throw if already disposed
}
```

## Modification Guidelines

### When Adding Features

**Before adding to core:**
1. Can this be a plugin instead? (Prefer plugins)
2. Is this needed by 80%+ of use cases? (Avoid niche features)
3. Does this add < 1KB to core? (Keep core minimal)
4. Is this environment-neutral? (No browser/Node.js assumptions)

**If adding to core:**
1. Add types to `src/types.ts`
2. Add implementation to appropriate subsystem file
3. Export through `src/index.ts`
4. Add unit tests to `tests/unit/`
5. Add integration tests if cross-subsystem
6. Update documentation

### When Modifying Subsystems

**Files to modify together:**
- `src/types.ts` - Update interfaces
- `src/<subsystem>.ts` - Update implementation
- `src/runtime-context.ts` - Update facade if API changes
- `tests/unit/<subsystem>.test.ts` - Update tests
- `src/index.ts` - Update exports if needed

**DO NOT:**
- Change initialization order without architectural review
- Add dependencies between subsystems (use events instead)
- Break backward compatibility without major version bump
- Add UI framework dependencies to core

### When Adding Tests

**Required tests for new features:**
1. Unit tests for public API
2. Unit tests for error cases
3. Integration tests if cross-subsystem
4. Property tests for invariants
5. Backward compatibility tests if changing APIs

**Test file location:**
- Unit: `tests/unit/<feature>.test.ts`
- Integration: `tests/integration/<feature>.test.ts`
- Property: `tests/property/<property>.property.test.ts`

## Common Patterns

### Subsystem Registration Pattern

```typescript
// All registries follow this pattern
public register<Resource>(resource: ResourceDefinition): void {
  // 1. Validate
  this.validate(resource);
  
  // 2. Check duplicates
  if (this.has(resource.id)) {
    throw new DuplicateRegistrationError('Resource', resource.id);
  }
  
  // 3. Store
  this.resources.set(resource.id, resource);
  
  // 4. Emit event (optional)
  this.events.emit('resource:registered', { id: resource.id });
}
```

### Subsystem Retrieval Pattern

```typescript
// All registries follow this pattern
public get<Resource>(id: string): Resource | undefined {
  return this.resources.get(id);
}

public getAll<Resource>(): Resource[] {
  return Array.from(this.resources.values());
}
```

### Plugin Setup Pattern

```typescript
// All plugins follow this pattern
export const myPlugin: PluginDefinition = {
  name: 'my-plugin',
  version: '1.0.0',
  
  setup(context: RuntimeContext) {
    // Register resources via context
    context.screens.registerScreen({ ... });
    context.actions.registerAction({ ... });
    context.events.on('event', handler);
  },
  
  dispose(context: RuntimeContext) {
    // Cleanup (events auto-unsubscribe)
  }
};
```

## Architecture Constraints

**MUST maintain:**
- UI-agnostic core (no React, Vue, DOM dependencies)
- Environment-neutral (works in browser, Node.js, Deno)
- Minimal core (< 5KB gzipped)
- Plugin-driven extensibility
- Zero breaking changes in minor versions

**MUST NOT add:**
- Built-in routing or navigation
- Built-in state management
- UI component libraries
- Framework-specific code
- Environment-specific APIs (except via plugins)
