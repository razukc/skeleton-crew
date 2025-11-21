# Contributing to Skeleton Crew Runtime

Thank you for your interest in contributing to Skeleton Crew! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

Be respectful, constructive, and professional. We're building something useful together.

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or your preferred package manager
- Git
- A Unix-like shell (Git Bash on Windows, native terminal on macOS/Linux)

### Initial Setup

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/skeleton-crew.git
cd skeleton-crew
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/razukc/skeleton-crew.git
```

4. Install dependencies:

```bash
npm install
```

5. Build the project:

```bash
npm run build
```

6. Run tests to verify everything works:

```bash
npm test
```

## Development Workflow

### 1. Create a Feature Branch

Always work on a feature branch, never directly on `main`:

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or improvements

### 2. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run specific test file
npm test action-engine.test.ts

# Test the example app
npm run example
```

### 4. Build and Verify

```bash
# Build TypeScript
npm run build

# Verify no build errors
# Check that dist/ folder is generated correctly
```

### 5. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add screen metadata support"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

### 6. Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

### 7. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Project Structure

```
skeleton-crew/
├── src/                    # Source code
│   ├── action-engine.ts   # Action subsystem
│   ├── event-bus.ts       # Event subsystem
│   ├── index.ts           # Public API exports
│   ├── plugin-registry.ts # Plugin subsystem
│   ├── runtime-context.ts # Runtime Context
│   ├── runtime.ts         # Main Runtime orchestrator
│   ├── screen-registry.ts # Screen subsystem
│   ├── types.ts           # Core type definitions
│   └── ui-bridge.ts       # UI provider subsystem
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── property/          # Property-based tests
│   └── example/           # Example app tests
├── example/               # Example application
│   ├── index.ts          # Example entry point
│   ├── plugins/          # Example plugins
│   │   ├── core-demo.ts  # Core demo plugin
│   │   ├── counter.ts    # Counter feature plugin
│   │   └── settings.ts   # Settings feature plugin
│   ├── ui/               # Example UI provider
│   │   └── terminal-ui-provider.ts
│   └── README.md         # Example documentation
├── dist/                  # Compiled output (generated)
├── CONTRIBUTING.md        # This file
├── README.md             # Project documentation
└── package.json          # Project configuration
```

## Testing

### Test Categories

We maintain separate test categories:

1. **Unit Tests** (`tests/unit/`): Test individual components in isolation
2. **Integration Tests** (`tests/integration/`): Test subsystem interactions
3. **Property Tests** (`tests/property/`): Property-based tests using fast-check
4. **Example Tests** (`tests/example/`): Tests for the example application

### Writing Tests

#### Unit Test Example

```typescript
import { describe, it, expect } from "vitest";
import { PluginRegistry } from "../src/plugin-registry.js";

describe("PluginRegistry", () => {
  it("should register a plugin", () => {
    const registry = new PluginRegistry();
    const plugin = { name: "test", version: "1.0.0", setup: () => {} };
    
    registry.registerPlugin(plugin);
    
    expect(registry.getPlugin("test")).toBe(plugin);
  });
});
```

#### Property Test Example

```typescript
import { describe, it } from "vitest";
import * as fc from "fast-check";

describe("Plugin Registration Properties", () => {
  it("should maintain plugin isolation", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (pluginNames) => {
        // Property test logic
      }),
      { numRuns: 100 }
    );
  });
});
```

### Running Property Tests

Property tests can generate large outputs. Use these commands:

```bash
# Capture output to file
npm test property-tests.test.ts > output.txt 2>&1

# Check results
tail -n 25 output.txt

# Run specific property test
npm test property-tests.test.ts -t "specific test name"
```

### Test Requirements

- All new features must include tests
- Bug fixes should include regression tests
- Aim for high code coverage (but quality over quantity)
- Tests should be clear and maintainable

## Coding Standards

### TypeScript Guidelines

1. **Use Strict Mode**: All code must pass TypeScript strict checks
2. **Explicit Return Types**: Always specify return types on public methods
3. **No `any`**: Avoid `any` type; use `unknown` if necessary
4. **ESM Imports**: Use `.js` extensions in imports (ESM requirement)

```typescript
// Good
import { Runtime } from "./runtime.js";

export function createRuntime(): Runtime {
  return new Runtime();
}

// Bad
import { Runtime } from "./runtime";

export function createRuntime() {
  return new Runtime();
}
```

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use double quotes for strings
- Use trailing commas in multi-line objects/arrays
- Keep lines under 100 characters when reasonable

### Documentation

- Add JSDoc comments to public APIs
- Include `@param` and `@returns` tags
- Reference requirements when applicable

```typescript
/**
 * Registers a new plugin with the runtime.
 * 
 * @param plugin - The plugin definition to register
 * @throws {Error} If plugin name is already registered
 * @requirement REQ-PLUGIN-001
 */
registerPlugin(plugin: PluginDefinition): void {
  // Implementation
}
```

### Error Handling

- Throw descriptive errors with context
- Use Error subclasses for specific error types
- Include relevant information in error messages

```typescript
if (!plugin.name) {
  throw new Error("Plugin must have a name");
}

if (this.plugins.has(plugin.name)) {
  throw new Error(`Plugin "${plugin.name}" is already registered`);
}
```

## Submitting Changes

### Pull Request Guidelines

1. **One Feature Per PR**: Keep PRs focused on a single feature or fix
2. **Clear Description**: Explain what changes you made and why
3. **Reference Issues**: Link to related issues if applicable
4. **Update Documentation**: Include doc updates in the same PR
5. **Add Tests**: Include tests for new functionality
6. **Clean History**: Squash commits if needed for clarity

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Property tests added/updated
- [ ] Example app tested

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No new warnings introduced
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, a maintainer will merge your PR
4. Your contribution will be included in the next release

## Release Process

Releases are managed by maintainers. The process includes:

1. Version bump in `package.json`
2. Update CHANGELOG.md
3. Create git tag
4. Publish to npm
5. Create GitHub release

## Areas for Contribution

### High Priority

- Additional example applications (React, Vue, CLI)
- Documentation improvements
- Performance optimizations
- Bug fixes

### Medium Priority

- Additional property-based tests
- Developer tooling improvements
- TypeScript type improvements
- Error message improvements

### Ideas Welcome

- Plugin marketplace concepts
- Developer experience enhancements
- Integration examples
- Tutorial content

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Features**: Open a GitHub Issue with the "enhancement" label
- **Security**: Email maintainers directly (see SECURITY.md if available)

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for each release
- GitHub contributors page
- Special mentions for significant contributions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Skeleton Crew Runtime! 🎉
