# Testing Guide

## Running Tests

### Root Project Tests

Run tests for the core Skeleton Crew Runtime:

```bash
npm test
```

This runs all tests in the `tests/` directory (unit, integration, and property tests).

### Demo Application Tests

Each demo has its own test suite and should be tested independently:

#### Documentation Engine Demo

```bash
cd demo/documentation-engine
npm test
```

#### Tab Manager Demo

```bash
cd demo/tab-manager
npm test
```

## Why Separate Test Commands?

- **Root tests**: Test the core runtime with no external dependencies
- **Demo tests**: Require browser-specific mocks (jsdom, chrome APIs) that shouldn't pollute the root environment
- Each demo has its own `vitest.config.ts` with appropriate environment setup

## Test Categories

### Root Tests
- `tests/unit/` - Unit tests for individual subsystems
- `tests/integration/` - Cross-subsystem integration tests  
- `tests/property/` - Property-based tests using fast-check

### Demo Tests
- `demo/*/tests/unit/` - Demo-specific unit tests
- `demo/*/tests/integration/` - Demo-specific integration tests
- `demo/*/tests/property/` - Demo-specific property tests
