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
│   ├── ui-bridge.ts       # Optional UI subsystem
│   └── *.test.ts          # Test files (colocated)
├── dist/                   # Compiled output (generated)
└── .kiro/                  # Kiro configuration
    ├── specs/             # Feature specifications
    └── steering/          # AI assistant guidance
```

## Architecture Patterns

### Subsystem Organization

Each subsystem follows a consistent pattern:
- Implementation file: `<subsystem>.ts`
- Test file: `<subsystem>.test.ts`
- Exports through `index.ts`

### Core Subsystems

1. **PluginRegistry**: Manages plugin registration and lifecycle
2. **ScreenRegistry**: Stores and retrieves screen definitions
3. **ActionEngine**: Registers and executes actions
4. **EventBus**: Pub/sub event system
5. **UIBridge**: Optional UI provider integration

### Initialization Sequence

The Runtime follows a strict initialization order:
1. Create PluginRegistry
2. Create ScreenRegistry
3. Create ActionEngine
4. Create EventBus
5. Create UIBridge
6. Create RuntimeContext
7. Execute plugin setup callbacks

### Type System

- All core types defined in `types.ts`
- Interfaces for extensibility (PluginDefinition, ScreenDefinition, ActionDefinition, UIProvider)
- RuntimeContext provides unified API to all subsystems

## Code Conventions

- Use explicit return types on public methods
- Include JSDoc comments with requirement references
- Throw descriptive errors for invalid states
- Make lifecycle methods idempotent where appropriate
- Use `.js` extensions in all imports (ESM requirement)
