# SCR Test Standards

## Overview

This document defines standard test vectors and quality requirements for Skeleton Crew Runtime implementations and extensions.

**Purpose:** Ensure consistent quality, catch regressions, and validate philosophy adherence.

---

## Test Categories

### 1. Unit Tests
- Test individual components in isolation
- Mock dependencies
- Fast execution (< 1ms per test)
- High coverage (> 90%)

### 2. Integration Tests
- Test subsystem interactions
- Real dependencies
- Medium execution (< 100ms per test)
- Focus on contracts

### 3. Property Tests
- Test invariants with random inputs
- Use fast-check library
- Minimum 100 iterations
- Catch edge cases

### 4. Performance Tests
- Benchmark critical paths
- Memory leak detection
- Concurrency testing
- Regression detection

---

## Standard Test Vectors

### Vector 1: Snapshot Tests for Introspection

**Purpose:** Ensure introspection API stability

```typescript
// tests/standards/introspection-snapshots.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../src/runtime.js';

describe('Introspection Snapshots', () => {
  let runtime: Runtime;
  
  beforeEach(async () => {
    runtime = new Runtime();
    await runtime.initialize();
  });
  
  it('should match action definition snapshot', () => {
    const context = runtime.getContext();
    
    context.actions.registerAction({
      id: 'test:action',
      handler: () => ({ success: true }),
      timeout: 5000
    });
    
    const definition = context.introspect.getActionDefinition('test:action');
    
    // Should not include handler function
    expect(definition).toMatchSnapshot();
    expect(definition).not.toHaveProperty('handler');
  });
  
  it('should match plugin definition snapshot', () => {
    const context = runtime.getContext();
    
    context.plugins.registerPlugin({
      name: 'test-plugin',
      version: '1.0.0',
      setup: () => {}
    });
    
    const definition = context.introspect.getPluginDefinition('test-plugin');
    
    // Should not include setup function
    expect(definition).toMatchSnapshot();
    expect(definition).not.toHaveProperty('setup');
  });
  
  it('should match screen definition snapshot', () => {
    const context = runtime.getContext();
    
    context.screens.registerScreen({
      id: 'test:screen',
      title: 'Test Screen',
      component: 'TestComponent'
    });
    
    const definition = context.introspect.getScreenDefinition('test:screen');
    expect(definition).toMatchSnapshot();
  });
});
```

---

### Vector 2: Concurrency Tests for Action Engine

**Purpose:** Ensure thread-safety and correct concurrent execution

```typescript
// tests/standards/action-concurrency.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../src/runtime.js';

describe('Action Engine Concurrency', () => {
  let runtime: Runtime;
  
  beforeEach(async () => {
    runtime = new Runtime();
    await runtime.initialize();
  });
  
  it('should handle 100 concurrent actions without race conditions', async () => {
    const context = runtime.getContext();
    let counter = 0;
    
    context.actions.registerAction({
      id: 'increment',
      handler: async () => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10));
        counter++;
        return counter;
      }
    });
    
    // Execute 100 actions concurrently
    const results = await Promise.all(
      Array(100).fill(0).map(() => 
        context.actions.runAction('increment')
      )
    );
    
    // All actions should complete
    expect(results).toHaveLength(100);
    expect(counter).toBe(100);
  });
  
  it('should handle concurrent action registration', async () => {
    const context = runtime.getContext();
    
    // Register 50 actions concurrently
    await Promise.all(
      Array(50).fill(0).map((_, i) => 
        Promise.resolve(
          context.actions.registerAction({
            id: `action-${i}`,
            handler: () => i
          })
        )
      )
    );
    
    const actions = context.introspect.listActions();
    expect(actions).toHaveLength(50);
  });
  
  it('should handle concurrent action execution with timeouts', async () => {
    const context = runtime.getContext();
    
    context.actions.registerAction({
      id: 'slow',
      handler: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'done';
      },
      timeout: 50
    });
    
    // All should timeout
    const results = await Promise.allSettled(
      Array(10).fill(0).map(() => 
        context.actions.runAction('slow')
      )
    );
    
    results.forEach(result => {
      expect(result.status).toBe('rejected');
    });
  });
});
```

---

### Vector 3: Memory Leak Tests for Dispose Lifecycle

**Purpose:** Ensure proper cleanup and no memory leaks

