# Example 05: Runtime Context

**Core Feature**: Unified RuntimeContext API

This example demonstrates how RuntimeContext provides a single, unified API for accessing all subsystems.

## What You'll Learn

- RuntimeContext as the plugin author's API
- Accessing all subsystems through context
- How context simplifies plugin development
- Context provides access to runtime instance

## Run It

```bash
npm run example:05
```

## Key Concepts

- RuntimeContext is passed to every plugin's setup()
- Provides access to: screens, actions, events, plugins
- Single API surface for plugin authors
- Simplifies plugin development by unifying subsystem access
