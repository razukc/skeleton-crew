# Skeleton Crew Runtime - Comprehensive Upgrade Plan

## Executive Summary

This document provides a comprehensive analysis of proposed upgrades to Skeleton Crew Runtime (SCR) to support legacy application integration, along with an assessment of philosophical alignment and implementation recommendations.

**Current State:** SCR is a minimal, UI-agnostic plugin runtime with 4 core subsystems (PluginRegistry, ScreenRegistry, ActionEngine, EventBus) and 1 optional subsystem (UIBridge).

**Proposed State:** Enhanced SCR with adapters, context injection, migration tooling, and legacy app integration capabilities.

**Verdict:** ⚠️ **SELECTIVE ADOPTION RECOMMENDED** - Some proposals align with SCR philosophy, others risk scope creep and complexity.

---

## Part 1: Philosophy Alignment Analysis

### SCR's Core Philosophy (from codebase analysis)

1. **Minimal Core** - Only essential primitives (screens, actions, plugins, events)
2. **UI-Agnostic** - No built-in UI, no framework dependencies
3. **Environment-Neutral** - Works in browser, Node.js, any JavaScript runtime
4. **Plugin-Driven** - All functionality extends through plugins
5. **Zero Assumptions** - No DOM/browser requirements, no routing, no state management
6. **Explicit Over Implicit** - Clear initialization sequence, explicit registration

### Proposed Changes - Alignment Assessment

| Proposal | Alignment | Risk Level | Recommendation |
|----------|-----------|------------|----------------|
| Context Injection | ✅ HIGH | LOW | **ADOPT** - Natural extension |
| Adapter System | ⚠️ MEDIUM | MEDIUM | **ADOPT WITH LIMITS** - Keep minimal |
| Action Wrappers | ✅ HIGH | LOW | **ADOPT** - Utility layer |
| Module System | ❌ LOW | HIGH | **REJECT** - Out of scope |
| CLI Integration | ⚠️ MEDIUM | MEDIUM | **DEFER** - Plugin responsibility |
| Browser Adapter | ⚠️ MEDIUM | MEDIUM | **DEFER** - Plugin responsibility |
| Sandboxing | ❌ LOW | HIGH | **REJECT** - Overengineered |
| Plugin Installer | ❌ LOW | HIGH | **REJECT** - Out of scope |
| Introspection API | ✅ HIGH | LOW | **ADOPT** - Natural extension |
| Migration Wizard | ❌ LOW | MEDIUM | **REJECT** - External tool |


---

## Part 2: Detailed Analysis of Each Proposal

### ✅ ADOPT: Context Injection

**What it is:** Allow host applications to inject services/dependencies into RuntimeContext.

**Why it aligns:**
- SCR already has RuntimeContext as a facade
- Natural extension point for host integration
- Maintains encapsulation and testability
- No breaking changes to existing API

**Implementation:**
```typescript
// Current: RuntimeContext is created internally
// Proposed: Accept optional host context

interface RuntimeOptions {
  logger?: Logger;
  hostContext?: Record<string, unknown>; // NEW
}

class Runtime {
  constructor(options?: RuntimeOptions) {
    this.hostContext = options?.hostContext ?? {};
  }
}

// RuntimeContext exposes it
interface RuntimeContext {
  // ... existing APIs
  host: Readonly<Record<string, unknown>>; // NEW
}
```

**Benefits:**
- Legacy apps can inject DB, cache, HTTP clients
- Plugins access via `context.host.db`
- Zero breaking changes
- Maintains SCR's minimal philosophy

**Risks:** LOW - Additive change only

---

### ✅ ADOPT: Action Wrappers (Utility Layer)

**What it is:** Helper functions to wrap legacy code as SCR actions.

**Why it aligns:**
- Pure utility functions, not core runtime changes
- Can live in separate package (`@skeleton-crew/migration-utils`)
- Helps adoption without polluting core
- Similar to how React has `react-dom` separate from `react`

**Implementation:**
```typescript
// @skeleton-crew/migration-utils package

export function wrapLegacyFunction<P, R>(
  fn: (params: P) => R | Promise<R>
): ActionDefinition<P, R> {
  return {
    id: fn.name || 'wrapped-function',
    handler: async (params, context) => {
      return await fn(params);
    }
  };
}

export function createBridgePlugin(
  legacyApp: any,
  mappings: Record<string, string>
): PluginDefinition {
  return {
    name: 'legacy-bridge',
    version: '1.0.0',
    setup(context) {
      Object.entries(mappings).forEach(([actionId, methodName]) => {
        context.actions.registerAction({
          id: actionId,
          handler: (params) => legacyApp[methodName](params)
        });
      });
    }
  };
}
```

