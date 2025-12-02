# Example 01: Plugin System

**Core Feature**: Plugin registration and lifecycle

This minimal example demonstrates how the plugin system works in isolation.

## What You'll Learn

- How to create a plugin
- Plugin registration before initialization
- Plugin setup callback execution
- Plugin disposal on shutdown

## Run It

```bash
npm run example:01
```

## Key Concepts

- Plugins are registered BEFORE `runtime.initialize()`
- Setup callbacks execute during initialization
- Plugins can clean up resources in `dispose()`
- Multiple plugins can be registered and initialized together
