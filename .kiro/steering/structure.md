# Project Structure

## Directory Layout

```
skeleton-crew-runtime/
├── src/                    # Source code
│   ├── types.ts           # Core type definitions and interfaces
│   ├── index.ts           # Public API exports
│   ├── runtime.ts         # Main Runtime orchestrator
│   ├── runtime-context.ts # RuntimeContext implementation
│   ├── plugin-registry.ts # Plugin subsystem
│   ├── screen-registry.ts # Screen subsystem
│   ├── action-engine.ts   # Action subsystem
│   ├── event-bus.ts       # Event subsystem
│   └── ui-bridge.ts       # Optional UI subsystem
├── tests/                  # Test files
│   ├── action-engine.test.ts
│   ├── cross-subsystem.test.ts
│   ├── environment.test.ts
│   ├── error-scenarios.test.ts
│   ├── event-bus.test.ts
│   ├── instance-isolation.test.ts
│   ├── mlp-completeness.test.ts
│   ├── plugin-capabilities.test.ts
│   ├── plugin-registry.test.ts
│   ├── runtime.test.ts
│   ├── screen-registry.test.ts
│   └── ui-bridge.test.ts
├── dist/                   # Compiled output (generated)
└── .kiro/                  # Kiro configuration
    ├── specs/             # Feature specifications
    └── steering/          # AI assistant guidance
```

## Architecture Patterns

### Subsystem Organization

Each subsystem follows a consistent pattern:
- Implementation file: `src/<subsystem>.ts`
- Test file: `tests/<subsystem>.test.ts`
- Exports through `src/index.ts`

### Core Subsystems (Required)

1. **PluginRegistry** (`plugin-registry.ts`): Manages plugin registration and lifecycle
2. **ScreenRegistry** (`screen-registry.ts`): Stores and retrieves screen definitions
3. **ActionEngine** (`action-engine.ts`): Registers and executes actions
4. **EventBus** (`event-bus.ts`): Pub/sub event system for cross-subsystem communication

### Optional Subsystem

5. **UIBridge** (`ui-bridge.ts`): Optional UI provider integration layer

### Orchestration

- **Runtime** (`runtime.ts`): Main orchestrator that initializes and coordinates all subsystems
- **RuntimeContext** (`runtime-context.ts`): Unified API that provides access to all subsystems

### Initialization Sequence

The Runtime follows a strict initialization order:
1. Create PluginRegistry
2. Create ScreenRegistry
3. Create ActionEngine
4. Create EventBus
5. Create UIBridge
6. Create RuntimeContext (provides unified access to all subsystems)
7. Execute plugin setup callbacks (plugins can now interact with runtime)

### Type System

- All core types defined in `types.ts`
- Interfaces for extensibility:
  - `PluginDefinition`: Define plugins that extend runtime
  - `ScreenDefinition`: Define declarative screens
  - `ActionDefinition`: Define executable actions
  - `UIProvider`: Define UI rendering implementations
  - `EventHandler`: Define event subscribers
- RuntimeContext provides unified API to all subsystems for plugin authors

## Code Conventions

- Use explicit return types on public methods
- Include JSDoc comments with requirement references
- Throw descriptive errors for invalid states
- Make lifecycle methods idempotent where appropriate
- Use `.js` extensions in all imports (ESM requirement)