```typescript
// tests/standards/memory-leaks.test.ts
import { describe, it, expect } from 'vitest';
import { Runtime } from '../src/runtime.js';

describe('Memory Leak Prevention', () => {
  it('should not leak memory after multiple init/shutdown cycles', async () => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Create and destroy 100 runtimes
    for (let i = 0; i < 100; i++) {
      const runtime = new Runtime();
      await runtime.initialize();
      
      // Register some resources
      const context = runtime.getContext();
      context.actions.registerAction({
        id: `action-${i}`,
        handler: () => {}
      });
      
      context.events.on(`event-${i}`, () => {});
      
      context.screens.registerScreen({
        id: `screen-${i}`,
        title: `Screen ${i}`,
        component: 'Component'
      });
      
      await runtime.shutdown();
    }
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const leakMB = (finalMemory - initialMemory) / 1024 / 1024;
    
    // Should not leak more than 10MB
    expect(leakMB).toBeLessThan(10);
  });
  
  it('should cleanup event listeners on shutdown', async () => {
    const runtime = new Runtime();
    await runtime.initialize();
    
    const context = runtime.getContext();
    const listeners: Array<() => void> = [];
    
    // Register 100 event listeners
    for (let i = 0; i < 100; i++) {
      const unsubscribe = context.events.on(`event-${i}`, () => {});
      listeners.push(unsubscribe);
    }
    
    await runtime.shutdown();
    
    // Listeners should be cleaned up
    // Attempting to emit should not call any handlers
    let called = false;
    context.events.on('test', () => { called = true; });
    context.events.emit('test');
    
    expect(called).toBe(false);
  });
  
  it('should cleanup plugin resources on shutdown', async () => {
    const runtime = new Runtime();
    await runtime.initialize();
    
    let disposeCallCount = 0;
    
    runtime.getContext().plugins.registerPlugin({
      name: 'test-plugin',
      version: '1.0.0',
      setup: () => {},
      dispose: () => {
        disposeCallCount++;
      }
    });
    
    await runtime.shutdown();
    
    expect(disposeCallCount).toBe(1);
  });
});
```

---

### Vector 4: Event Ordering Tests

**Purpose:** Ensure deterministic event handling

```typescript
// tests/standards/event-ordering.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../src/runtime.js';

describe('Event Ordering', () => {
  let runtime: Runtime;
  
  beforeEach(async () => {
    runtime = new Runtime();
    await runtime.initialize();
  });
  
  it('should emit events in registration order', () => {
    const context = runtime.getContext();
    const order: number[] = [];
    
    context.events.on('test', () => order.push(1));
    context.events.on('test', () => order.push(2));
    context.events.on('test', () => order.push(3));
    
    context.events.emit('test');
    
    expect(order).toEqual([1, 2, 3]);
  });
  
  it('should handle async events in order', async () => {
    const context = runtime.getContext();
    const order: number[] = [];
    
    context.events.on('test', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      order.push(1);
    });
    
    context.events.on('test', async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      order.push(2);
    });
    
    context.events.on('test', async () => {
      order.push(3);
    });
    
    await context.events.emitAsync('test');
    
    // All should complete, but order may vary due to async
    expect(order).toHaveLength(3);
    expect(order).toContain(1);
    expect(order).toContain(2);
    expect(order).toContain(3);
  });
  
  it('should isolate event handler errors', () => {
    const context = runtime.getContext();
    const order: number[] = [];
    
    context.events.on('test', () => order.push(1));
    context.events.on('test', () => {
      throw new Error('Handler error');
    });
    context.events.on('test', () => order.push(3));
    
    // Should not throw
    expect(() => context.events.emit('test')).not.toThrow();
    
    // Handlers 1 and 3 should still execute
    expect(order).toEqual([1, 3]);
  });
});
```

---

### Vector 5: Plugin Lifecycle Tests

**Purpose:** Ensure correct plugin initialization and disposal

