# Documentation Engine Tests

## Test Overview

This directory contains comprehensive tests for the Documentation Engine demo application.

### Test Statistics

- **Total Tests:** 196
- **Passing:** 180 ✅
- **Skipped:** 16 ⏭️
- **Coverage:** 91.8%

### Test Structure

```
tests/
├── unit/                    # Unit tests for individual plugins
│   ├── cache.test.ts       # Cache plugin (16 tests) ✅
│   ├── callout.test.ts     # Callout component (16 tests) ⏭️ SKIPPED
│   ├── code-block.test.ts  # Code highlighting (16 tests) ✅
│   ├── component-registry.test.ts  # Component registry (16 tests) ✅
│   ├── markdown.test.ts    # Markdown parsing (12 tests) ✅
│   ├── markdown-loader.test.ts  # Pre-parsed content (9 tests) ✅
│   ├── playground.test.ts  # Code playground (5 tests) ✅
│   ├── router.test.ts      # Routing (16 tests) ✅
│   ├── search.test.ts      # Search functionality (15 tests) ✅
│   ├── setup.test.ts       # Test environment (2 tests) ✅
│   ├── sidebar.test.ts     # Navigation sidebar (14 tests) ✅
│   ├── static-export.test.ts  # HTML export (15 tests) ✅
│   ├── theme.test.ts       # Theme switching (24 tests) ✅
│   └── versioning.test.ts  # Version management (20 tests) ✅
├── integration/            # Integration tests (future)
├── property/               # Property-based tests (future)
├── setup.ts               # Test environment setup
├── README.md              # This file
└── SKIPPED_TESTS.md       # Documentation for skipped tests
```

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Specific Test File

```bash
npm test cache.test.ts
npm test code-block.test.ts
```

### With Coverage

```bash
npm run test:coverage
```

## Test Categories

### Unit Tests (180 passing)

Test individual plugins and components in isolation:

- **Plugin Initialization** - Verify plugins register correctly
- **Action Registration** - Test action handlers
- **Event Emission** - Validate event system
- **Component Registration** - Check component registry
- **Error Handling** - Test error scenarios

### Skipped Tests (16 skipped)

See [SKIPPED_TESTS.md](./SKIPPED_TESTS.md) for details on:
- Why tests are skipped
- How to enable them in the future
- Alternative testing approaches

## Test Environment

### Configuration

- **Test Runner:** Vitest
- **Environment:** jsdom (browser-like)
- **Globals:** Enabled (describe, it, expect)
- **Setup File:** `tests/setup.ts`

### Mocks

The test environment includes:
- **localStorage** - Mocked for theme persistence tests
- **fetch** - Mocked for markdown loading tests
- **RuntimeContext** - Mock implementation for plugin tests

## Writing Tests

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { createMyPlugin } from '../../src/plugins/my-plugin.js';

describe('My Plugin', () => {
  let runtime: Runtime;
  
  beforeEach(async () => {
    runtime = new Runtime();
    runtime.registerPlugin(createMyPlugin());
    await runtime.initialize();
  });
  
  it('should register actions', () => {
    const context = runtime.getContext();
    const action = context.actions.getAction('my:action');
    expect(action).toBeDefined();
  });
});
```

### Best Practices

✅ **Do:**
- Test public APIs and behavior
- Use descriptive test names
- Test error scenarios
- Clean up after tests (beforeEach/afterEach)
- Test integration between plugins

❌ **Don't:**
- Test implementation details
- Test third-party libraries
- Write brittle tests that break on refactoring
- Test React component internals directly

## Plugin Testing Patterns

### 1. Plugin Registration

```typescript
it('should have correct plugin metadata', () => {
  const plugin = createMyPlugin();
  expect(plugin.name).toBe('my-plugin');
  expect(plugin.version).toBe('1.0.0');
});
```

### 2. Action Registration

```typescript
it('should register actions', async () => {
  const runtime = new Runtime();
  runtime.registerPlugin(createMyPlugin());
  await runtime.initialize();
  
  const context = runtime.getContext();
  const action = context.actions.getAction('my:action');
  expect(action).toBeDefined();
});
```

### 3. Action Execution

```typescript
it('should execute action successfully', async () => {
  const runtime = new Runtime();
  runtime.registerPlugin(createMyPlugin());
  await runtime.initialize();
  
  const context = runtime.getContext();
  const result = await context.actions.runAction('my:action', { param: 'value' });
  expect(result).toBeDefined();
});
```

### 4. Event Emission

```typescript
it('should emit events', async () => {
  const runtime = new Runtime();
  runtime.registerPlugin(createMyPlugin());
  await runtime.initialize();
  
  const context = runtime.getContext();
  const eventSpy = vi.fn();
  
  context.events.on('my:event', eventSpy);
  await context.actions.runAction('my:action');
  
  expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
    data: 'value'
  }));
});
```

### 5. Error Handling

```typescript
it('should handle errors gracefully', async () => {
  const runtime = new Runtime();
  runtime.registerPlugin(createMyPlugin());
  await runtime.initialize();
  
  const context = runtime.getContext();
  
  await expect(
    context.actions.runAction('my:action', { invalid: true })
  ).rejects.toThrow('Invalid parameter');
});
```

## Debugging Tests

### Run Single Test

```bash
npm test -- -t "should register actions"
```

### Verbose Output

```bash
npm test -- --reporter=verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

## Common Issues

### Issue: Tests timeout

**Solution:** Increase timeout in test:

```typescript
it('should complete long operation', async () => {
  // ... test code
}, 10000); // 10 second timeout
```

### Issue: localStorage not defined

**Solution:** Already handled in `tests/setup.ts`, but ensure setup file is loaded.

### Issue: Module not found

**Solution:** Check import paths use `.js` extension (ESM requirement):

```typescript
// ✅ Correct
import { plugin } from './plugin.js';

// ❌ Wrong
import { plugin } from './plugin';
```

## Future Enhancements

### Integration Tests

Add tests that verify multiple plugins working together:

```typescript
describe('Markdown + Search Integration', () => {
  it('should index markdown pages for search', async () => {
    // Test markdown plugin + search plugin integration
  });
});
```

### Property-Based Tests

Add property-based tests using fast-check:

```typescript
import fc from 'fast-check';

it('should handle any valid markdown input', () => {
  fc.assert(
    fc.property(fc.string(), (markdown) => {
      // Test with random markdown strings
    })
  );
});
```

### E2E Tests

Add end-to-end tests using Playwright:

```typescript
test('user can search and navigate', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="search"]', 'getting started');
  await page.click('text=Getting Started');
  await expect(page).toHaveURL('/getting-started');
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Skeleton Crew Runtime Tests](../../tests/) - Core runtime tests
- [SKIPPED_TESTS.md](./SKIPPED_TESTS.md) - Skipped test documentation

## Questions?

For questions about:
- **Skipped tests** → See [SKIPPED_TESTS.md](./SKIPPED_TESTS.md)
- **Test failures** → Check test output and error messages
- **Adding new tests** → Follow patterns in existing test files
- **Test environment** → See `tests/setup.ts` and `vite.config.ts`

---

**Last Updated:** November 26, 2025  
**Test Status:** ✅ 180/196 passing (91.8%)
