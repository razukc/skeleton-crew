# SCR Migration Support - Implementation Roadmap

## Overview

This roadmap outlines the concrete steps to implement migration support for Skeleton Crew Runtime while maintaining its core philosophy.

**Total Timeline:** 6-8 weeks
**Breaking Changes:** ZERO
**New Core Concepts:** ZERO
**Philosophy Impact:** AMPLIFIES

---

## Week 1-2: Phase 1 - Core Enhancements

### Goal
Add minimal, high-value features to core runtime.

### Tasks

#### Task 1.1: Context Injection (3 days)

**Files to modify:**
- `src/types.ts`
- `src/runtime.ts`
- `src/runtime-context.ts`

**Changes:**
```typescript
// src/types.ts
export interface RuntimeOptions {
  logger?: Logger;
  hostContext?: Record<string, unknown>; // ADD
}

export interface RuntimeContext {
  // ... existing
  readonly host: Readonly<Record<string, unknown>>; // ADD
}

// src/runtime.ts
export class Runtime {
  private hostContext: Record<string, unknown>; // ADD
  
  constructor(options?: RuntimeOptions) {
    this.logger = options?.logger ?? new ConsoleLogger();
    this.hostContext = options?.hostContext ?? {}; // ADD
  }
  
  async initialize(): Promise<void> {
    // ... existing
    this.context = new RuntimeContextImpl(
      this.screens,
      this.actions,
      this.plugins,
      this.events,
      this,
      this.hostContext // ADD
    );
  }
}

// src/runtime-context.ts
export class RuntimeContextImpl implements RuntimeContext {
  private hostContext: Record<string, unknown>; // ADD
  
  constructor(
    screenRegistry: ScreenRegistry,
    actionEngine: ActionEngine,
    pluginRegistry: PluginRegistry,
    eventBus: EventBus,
    runtime: Runtime,
    hostContext: Record<string, unknown> // ADD
  ) {
    // ... existing
    this.hostContext = hostContext; // ADD
  }
  
  get host(): Readonly<Record<string, unknown>> { // ADD
    return Object.freeze({ ...this.hostContext });
  }
}
```

**Tests to add:**
```typescript
// tests/unit/host-context.test.ts
describe('Host Context', () => {
  it('should inject host context');
  it('should freeze host context');
  it('should default to empty object');
  it('should pass context to plugins');
});
```

**Documentation:**
- Update `docs/api/API.md`
- Add example to `README.md`
- Update migration guide

---

#### Task 1.2: Introspection API (2 days)

**Files to modify:**
- `src/types.ts`
- `src/runtime-context.ts`

**Changes:**
```typescript
// src/types.ts
export interface IntrospectionAPI {
  listActions(): string[];
  listPlugins(): string[];
  listScreens(): string[];
  getActionDefinition(id: string): ActionDefinition | null;
  getPluginDefinition(name: string): PluginDefinition | null;
  getScreenDefinition(id: string): ScreenDefinition | null;
}

export interface RuntimeContext {
  // ... existing
  readonly introspect: IntrospectionAPI; // ADD
}

// src/runtime-context.ts
export class RuntimeContextImpl implements RuntimeContext {
  get introspect(): IntrospectionAPI { // ADD
    return {
      listActions: () => 
        this.actionEngine.getAllActions().map(a => a.id),
      listPlugins: () => 
        this.pluginRegistry.getAllPlugins().map(p => p.name),
      listScreens: () => 
        this.screenRegistry.getAllScreens().map(s => s.id),
      getActionDefinition: (id) => 
        this.actionEngine.getAction(id),
      getPluginDefinition: (name) => 
        this.pluginRegistry.getPlugin(name),
      getScreenDefinition: (id) => 
        this.screenRegistry.getScreen(id)
    };
  }
}
```

**Tests to add:**
```typescript
// tests/unit/introspection.test.ts
describe('Introspection API', () => {
  it('should list all actions');
  it('should list all plugins');
  it('should list all screens');
  it('should get action definition');
  it('should return null for missing action');
});
```

**Documentation:**
- Update `docs/api/API.md`
- Add introspection examples
- Show use cases (debugging, admin dashboards)

---

#### Task 1.3: Testing & Documentation (2 days)

**Tests:**
- Run full test suite
- Add integration tests
- Verify backward compatibility
- Test with existing examples

**Documentation:**
- Update CHANGELOG.md
- Update README.md
- Update API.md
- Add migration guide section

**Release:**
- Version bump to v0.3.0
- Publish to npm
- Create GitHub release

---

## Week 3: Phase 2 - Migration Utils Package

### Goal
Create separate package with migration helpers.

### Tasks

#### Task 2.1: Package Setup (1 day)

