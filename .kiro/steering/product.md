# Product Overview

Skeleton Crew Runtime is a minimal, plugin-based application runtime for building internal tools and modular applications.

## Core Concept

The runtime provides three core subsystems (Screen Registry, Action Engine, Plugin System) and one optional subsystem (UI Bridge) that work together to enable extensible, plugin-driven applications without imposing UI framework requirements.

## Core Subsystems

1. **Screen Registry**: Stores screen definitions, provides screen lookup by identifier, supports screen metadata and component references
2. **Action Engine**: Stores action definitions, executes action handlers, routes parameters into handlers and returns results
3. **Plugin System**: Registers plugin definitions, allows plugins to contribute screens/actions/runtime behavior, no UI requirements on plugin authors

## Optional Subsystem

4. **UI Bridge**: Exposes abstract UIProvider interface, allows UI renderers (React, Vue, CLI, etc.) to be integrated as plugins, enables screen rendering only when UI plugin is present, runtime remains fully functional without UI plugin

## Key Principles

- **UI-Agnostic**: No built-in UI, no framework dependencies (React, Vue, etc.)
- **Plugin-Driven**: All functionality extends through plugins (including UI, data providers, logging, background jobs, utilities)
- **Minimal Core**: Only essential primitives (screens, actions, plugins, events)
- **Environment-Neutral**: Works in browser, Node.js, or any JavaScript runtime (no DOM/browser assumptions)

## Primary Goal

Provide an extensible but minimal set of runtime primitives (screens, actions, plugins) that can be combined to form basic internal tools or serve as the foundation for more complex application frameworks.

## Non-Goals (What the Core Runtime Does NOT Include)

- No built-in navigation system
- No built-in routing
- No built-in state management
- No theming or styling systems
- No layout systems
- No opinionated data layer
- No UI component library in the core
- No dependency on React, Vue, or any UI platform

## Plugin Capabilities

Plugins can implement:
- UI rendering for any framework (React, Vue, CLI, etc.)
- Non-UI features (data providers, logging, background jobs, utilities)
- Screen contributions
- Action contributions
- Runtime behavior extensions