```typescript
// tests/standards/plugin-lifecycle.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../src/runtime.js';

describe('Plugin Lifecycle', () => {
  it('should execute setup in registration order', async () => {
    const runtime = new Runtime();
    const order: number[] = [];
    
    runtime.registerPlugin({
      name: 'plugin-1',
      version: '1.0.0',
      setup: () => order.push(1)
    });
    
    runtime.registerPlugin({
      name: 'plugin-2',
      version: '1.0.0',
      setup: () => order.push(2)
    });
    
    runtime.registerPlugin({
      name: 'plugin-3',
      version: '1.0.0',
      setup: () => order.push(3)
    });
    
    await runtime.initialize();
    
    expect(order).toEqual([1, 2, 3]);
  });
  
  it('should execute dispose in reverse order', async () => {
    const runtime = new Runtime();
    const order: number[] = [];
    
    runtime.registerPlugin({
      name: 'plugin-1',
      version: '1.0.0',
      setup: () => {},
      dispose: () => order.push(1)
    });
    
    runtime.registerPlugin({
      name: 'plugin-2',
      version: '1.0.0',
      setup: () => {},
      dispose: () => order.push(2)
    });
    
    runtime.registerPlugin({
      name: 'plugin-3',
      version: '1.0.0',
      setup: () => {},
      dispose: () => order.push(3)
    });
    
    await runtime.initialize();
    await runtime.shutdown();
    
    expect(order).toEqual([3, 2, 1]);
  });
  
  it('should rollback on setup failure', async () => {
    const runtime = new Runtime();
    const disposed: number[] = [];
    
    runtime.registerPlugin({
      name: 'plugin-1',
      version: '1.0.0',
      setup: () => {},
      dispose: () => disposed.push(1)
    });
    
    runtime.registerPlugin({
      name: 'plugin-2',
      version: '1.0.0',
      setup: () => {
        throw new Error('Setup failed');
      },
      dispose: () => disposed.push(2)
    });
    
    runtime.registerPlugin({
      name: 'plugin-3',
      version: '1.0.0',
      setup: () => {},
      dispose: () => disposed.push(3)
    });
    
    await expect(runtime.initialize()).rejects.toThrow('Setup failed');
    
    // Plugin 1 should be disposed (rollback)
    // Plugin 2 never completed setup
    // Plugin 3 never started setup
    expect(disposed).toEqual([1]);
  });
});
```

---

### Vector 6: Host Context Tests

**Purpose:** Ensure proper host context handling

```typescript
// tests/standards/host-context.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../src/runtime.js';

describe('Host Context', () => {
  it('should inject host context into runtime', async () => {
    const db = { query: vi.fn() };
    const logger = { log: vi.fn() };
    
    const runtime = new Runtime({
      hostContext: { db, logger }
    });
    
    await runtime.initialize();
    
    const context = runtime.getContext();
    expect(context.host.db).toBe(db);
    expect(context.host.logger).toBe(logger);
  });
  
  it('should freeze host context to prevent mutation', async () => {
    const runtime = new Runtime({
      hostContext: { value: 1 }
    });
    
    await runtime.initialize();
    
    const context = runtime.getContext();
    
    // Should throw when trying to mutate
    expect(() => {
      (context.host as any).value = 2;
    }).toThrow();
    
    expect(() => {
      (context.host as any).newKey = 'value';
    }).toThrow();
  });
  
  it('should default to empty object if no context provided', async () => {
    const runtime = new Runtime();
    await runtime.initialize();
    
    const context = runtime.getContext();
    expect(context.host).toEqual({});
  });
  
  it('should pass host context to plugins', async () => {
    const db = { query: vi.fn() };
    
    const runtime = new Runtime({
      hostContext: { db }
    });
    
    let capturedContext: any;
    
    runtime.registerPlugin({
      name: 'test-plugin',
      version: '1.0.0',
      setup: (context) => {
        capturedContext = context.host;
      }
    });
    
    await runtime.initialize();
    
    expect(capturedContext.db).toBe(db);
  });
});
```

---

## Quality Requirements

### Code Coverage

| Component | Minimum Coverage |
|-----------|-----------------|
| Core Runtime | 95% |
| Subsystems | 90% |
| Utilities | 85% |
| Examples | 70% |

### Performance Benchmarks

| Operation | Maximum Time |
|-----------|-------------|
| Runtime initialization | < 10ms |
| Action registration | < 1ms |
| Action execution (sync) | < 1ms |
| Action execution (async) | < 100ms |
| Event emission | < 1ms |
| Plugin setup | < 50ms |
| Runtime shutdown | < 100ms |

### Memory Limits

| Scenario | Maximum Memory |
|----------|---------------|
| Empty runtime | < 1MB |
| 100 actions | < 5MB |
| 100 plugins | < 10MB |
| 100 init/shutdown cycles | < 10MB leak |

---

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm test tests/unit
```

### Integration Tests Only
```bash
npm test tests/integration
```

### Property Tests Only
```bash
npm test tests/property
```

### Performance Tests
```bash
npm run test:perf
```

### Coverage Report
```bash
npm run test:coverage
```

---

## CI/CD Requirements

### Pre-commit
- All unit tests pass
- Linting passes
- Type checking passes

### Pre-push
- All tests pass (unit + integration)
- Coverage > 90%
- No TypeScript errors

### Pre-release
- All tests pass (including property tests)
- Performance benchmarks pass
- Memory leak tests pass
- Documentation updated

---

**Document Version:** 1.0
**Status:** APPROVED
**Last Updated:** 2024