**Benefits:**
- Separate package = no core bloat
- Helps migration without changing SCR philosophy
- Can evolve independently

**Risks:** LOW - External utility package


---

### ✅ ADOPT: Introspection API

**What it is:** Methods to query registered actions, plugins, screens at runtime.

**Why it aligns:**
- Already partially exists (`getAllActions()`, `getAllPlugins()`, etc.)
- Makes existing internal methods public
- Enables tooling and debugging
- No architectural changes needed

**Implementation:**
```typescript
// Already exists internally, just expose via RuntimeContext

interface RuntimeContext {
  // ... existing APIs
  
  // NEW: Introspection methods
  introspect: {
    listActions(): string[];
    listPlugins(): string[];
    listScreens(): string[];
    describeAction(id: string): ActionDefinition | null;
    describePlugin(name: string): PluginDefinition | null;
    describeScreen(id: string): ScreenDefinition | null;
  };
}
```

**Benefits:**
- Enables dev tools, admin dashboards
- Helps migration planning
- Already implemented internally
- Zero breaking changes

**Risks:** LOW - Just exposing existing functionality

---

### ⚠️ ADOPT WITH LIMITS: Adapter System

**What it is:** Pluggable adapters for different environments (CLI, Browser, Server).

**Why it's risky:**
- Could violate "environment-neutral" principle
- Risk of becoming framework-specific
- Adds complexity to core

**Why it could work:**
- IF adapters are just plugins with a specific interface
- IF they don't require core runtime changes
- IF they're optional and external

**Recommended Approach:**
```typescript
// DON'T add "Adapter" as a new core concept
// DO use existing plugin system

// Example: CLI adapter is just a plugin
export const cliAdapterPlugin: PluginDefinition = {
  name: 'cli-adapter',
  version: '1.0.0',
  setup(context) {
    // Parse process.argv
    // Map to actions
    // Register helper actions
  }
};

// Example: Browser adapter is just a plugin
export const browserAdapterPlugin: PluginDefinition = {
  name: 'browser-adapter',
  version: '1.0.0',
  setup(context) {
    // Setup message passing
    // Register serialization helpers
  }
};
```

**Benefits:**
- No new core concepts
- Uses existing plugin system
- Can be external packages
- Maintains SCR philosophy

**Risks:** MEDIUM - Could grow too complex

**Recommendation:** Create adapter plugins in separate packages, NOT in core.


---

### ❌ REJECT: Module System

**What it is:** Built-in module registry for shared business logic.

**Why it violates SCR philosophy:**
- SCR is NOT a module bundler or loader
- JavaScript already has modules (ESM/CommonJS)
- Adds unnecessary abstraction layer
- Out of scope for a runtime

**The problem it tries to solve:**
"Apps duplicate logic across environments"

**Better solution:**
```typescript
// Just use regular JavaScript modules!

// shared/validation.ts
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Plugin uses it
import { validateEmail } from '../shared/validation.js';

export const userPlugin: PluginDefinition = {
  name: 'users',
  version: '1.0.0',
  setup(context) {
    context.actions.registerAction({
      id: 'user:create',
      handler: async (params) => {
        if (!validateEmail(params.email)) {
          throw new Error('Invalid email');
        }
        // ...
      }
    });
  }
};
```

**Why this is better:**
- Uses standard JavaScript
- No new concepts to learn
- Works with existing tooling
- Maintains SCR's minimal philosophy

**Verdict:** REJECT - Use standard JavaScript modules

---

### ❌ REJECT: Sandboxing & Permission Model

**What it is:** Run untrusted plugins in isolated processes with permission checks.

**Why it violates SCR philosophy:**
- Massive scope increase
- Security is host application's responsibility
- Adds complexity without clear benefit
- SCR is for internal tools, not public plugin marketplaces

**Current reality:**
- SCR is for building internal tools
- Plugins are written by the same team
- If you don't trust a plugin, don't load it
- Host app controls what's in RuntimeContext

