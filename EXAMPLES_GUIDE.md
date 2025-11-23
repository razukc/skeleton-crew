# Skeleton Crew Runtime - Examples Guide

This guide helps you learn Skeleton Crew Runtime through focused, minimal examples.

## Philosophy

Each example demonstrates **one core feature** in isolation. This approach:

- Reduces cognitive load
- Makes concepts crystal clear
- Allows focused experimentation
- Builds understanding incrementally

## Getting Started

```bash
# 1. Build the runtime
npm run build

# 2. Run the first example
npm run example:01
```

## The Five Core Features

### 1. Plugin System (`example:01`)

**What**: Plugin registration and lifecycle management

**Key Concepts**:
- Plugins are registered before initialization
- `setup()` is called during initialization
- `dispose()` is called during shutdown
- Multiple plugins can coexist

**Run**: `npm run example:01`

---

### 2. Screen Registry (`example:02`)

**What**: Declarative screen definitions

**Key Concepts**:
- Screens are data structures (not UI components)
- Each screen has an ID, title, and component reference
- Screens can include custom metadata
- Any UI provider can render screens

**Run**: `npm run example:02`

---

### 3. Action Engine (`example:03`)

**What**: Executable operations with handlers

**Key Concepts**:
- Actions encapsulate business logic
- Actions can accept typed parameters
- Actions can return values (sync or async)
- Actions are triggered via `runAction()`

**Run**: `npm run example:03`

---

### 4. Event Bus (`example:04`)

**What**: Pub/sub event system for cross-plugin communication

**Key Concepts**:
- Events enable loose coupling
- Multiple subscribers can listen to the same event
- Events carry data payloads
- Plugins don't need direct references to each other

**Run**: `npm run example:04`

---

### 5. Runtime Context (`example:05`)

**What**: Unified API for accessing all subsystems

**Key Concepts**:
- RuntimeContext is passed to every plugin's `setup()`
- Provides access to: screens, actions, events, plugins
- Single API surface simplifies plugin development
- Context provides access to runtime instance

**Run**: `npm run example:05`

---

## Full Integration Example

After understanding each feature, see them work together:

```bash
npm run example
```

This runs a complete terminal-based application with:
- Multiple plugins (counter, settings, home)
- Screen navigation
- Action execution
- Event-driven updates
- Terminal UI provider

## Example Structure

```
example/
├── 01-plugin-system/       # Plugin basics
├── 02-screen-registry/     # Screen registration
├── 03-action-engine/       # Action execution
├── 04-event-bus/           # Event communication
├── 05-runtime-context/     # Unified API
├── plugins/                # Full example plugins
├── ui/                     # Terminal UI provider
├── index.ts                # Full example entry
├── EXAMPLES.md             # Detailed guide
├── INDEX.md                # Quick reference
└── README.md               # Full playground docs
```

## Learning Path

1. **Start**: Run `example:01` through `example:05` in order
2. **Experiment**: Modify the examples to test your understanding
3. **Integrate**: Run the full example to see everything together
4. **Build**: Create your own plugin-driven application

## Next Steps

- Read the [API documentation](../API.md)
- Explore the [source code](../src/)
- Check the [project structure](../PROJECT.MD)
- Build your own plugins

---

**Happy learning! Start with `npm run example:01`**
