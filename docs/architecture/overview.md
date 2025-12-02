PROJECT_OVERVIEW:

The Skeleton Crew Runtime is a minimal, plugin-based application runtime that defines three core subsystems and one optional subsystem. The runtime enables the construction of internal tools and modular applications through declarative screen definitions, action execution, and plugin extensions. The system operates without assuming any specific UI framework.

CORE SUBSYSTEMS:
1. Screen Registry:
   - Stores screen definitions.
   - Provides screen lookup by identifier.
   - Supports screen metadata and component references.

2. Action Engine:
   - Stores action definitions.
   - Executes action handlers.
   - Routes parameters into handlers and returns handler results.

3. Plugin System:
   - Registers plugin definitions.
   - Allows plugins to contribute screens, actions, or runtime behavior.
   - Does not impose any UI requirements on plugin authors.

OPTIONAL SUBSYSTEM:
4. UI Bridge (Optional Layer):
   - Exposes an abstract UIProvider interface.
   - Allows UI renderers (React, Vue, CLI, etc.) to be integrated as plugins.
   - Enables screen rendering only when a UI plugin is present.
   - The runtime remains fully functional without a UI plugin.

GENERAL PROPERTIES:
- The runtime contains no built-in UI.
- The runtime does not enforce routing, state management, styling, or layout.
- The runtime executes without assuming browser or DOM availability.
- UI plugins may implement rendering for any framework.
- Plugins may also implement non-UI features such as data providers, logging, background jobs, and utilities.

PRIMARY GOAL:
Provide an extensible but minimal set of runtime primitives (screens, actions, plugins) that can be combined to form basic internal tools or serve as the foundation for more complex application frameworks.

NON-GOALS:
- No built-in navigation system.
- No built-in theming or styling.
- No opinionated data layer.
- No UI component library inside the core.
- No dependency on React, Vue, or any UI platform.

OUTPUT:
A minimal, UI-agnostic runtime suitable for plugin-driven internal tools, with optional UI layers implemented externally as plugins.