**If you really need sandboxing:**
- Use Node.js worker threads (host app's responsibility)
- Use iframe sandboxing (host app's responsibility)
- Use separate processes (host app's responsibility)

**Verdict:** REJECT - Out of scope, host app's responsibility

---

### ❌ REJECT: Plugin Installer & Registry

**What it is:** Built-in plugin installation, versioning, and registry management.

**Why it violates SCR philosophy:**
- SCR is a runtime, not a package manager
- npm/yarn/pnpm already exist
- Adds massive complexity
- Out of scope

**Better approach:**
```bash
# Just use npm!
npm install @mycompany/scr-plugin-analytics
npm install @mycompany/scr-plugin-storage
```

```typescript
// Import like any other package
import { analyticsPlugin } from '@mycompany/scr-plugin-analytics';
import { storagePlugin } from '@mycompany/scr-plugin-storage';

runtime.registerPlugin(analyticsPlugin);
runtime.registerPlugin(storagePlugin);
```

**Verdict:** REJECT - Use existing package managers

---

### ❌ REJECT: Migration Wizard CLI

**What it is:** CLI tool to scan codebases and suggest migrations.

**Why it should be separate:**
- Not part of runtime functionality
- Should be external tool
- Can be built by community
- Doesn't need to be in core

**Better approach:**
- Create separate package: `@skeleton-crew/migration-cli`
- Or community tool: `scr-migrate`
- Keep runtime focused on runtime concerns

**Verdict:** REJECT from core - Build as separate tool if needed


---

## Part 3: Recommended Implementation Plan

### Phase 1: Core Enhancements (v0.3.0) - 2 weeks

**Goal:** Add minimal, high-value features that maintain SCR philosophy.

#### 1.1 Context Injection
```typescript
// src/types.ts - Add to RuntimeOptions
interface RuntimeOptions {
  logger?: Logger;
  hostContext?: Record<string, unknown>; // NEW
}

// src/runtime.ts - Store and pass to RuntimeContext
constructor(options?: RuntimeOptions) {
  this.logger = options?.logger ?? new ConsoleLogger();
  this.hostContext = options?.hostContext ?? {}; // NEW
}

// src/runtime-context.ts - Expose via RuntimeContext
interface RuntimeContext {
  // ... existing
  readonly host: Readonly<Record<string, unknown>>; // NEW
}
```

**Tests:**
- Unit tests for context injection
- Integration tests with mock host services
- Verify immutability of host context

**Documentation:**
- Update API.md with host context examples
- Add migration guide section on context injection

---

#### 1.2 Introspection API
```typescript
// src/runtime-context.ts - Add introspection methods
interface RuntimeContext {
  // ... existing
  
  introspect: {
    listActions(): string[];
    listPlugins(): string[];
    listScreens(): string[];
    getActionDefinition(id: string): ActionDefinition | null;
    getPluginDefinition(name: string): PluginDefinition | null;
    getScreenDefinition(id: string): ScreenDefinition | null;
  };
}
```

**Implementation:**
- Expose existing internal methods
- Return copies to prevent mutation
- Add to RuntimeContextImpl

**Tests:**
- Verify all introspection methods work
- Verify returned data is immutable
- Test with empty registries

**Documentation:**
- Add introspection examples to API.md
- Show use cases (debugging, admin dashboards)

---

#### 1.3 Enhanced Event Metadata
```typescript
// src/event-bus.ts - Add metadata to events
interface EventMetadata {
  timestamp: number;
  source?: string; // plugin name or 'runtime'
  correlationId?: string;
}

// Emit with metadata
emit(event: string, data?: unknown, metadata?: EventMetadata): void;
```

**Benefits:**
- Better debugging
- Event tracing
- Audit logs

**Tests:**
- Verify metadata is passed correctly
- Test backward compatibility (metadata optional)

---

### Phase 2: Migration Utilities Package (v0.3.1) - 1 week

**Goal:** Create separate package for migration helpers.

#### 2.1 Create @skeleton-crew/migration-utils

**Package structure:**
```
packages/migration-utils/
├── src/
│   ├── wrappers.ts          # Legacy function wrappers
│   ├── bridge-plugin.ts     # Event bridge helpers
│   ├── feature-flags.ts     # Feature flag utilities
│   └── index.ts
├── tests/
├── package.json
└── README.md
```

**Key exports:**
```typescript
// wrappers.ts
export function wrapLegacyFunction<P, R>(
  fn: (params: P) => R | Promise<R>,
  options?: { id?: string; timeout?: number }
): ActionDefinition<P, R>;

export function wrapLegacyClass(
  instance: any,
  methods: string[]
): PluginDefinition;

// bridge-plugin.ts
export function createEventBridge(
  legacyEmitter: EventEmitter,
  runtime: Runtime,
  mappings: Record<string, string>
): void;

// feature-flags.ts
export function createFeatureFlagPlugin(
  config: Record<string, 'scr' | 'legacy'>
): PluginDefinition;
```

**Documentation:**
- Complete migration guide with examples
- Real-world migration scenarios
- Best practices and anti-patterns


---

### Phase 3: Adapter Plugins (v0.4.0) - 3 weeks

**Goal:** Create optional adapter plugins as separate packages.

#### 3.1 @skeleton-crew/cli-adapter

**Purpose:** Help CLI apps integrate SCR.

**Implementation:**
```typescript
// Adapter is just a plugin!
export function createCLIAdapter(options: CLIAdapterOptions): PluginDefinition {
  return {
    name: 'cli-adapter',
    version: '1.0.0',
    setup(context) {
      // Parse process.argv
      const { actionId, params } = parseArgs(process.argv.slice(2));
      
      // Register CLI helper actions
      context.actions.registerAction({
        id: 'cli:run',
        handler: async () => {
          const result = await context.actions.runAction(actionId, params);
          console.log(JSON.stringify(result, null, 2));
          return result;
        }
      });
      
      // Setup event logging
      context.events.on('*', (data) => {
        if (options.verbose) {
          console.log(`[EVENT] ${data}`);
        }
      });
    }
  };
}
```

**Key features:**
- Argument parsing
- Pretty output formatting
- Progress indicators
- Error formatting

---

#### 3.2 @skeleton-crew/browser-adapter

**Purpose:** Help browser apps integrate SCR.

**Implementation:**
```typescript
export function createBrowserAdapter(options: BrowserAdapterOptions): PluginDefinition {
  return {
    name: 'browser-adapter',
    version: '1.0.0',
    setup(context) {
      // Setup message passing
      window.addEventListener('message', async (event) => {
        if (event.data.type === 'scr:action') {
          const result = await context.actions.runAction(
            event.data.actionId,
            event.data.params
          );
          window.parent.postMessage({
            type: 'scr:result',
            id: event.data.id,
            result
          }, '*');
        }
      });
      
      // Register browser-specific actions
      context.actions.registerAction({
        id: 'browser:storage:get',
        handler: async ({ key }) => {
          return localStorage.getItem(key);
        }
      });
    }
  };
}
```

**Key features:**
- Message passing (postMessage, WebSocket)
- Storage helpers (localStorage, IndexedDB)
- Serialization utilities

---

### Phase 4: Documentation & Examples (v0.4.1) - 2 weeks

**Goal:** Comprehensive migration documentation.

#### 4.1 Update Existing Documentation

**Files to update:**
- `README.md` - Add migration section
- `docs/guides/migration-guide.md` - Expand with real examples
- `docs/api/API.md` - Document new APIs
- `.kiro/steering/migration-patterns.md` - Align with implementation

#### 4.2 Create New Examples

**Example 1: Express Backend Migration**
```
examples/migration/express-backend/
├── before/                    # Monolithic Express app
├── after/                     # SCR-integrated version
└── README.md                  # Step-by-step guide
```

**Example 2: CLI Tool Migration**
```
examples/migration/cli-tool/
├── before/                    # Traditional CLI
├── after/                     # SCR-powered CLI
└── README.md
```

**Example 3: Browser Extension Migration**
```
examples/migration/browser-extension/
├── before/                    # Traditional extension
├── after/                     # SCR-powered extension
└── README.md
```

#### 4.3 Create Migration Cookbook

**Content:**
- 20+ real-world migration recipes
- Common patterns and solutions
- Anti-patterns to avoid
- Performance considerations
- Testing strategies


---

## Part 4: What NOT to Build

### ❌ Don't Build These (Scope Creep)

1. **Plugin Marketplace/Registry**
   - Use npm/GitHub
   - Out of scope for runtime

2. **Built-in Sandboxing**
   - Host app's responsibility
   - Use Node workers if needed

3. **Module Bundler/Loader**
   - Use standard JavaScript modules
   - Use existing build tools

4. **CLI Framework**
   - Adapter plugin is enough
   - Don't compete with Commander.js, etc.

5. **State Management**
   - Out of scope
   - Plugins can use any state library

6. **Routing System**
   - Out of scope
   - UI plugins handle routing

7. **Data Fetching Layer**
   - Out of scope
   - Use host context injection

8. **Authentication/Authorization**
   - Host app's responsibility
   - Pass auth via host context

9. **Deployment Tools**
   - Out of scope
   - Use existing tools

10. **Monitoring/Observability Platform**
    - Provide events, not platform
    - Integrate with existing tools

---

## Part 5: Philosophical Impact Assessment

### ✅ Maintains SCR Philosophy

**These changes AMPLIFY the core philosophy:**

1. **Context Injection**
   - Makes SCR MORE embeddable
   - Maintains environment-neutrality
   - Enhances plugin-driven architecture

2. **Introspection API**
   - Enables better tooling
   - Maintains minimal core
   - No new concepts

3. **Migration Utilities (separate package)**
   - Helps adoption
   - Doesn't pollute core
   - Optional and external

4. **Adapter Plugins (separate packages)**
   - Uses existing plugin system
   - No new core concepts
   - Optional and external

**Result:** SCR becomes MORE useful while staying minimal.

---

### ⚠️ Risks to Monitor

**These could degrade philosophy if not careful:**

1. **Adapter System**
   - Risk: Becoming environment-specific
   - Mitigation: Keep adapters as plugins, not core concepts
   - Monitor: Ensure adapters don't require core changes

2. **Host Context**
   - Risk: Becoming a dependency injection framework
   - Mitigation: Keep it simple - just a readonly object
   - Monitor: Don't add lifecycle management

3. **Event Metadata**
   - Risk: Over-engineering event system
   - Mitigation: Keep metadata optional and simple
   - Monitor: Don't add event persistence/replay

---

### ❌ Would Degrade Philosophy

**These proposals violate core principles:**

1. **Module System**
   - Violates: "Minimal core"
   - Reason: JavaScript already has modules

2. **Sandboxing**
   - Violates: "Environment-neutral"
   - Reason: Assumes specific runtime capabilities

3. **Plugin Registry**
   - Violates: "Minimal core"
   - Reason: npm already exists

4. **CLI Framework**
   - Violates: "UI-agnostic"
   - Reason: CLI is a UI

5. **Migration Wizard**
   - Violates: "Minimal core"
   - Reason: Should be external tool


---

## Part 6: Concrete API Changes

### Changes to Core Runtime

#### src/types.ts
```typescript
// ADD: Host context option
export interface RuntimeOptions {
  logger?: Logger;
  hostContext?: Record<string, unknown>; // NEW
}

// ADD: Introspection interface
export interface IntrospectionAPI {
  listActions(): string[];
  listPlugins(): string[];
  listScreens(): string[];
  getActionDefinition(id: string): ActionDefinition | null;
  getPluginDefinition(name: string): PluginDefinition | null;
  getScreenDefinition(id: string): ScreenDefinition | null;
}

// MODIFY: RuntimeContext to include new APIs
export interface RuntimeContext {
  screens: { /* existing */ };
  actions: { /* existing */ };
  plugins: { /* existing */ };
  events: { /* existing */ };
  getRuntime(): Runtime;
  
  // NEW: Host context access
  readonly host: Readonly<Record<string, unknown>>;
  
  // NEW: Introspection API
  readonly introspect: IntrospectionAPI;
}
```

#### src/runtime.ts
```typescript
export class Runtime {
  private hostContext: Record<string, unknown>; // NEW
  
  constructor(options?: RuntimeOptions) {
    this.logger = options?.logger ?? new ConsoleLogger();
    this.hostContext = options?.hostContext ?? {}; // NEW
  }
  
  async initialize(): Promise<void> {
    // ... existing initialization
    
    // Pass hostContext to RuntimeContext
    this.context = new RuntimeContextImpl(
      this.screens,
      this.actions,
      this.plugins,
      this.events,
      this,
      this.hostContext // NEW
    );
    
    // ... rest of initialization
  }
}
```

#### src/runtime-context.ts
```typescript
export class RuntimeContextImpl implements RuntimeContext {
  private hostContext: Record<string, unknown>; // NEW
  
  constructor(
    screenRegistry: ScreenRegistry,
    actionEngine: ActionEngine,
    pluginRegistry: PluginRegistry,
    eventBus: EventBus,
    runtime: Runtime,
    hostContext: Record<string, unknown> // NEW
  ) {
    // ... existing assignments
    this.hostContext = hostContext; // NEW
  }
  
  // NEW: Expose host context
  get host(): Readonly<Record<string, unknown>> {
    return Object.freeze({ ...this.hostContext });
  }
  
  // NEW: Introspection API
  get introspect(): IntrospectionAPI {
    return {
      listActions: () => this.actionEngine.getAllActions().map(a => a.id),
      listPlugins: () => this.pluginRegistry.getAllPlugins().map(p => p.name),
      listScreens: () => this.screenRegistry.getAllScreens().map(s => s.id),
      getActionDefinition: (id) => this.actionEngine.getAction(id),
      getPluginDefinition: (name) => this.pluginRegistry.getPlugin(name),
      getScreenDefinition: (id) => this.screenRegistry.getScreen(id)
    };
  }
}
```

---

### Breaking Changes Assessment

**NONE** - All changes are additive:

✅ Existing code continues to work
✅ New features are opt-in
✅ No API removals
✅ No behavior changes to existing features

**Backward Compatibility:** 100%

---

## Part 7: Testing Strategy

### Unit Tests (New)

```typescript
// tests/unit/host-context.test.ts
describe('Host Context', () => {
  it('should inject host context into runtime', async () => {
    const db = { query: vi.fn() };
    const runtime = new Runtime({ hostContext: { db } });
    await runtime.initialize();
    
    const context = runtime.getContext();
    expect(context.host.db).toBe(db);
  });
  
  it('should freeze host context to prevent mutation', async () => {
    const runtime = new Runtime({ hostContext: { value: 1 } });
    await runtime.initialize();
    
    const context = runtime.getContext();
    expect(() => {
      (context.host as any).value = 2;
    }).toThrow();
  });
});

// tests/unit/introspection.test.ts
describe('Introspection API', () => {
  it('should list all registered actions', async () => {
    const runtime = new Runtime();
    await runtime.initialize();
    
    const context = runtime.getContext();
    context.actions.registerAction({
      id: 'test:action',
      handler: () => {}
    });
    
    expect(context.introspect.listActions()).toContain('test:action');
  });
});
```

### Integration Tests (New)

```typescript
// tests/integration/migration-patterns.test.ts
describe('Migration Patterns', () => {
  it('should support gradual migration pattern', async () => {
    // Test legacy + SCR coexistence
  });
  
  it('should support event bridge pattern', async () => {
    // Test EventEmitter <-> EventBus bridge
  });
  
  it('should support feature flag pattern', async () => {
    // Test conditional plugin loading
  });
});
```

### Property Tests (New)

```typescript
// tests/property/host-context.property.test.ts
describe('Host Context Properties', () => {
  it('should never allow mutation of host context', () => {
    fc.assert(
      fc.property(fc.object(), (hostContext) => {
        const runtime = new Runtime({ hostContext });
        // ... verify immutability
      })
    );
  });
});
```


---

## Part 8: Migration Guide Structure

### Recommended Documentation Structure

```
docs/
├── guides/
│   ├── migration-guide.md           # Main migration guide
│   ├── migration-patterns.md        # Patterns (already exists)
│   ├── migration-examples.md        # Real code examples
│   └── migration-anti-patterns.md   # What NOT to do
├── examples/
│   └── migration/
│       ├── express-backend/
│       ├── cli-tool/
│       └── browser-extension/
└── api/
    └── migration-api.md             # API reference for migration utils
```

### Key Documentation Sections

1. **When to Migrate**
   - App has 1000+ lines
   - Multiple features interacting
   - Hard to test in isolation
   - Team scaling issues

2. **When NOT to Migrate**
   - Simple apps (<500 lines)
   - Stable, maintenance-only apps
   - Short-lived projects

3. **Migration Levels**
   - Level 1: Add SCR alongside (no changes)
   - Level 2: Wrap one feature
   - Level 3: Event bridge
   - Level 4: Multiple features
   - Level 5: Full integration

4. **Real Examples**
   - Before/after code
   - Step-by-step instructions
   - Common pitfalls
   - Testing strategies

---

## Part 9: Package Structure

### Recommended Monorepo Structure

```
skeleton-crew/
├── packages/
│   ├── runtime/                    # Core runtime (existing)
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── migration-utils/            # NEW: Migration helpers
│   │   ├── src/
│   │   │   ├── wrappers.ts
│   │   │   ├── bridge.ts
│   │   │   ├── feature-flags.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── cli-adapter/                # NEW: CLI adapter plugin
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   │
│   └── browser-adapter/            # NEW: Browser adapter plugin
│       ├── src/
│       ├── tests/
│       └── package.json
│
├── examples/
│   └── migration/                  # NEW: Migration examples
│       ├── express-backend/
│       ├── cli-tool/
│       └── browser-extension/
│
└── docs/
    └── guides/
        └── migration-guide.md      # Enhanced migration guide
```

### Package Dependencies

```
@skeleton-crew/runtime (core)
  ↑
  ├── @skeleton-crew/migration-utils (depends on runtime)
  ├── @skeleton-crew/cli-adapter (depends on runtime)
  └── @skeleton-crew/browser-adapter (depends on runtime)
```

**Key principle:** Core runtime has ZERO dependencies on migration packages.

---

## Part 10: Success Metrics

### How to Measure Success

1. **Adoption Metrics**
   - Number of legacy apps successfully migrated
   - Time to first successful migration
   - Number of features migrated per app

2. **Code Quality Metrics**
   - Lines of code reduced in legacy apps
   - Test coverage improvement
   - Bug reduction after migration

3. **Developer Experience Metrics**
   - Time to understand migration process
   - Number of support questions
   - Migration success rate

4. **Philosophy Adherence Metrics**
   - Core runtime size (should stay small)
   - Number of core dependencies (should stay minimal)
   - API surface area (should grow slowly)

### Target Metrics (6 months post-release)

- ✅ 10+ successful migrations documented
- ✅ Core runtime stays under 5KB gzipped
- ✅ Zero breaking changes to existing API
- ✅ 90%+ test coverage on new features
- ✅ Migration utils package < 10KB gzipped

---

## Part 11: Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | HIGH | HIGH | Strict "reject" list, separate packages |
| Breaking changes | LOW | HIGH | Comprehensive tests, semantic versioning |
| Performance regression | LOW | MEDIUM | Benchmarks, performance tests |
| Complexity increase | MEDIUM | HIGH | Keep core minimal, external packages |
| Documentation debt | MEDIUM | MEDIUM | Write docs alongside code |

### Philosophical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Becoming a framework | MEDIUM | HIGH | Reject framework features, stay minimal |
| Environment-specific | LOW | HIGH | Keep adapters as plugins |
| UI opinions | LOW | HIGH | Maintain UI-agnostic stance |
| State management | LOW | MEDIUM | Don't add state management |

### Mitigation Strategies

1. **Strict Review Process**
   - Every PR reviewed against philosophy document
   - Reject features that violate principles
   - Prefer external packages over core changes

2. **Community Feedback**
   - Beta releases for migration features
   - Gather feedback from real migrations
   - Iterate based on actual usage

3. **Documentation First**
   - Write docs before implementation
   - Ensure examples work
   - Test migration guides with real apps


---

## Part 12: Final Recommendations

### ✅ DO: Implement These (High Value, Low Risk)

1. **Context Injection** (Phase 1)
   - Additive, non-breaking
   - Enables host app integration
   - Maintains philosophy
   - **Effort:** 1 week
   - **Value:** HIGH

2. **Introspection API** (Phase 1)
   - Exposes existing functionality
   - Enables tooling
   - Zero breaking changes
   - **Effort:** 3 days
   - **Value:** MEDIUM

3. **Migration Utils Package** (Phase 2)
   - Separate package
   - Helps adoption
   - Doesn't pollute core
   - **Effort:** 1 week
   - **Value:** HIGH

4. **Enhanced Documentation** (Phase 4)
   - Critical for adoption
   - Real examples
   - Best practices
   - **Effort:** 2 weeks
   - **Value:** HIGH

### ⚠️ MAYBE: Consider These (Medium Value, Medium Risk)

1. **Adapter Plugins** (Phase 3)
   - Useful but not essential
   - Must stay as plugins
   - Monitor for scope creep
   - **Effort:** 3 weeks
   - **Value:** MEDIUM
   - **Decision:** Build if community requests

2. **Event Metadata** (Phase 1)
   - Nice for debugging
   - Risk of over-engineering
   - Keep minimal
   - **Effort:** 2 days
   - **Value:** LOW
   - **Decision:** Add only if needed

### ❌ DON'T: Reject These (Violate Philosophy)

1. **Module System** - Use JavaScript modules
2. **Sandboxing** - Host app's responsibility
3. **Plugin Registry** - Use npm
4. **CLI Framework** - Out of scope
5. **Migration Wizard** - External tool
6. **State Management** - Out of scope
7. **Routing** - Out of scope
8. **Auth System** - Host app's responsibility

---

## Part 13: Implementation Checklist

### Phase 1: Core Enhancements (v0.3.0)

- [ ] Add `hostContext` to RuntimeOptions
- [ ] Pass hostContext to RuntimeContext
- [ ] Expose `context.host` API
- [ ] Add introspection methods to RuntimeContext
- [ ] Write unit tests for host context
- [ ] Write unit tests for introspection
- [ ] Update TypeScript definitions
- [ ] Update API documentation
- [ ] Add migration guide section
- [ ] Create example: host context usage
- [ ] Run full test suite
- [ ] Update CHANGELOG.md
- [ ] Release v0.3.0

**Estimated Time:** 2 weeks

---

### Phase 2: Migration Utils (v0.3.1)

- [ ] Create `packages/migration-utils/` directory
- [ ] Implement `wrapLegacyFunction()`
- [ ] Implement `wrapLegacyClass()`
- [ ] Implement `createEventBridge()`
- [ ] Implement `createFeatureFlagPlugin()`
- [ ] Write comprehensive tests
- [ ] Write package README
- [ ] Create usage examples
- [ ] Publish to npm
- [ ] Update main docs to reference package

**Estimated Time:** 1 week

---

### Phase 3: Adapter Plugins (v0.4.0) - OPTIONAL

- [ ] Create `packages/cli-adapter/` directory
- [ ] Implement CLI adapter plugin
- [ ] Write CLI adapter tests
- [ ] Write CLI adapter docs
- [ ] Create `packages/browser-adapter/` directory
- [ ] Implement browser adapter plugin
- [ ] Write browser adapter tests
- [ ] Write browser adapter docs
- [ ] Publish both packages
- [ ] Update main docs

**Estimated Time:** 3 weeks (if needed)

---

### Phase 4: Documentation (v0.4.1)

- [ ] Expand migration-guide.md
- [ ] Create migration-examples.md
- [ ] Create migration-anti-patterns.md
- [ ] Create Express backend example
- [ ] Create CLI tool example
- [ ] Create browser extension example
- [ ] Write migration cookbook
- [ ] Record video tutorials (optional)
- [ ] Create migration decision tree
- [ ] Update README.md

**Estimated Time:** 2 weeks

---

## Part 14: Conclusion

### Summary of Recommendations

**ADOPT (High Priority):**
1. ✅ Context Injection - Core enhancement
2. ✅ Introspection API - Core enhancement
3. ✅ Migration Utils Package - Separate package
4. ✅ Enhanced Documentation - Critical for adoption

**DEFER (Low Priority):**
1. ⚠️ Adapter Plugins - Build if requested
2. ⚠️ Event Metadata - Add if needed

**REJECT (Out of Scope):**
1. ❌ Module System
2. ❌ Sandboxing
3. ❌ Plugin Registry
4. ❌ CLI Framework
5. ❌ Migration Wizard
6. ❌ State Management
7. ❌ Routing
8. ❌ Auth System

### Impact on SCR Philosophy

**AMPLIFIES Philosophy:**
- Context injection makes SCR MORE embeddable
- Introspection enables better tooling
- Migration utils help adoption WITHOUT polluting core
- Maintains minimal, UI-agnostic, environment-neutral design

**MAINTAINS Philosophy:**
- Zero breaking changes
- Core stays minimal
- No new core concepts
- Plugin-driven architecture preserved

**AVOIDS Degradation:**
- Rejects scope creep
- Keeps framework features out
- Maintains clear boundaries
- Preserves simplicity

### Final Verdict

**The proposed upgrades, when SELECTIVELY implemented, will AMPLIFY Skeleton Crew Runtime's core philosophy while enabling legacy app integration.**

**Key Success Factors:**
1. Keep core minimal (only context injection + introspection)
2. Put migration helpers in separate packages
3. Reject scope creep aggressively
4. Maintain backward compatibility
5. Document extensively

**Timeline:** 6-8 weeks for full implementation
**Risk Level:** LOW (with selective adoption)
**Value:** HIGH (enables new use cases without compromising philosophy)

---

## Appendix A: Quick Reference

### What Changes in Core Runtime

```typescript
// BEFORE (v0.2.x)
const runtime = new Runtime();
await runtime.initialize();

// AFTER (v0.3.0)
const runtime = new Runtime({
  hostContext: { db, cache, logger } // NEW
});
await runtime.initialize();

const context = runtime.getContext();
context.host.db.query('SELECT * FROM users'); // NEW
context.introspect.listActions(); // NEW
```

### What Stays the Same

- All existing APIs
- Plugin system
- Action engine
- Event bus
- Screen registry
- Initialization sequence
- Shutdown sequence
- Error handling
- Type safety

### What's External

- Migration utilities (`@skeleton-crew/migration-utils`)
- CLI adapter (`@skeleton-crew/cli-adapter`)
- Browser adapter (`@skeleton-crew/browser-adapter`)
- Migration wizard (community tool)
- Plugin registry (use npm)

---

**Document Version:** 1.0
**Date:** 2024
**Status:** READY FOR REVIEW
**Next Steps:** Review with team, prioritize phases, begin Phase 1 implementation