**Create structure:**
```
packages/migration-utils/
├── src/
│   ├── wrappers.ts
│   ├── bridge.ts
│   ├── feature-flags.ts
│   ├── index.ts
│   └── types.ts
├── tests/
│   ├── wrappers.test.ts
│   ├── bridge.test.ts
│   └── feature-flags.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

**package.json:**
```json
{
  "name": "@skeleton-crew/migration-utils",
  "version": "0.1.0",
  "description": "Migration utilities for Skeleton Crew Runtime",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "skeleton-crew": "^0.3.0"
  }
}
```

---

#### Task 2.2: Implement Wrappers (2 days)

**src/wrappers.ts:**
```typescript
import type { ActionDefinition, PluginDefinition, RuntimeContext } from 'skeleton-crew';

/**
 * Wrap a legacy function as an SCR action
 */
export function wrapLegacyFunction<P = unknown, R = unknown>(
  fn: (params: P) => R | Promise<R>,
  options?: {
    id?: string;
    timeout?: number;
  }
): ActionDefinition<P, R> {
  return {
    id: options?.id || fn.name || 'wrapped-function',
    handler: async (params, context) => {
      return await fn(params);
    },
    timeout: options?.timeout
  };
}

/**
 * Wrap a legacy class as an SCR plugin
 */
export function wrapLegacyClass(
  instance: any,
  methods: string[],
  options?: {
    pluginName?: string;
  }
): PluginDefinition {
  return {
    name: options?.pluginName || 'legacy-wrapper',
    version: '1.0.0',
    setup(context: RuntimeContext) {
      methods.forEach(methodName => {
        context.actions.registerAction({
          id: `legacy:${methodName}`,
          handler: (params) => instance[methodName](params)
        });
      });
    }
  };
}

/**
 * Create a bridge plugin for legacy app
 */
