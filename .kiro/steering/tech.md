# Technology Stack

## Language & Build System

- **TypeScript 5.x** with strict mode enabled
- **ES2022** target and module format
- **ESM** (ES Modules) - all imports use `.js` extensions
- **Vitest** for testing

## Build Configuration

- Source: `src/`
- Output: `dist/`
- Generates declaration files (`.d.ts`) and source maps

## Common Commands

```bash
# Build the project
npm run build

# Run tests (single run)
npm test

# Run tests in watch mode
npm run test:watch
```

## TypeScript Configuration

- Strict type checking enabled
- No unused locals or parameters allowed
- Implicit returns not allowed
- Fallthrough cases in switch statements not allowed
- Test files (`*.test.ts`) excluded from build output

## Module System

- All imports must use `.js` extensions (ESM requirement)
- Example: `import { Runtime } from './runtime.js'`

## Testing

### Test Organization Structure

Tests should be organized by category in separate directories:

```
tests/
├── unit/                           # Unit tests for individual components
│   ├── plugin-registry.test.ts
│   ├── action-engine.test.ts
│   ├── event-bus.test.ts
│   └── runtime.test.ts
├── integration/                    # Integration tests across subsystems
│   ├── cross-subsystem.test.ts
│   └── plugin-lifecycle.test.ts
├── property/                       # Property-based tests
│   ├── plugin-registration/        # One folder per property group
│   │   └── registration.property.test.ts
│   ├── rollback-completeness/
│   │   └── rollback.property.test.ts
│   ├── event-ordering/
│   │   └── ordering.property.test.ts
│   └── state-consistency/
│       └── consistency.property.test.ts
└── e2e/                           # End-to-end tests (if applicable)
    └── full-workflow.test.ts
```

**Naming Conventions:**
- Unit tests: `<component>.test.ts`
- Integration tests: `<feature>.test.ts`
- Property tests: `<property-name>.property.test.ts` in dedicated folder
- E2E tests: `<workflow>.test.ts`

**Benefits:**
- Easier to run specific test categories
- Better organization for large test suites
- Clearer separation of concerns
- Reduced context when running property tests individually

### Test Configuration

- Use Vitest for all tests
- Tests verify requirements through property-based assertions
- Property-based tests use fast-check library
- Each property test runs minimum 100 iterations
- Tests are tagged with requirement references for traceability

### Property Test Management

Property tests generate large outputs that can overwhelm context. Follow these practices:

**Running Property Tests:**

```bash
# Always capture output to file
npm test property-tests.test.ts > propery-test-output.txt 2>&1

# Check status with minimal context
tail -25 propery-test-output.txt

# Count passes/fails
echo "Passed: $(grep -c "✓" propery-test-output.txt)"
echo "Failed: $(grep -c "×" propery-test-output.txt)"
```

**Debugging Failures:**

```bash
# Identify failing tests
grep -E "FAIL|×" propery-test-output.txt | head -20

# Extract first failure details only
grep -A 5 "FAIL" propery-test-output.txt | head -50

# Run individual failing test
npm test property-tests.test.ts -t "exact test name"

# Stop on first failure to reduce output
npm test property-tests.test.ts -- --bail=1 > output.txt 2>&1
```

**Minimal Output Options:**

```bash
# Use basic reporter for less verbose output
npm test property-tests.test.ts -- --reporter=basic > output.txt 2>&1

# Use dot reporter for minimal output
npm test property-tests.test.ts -- --reporter=dot > output.txt 2>&1
```

**Test Filtering:**

```bash
# Run specific property by number
npm test property-tests.test.ts -t "Property 1"

# Run group of related properties
npm test property-tests.test.ts -t "Plugin"

# Run range of properties
npm test property-tests.test.ts -t "Property [1-3]"
```

**Key Rules:**
- NEVER output full property test results directly to terminal
- ALWAYS write to file first, then read selectively
- Use tail/head/grep to extract relevant information
- Run individual tests with `-t` flag when debugging
- Fix one property at a time to maintain focus

**Clean up**
- Delete the temporary files created such as output  files, debug files etc after a task is completed
