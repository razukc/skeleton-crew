# Skeleton Crew Runtime - Focused Examples

Each example demonstrates **one core feature** in isolation. Start with Example 01 and progress through them sequentially to build understanding.

## Quick Start

```bash
# Build the runtime first
npm run build

# Run any example
npm run example:01
npm run example:02
npm run example:03
npm run example:04
npm run example:05
```

## Example Overview

| Example | Feature | What You'll Learn |
|---------|---------|-------------------|
| **01** | Plugin System | Plugin registration, lifecycle, setup/dispose |
| **02** | Screen Registry | Screen registration, retrieval, metadata |
| **03** | Action Engine | Action registration, execution, parameters |
| **04** | Event Bus | Event emission, subscription, cross-plugin communication |
| **05** | Runtime Context | Unified API for accessing all subsystems |

## Learning Path

### 01 - Plugin System
**File**: `example/01-plugin-system/`

The foundation. Learn how plugins are registered and initialized.

```bash
npm run example:01
```

**Key Takeaway**: Plugins are the building blocks. Everything extends through plugins.

---

### 02 - Screen Registry
**File**: `example/02-screen-registry/`

Screens are declarative UI definitions. No UI framework required.

```bash
npm run example:02
```

**Key Takeaway**: Screens are data structures that any UI provider can render.

---

### 03 - Action Engine
**File**: `example/03-action-engine/`

Actions are executable operations with handlers.

```bash
npm run example:03
```

**Key Takeaway**: Actions encapsulate business logic and can be triggered from anywhere.

---

### 04 - Event Bus
**File**: `example/04-event-bus/`

Events enable loose coupling between plugins.

```bash
npm run example:04
```

**Key Takeaway**: Plugins communicate through events without direct dependencies.

---

### 05 - Runtime Context
**File**: `example/05-runtime-context/`

RuntimeContext is the unified API for plugin authors.

```bash
npm run example:05
```

**Key Takeaway**: One API surface provides access to all subsystems.

---

## Full Example

After understanding each core feature, see them work together:

```bash
npm run example
```

The full example (`example/index.ts`) demonstrates all features integrated into a complete terminal-based application.

## Next Steps

1. Run each focused example in order
2. Read the code in each example directory
3. Modify the examples to experiment
4. Run the full example to see integration
5. Build your own plugin-driven application

## Architecture Principles

These examples demonstrate:

- **UI-Agnostic**: No UI framework dependencies
- **Plugin-Driven**: All functionality through plugins
- **Minimal Core**: Only essential primitives
- **Environment-Neutral**: Works anywhere JavaScript runs

---

**Start with Example 01 and work your way through!**