export function createBridgePlugin(
  legacyApp: any,
  mappings: Record<string, string>
): PluginDefinition {
  return {
    name: 'legacy-bridge',
    version: '1.0.0',
    setup(context: RuntimeContext) {
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

---

#### Task 2.3: Implement Event Bridge (1 day)

**src/bridge.ts:**
```typescript
import type { Runtime } from 'skeleton-crew';
import { EventEmitter } from 'events';

/**
 * Create bidirectional event bridge between legacy EventEmitter and SCR
 */
export function createEventBridge(
  legacyEmitter: EventEmitter,
  runtime: Runtime,
  mappings: Record<string, string>
): () => void {
  const context = runtime.getContext();
  const unsubscribers: Array<() => void> = [];
  
  // Forward legacy events to SCR
  Object.entries(mappings).forEach(([legacyEvent, scrEvent]) => {
    const handler = (data: unknown) => {
      context.events.emit(scrEvent, data);
    };
    legacyEmitter.on(legacyEvent, handler);
    unsubscribers.push(() => legacyEmitter.off(legacyEvent, handler));
  });
  
  // Forward SCR events to legacy
  Object.entries(mappings).forEach(([legacyEvent, scrEvent]) => {
    const unsubscribe = context.events.on(scrEvent, (data) => {
      legacyEmitter.emit(legacyEvent, data);
    });
    unsubscribers.push(unsubscribe);
  });
  
  // Return cleanup function
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}
```

---

#### Task 2.4: Implement Feature Flags (1 day)

**src/feature-flags.ts:**
```typescript
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';

export type FeatureConfig = Record<string, 'scr' | 'legacy'>;

/**
 * Create a feature flag plugin for gradual migration
 */
export function createFeatureFlagPlugin(
  config: FeatureConfig,
  legacyImplementations: Record<string, any>
): PluginDefinition {
  return {
    name: 'feature-flags',
    version: '1.0.0',
    setup(context: RuntimeContext) {
      // Register helper action to check feature flags
      context.actions.registerAction({
        id: 'feature:check',
        handler: ({ feature }: { feature: string }) => {
          return config[feature] || 'legacy';
        }
      });
      
      // Register helper action to route to correct implementation
      context.actions.registerAction({
        id: 'feature:run',
        handler: async ({ feature, action, params }: any) => {
          if (config[feature] === 'scr') {
            return await context.actions.runAction(action, params);
          } else {
            const impl = legacyImplementations[feature];
            return await impl(params);
          }
        }
      });
    }
  };
}
```

---

#### Task 2.5: Tests & Documentation (1 day)

**Tests:**
- Unit tests for all wrappers
- Integration tests with mock legacy code
- Example usage tests

**Documentation:**
- Complete README.md
- API documentation
- Usage examples
- Migration patterns

**Release:**
- Publish to npm as v0.1.0
- Update main docs to reference package

---

## Week 4-6: Phase 3 - Adapter Plugins (OPTIONAL)

### Goal
Create optional adapter plugins if community requests.

### Decision Point
- Wait for community feedback
- Only build if there's demand
- Keep as separate packages

### If Needed: CLI Adapter

**Package:** `@skeleton-crew/cli-adapter`

**Implementation:**
```typescript
export function createCLIAdapter(options: CLIAdapterOptions): PluginDefinition {
  return {
    name: 'cli-adapter',
    version: '1.0.0',
    setup(context: RuntimeContext) {
      // Parse process.argv
      // Register CLI helper actions
      // Setup logging
    }
  };
}
```

### If Needed: Browser Adapter

**Package:** `@skeleton-crew/browser-adapter`

**Implementation:**
```typescript
export function createBrowserAdapter(options: BrowserAdapterOptions): PluginDefinition {
  return {
    name: 'browser-adapter',
    version: '1.0.0',
    setup(context: RuntimeContext) {
      // Setup message passing
      // Register browser-specific actions
      // Handle serialization
    }
  };
}
```

---

## Week 7-8: Phase 4 - Documentation & Examples

### Goal
Comprehensive migration documentation with real examples.

### Tasks

#### Task 4.1: Expand Migration Guide (3 days)

**Update:** `docs/guides/migration-guide.md`

**Sections:**
1. When to Migrate
2. When NOT to Migrate
3. Migration Levels (1-5)
4. Step-by-Step Guide
5. Common Patterns
6. Anti-Patterns
7. Testing Strategies
8. Troubleshooting

---

#### Task 4.2: Create Real Examples (4 days)

**Example 1: Express Backend**
```
examples/migration/express-backend/
├── before/
│   └── app.js              # Monolithic Express app
├── after/
│   ├── app.js              # SCR-integrated
│   ├── plugins/
│   │   ├── users.js
│   │   └── analytics.js
│   └── package.json
└── README.md               # Step-by-step migration
```

**Example 2: CLI Tool**
```
examples/migration/cli-tool/
├── before/
│   └── cli.js              # Traditional CLI
├── after/
│   ├── cli.js              # SCR-powered
│   ├── plugins/
│   └── package.json
└── README.md
```

**Example 3: Browser Extension**
```
examples/migration/browser-extension/
├── before/
│   └── background.js       # Monolithic
├── after/
│   ├── background.js       # SCR-powered
│   ├── plugins/
│   └── manifest.json
└── README.md
```

---

#### Task 4.3: Create Migration Cookbook (2 days)

**File:** `docs/guides/migration-cookbook.md`

**Recipes:**
1. Wrap existing function as action
2. Bridge legacy events to SCR
3. Feature flag pattern
4. Gradual plugin extraction
5. Testing during migration
6. Rollback strategies
7. Performance optimization
8. Error handling patterns
9. Logging integration
10. State management patterns

---

#### Task 4.4: Update Main Documentation (1 day)

**Files to update:**
- `README.md` - Add migration section
- `docs/README.md` - Link to migration guide
- `docs/api/API.md` - Document new APIs
- `.kiro/steering/migration-patterns.md` - Align with implementation

---

## Release Schedule

### v0.3.0 (Week 2)
- ✅ Context injection
- ✅ Introspection API
- ✅ Updated documentation
- ✅ Zero breaking changes

### v0.3.1 (Week 3)
- ✅ @skeleton-crew/migration-utils package
- ✅ Migration utilities
- ✅ Usage examples

### v0.4.0 (Week 6) - OPTIONAL
- ⚠️ @skeleton-crew/cli-adapter (if needed)
- ⚠️ @skeleton-crew/browser-adapter (if needed)
- ⚠️ Adapter documentation

### v0.4.1 (Week 8)
- ✅ Complete migration guide
- ✅ Real-world examples
- ✅ Migration cookbook
- ✅ Video tutorials (optional)

---

## Success Criteria

### Technical
- [ ] Zero breaking changes
- [ ] Core runtime < 5KB gzipped
- [ ] 90%+ test coverage on new features
- [ ] All tests passing
- [ ] TypeScript types complete

### Documentation
- [ ] Migration guide complete
- [ ] 3+ real examples
- [ ] API docs updated
- [ ] Cookbook with 10+ recipes
- [ ] Video tutorials (optional)

### Adoption
- [ ] 3+ successful test migrations
- [ ] Community feedback positive
- [ ] No major issues reported
- [ ] Clear upgrade path documented

---

## Risk Mitigation

### Technical Risks
- **Scope creep:** Strict "reject" list, code review
- **Breaking changes:** Comprehensive tests, semantic versioning
- **Performance:** Benchmarks before/after
- **Complexity:** Keep core minimal, external packages

### Process Risks
- **Timeline slip:** Prioritize Phase 1, defer Phase 3
- **Resource constraints:** Focus on high-value features
- **Community feedback:** Beta releases, gather feedback early

---

## Next Steps

1. **Week 1:** Start Phase 1 implementation
2. **Week 2:** Complete Phase 1, release v0.3.0
3. **Week 3:** Complete Phase 2, release v0.3.1
4. **Week 4-6:** Evaluate Phase 3 need, implement if requested
5. **Week 7-8:** Complete documentation and examples

**Start Date:** TBD
**End Date:** TBD (6-8 weeks from start)
**Owner:** TBD
**Status:** READY FOR REVIEW

