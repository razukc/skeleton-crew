---
title: Getting Started (v1.0)
description: Learn how to get started with Skeleton Crew v1.0
path: /v1.0/getting-started
order: 1
---

# Getting Started with Skeleton Crew v1.0

> **Note:** You are viewing documentation for version 1.0. [View latest version](/getting-started) for updated instructions.

This guide will help you create your first Skeleton Crew application.

## Installation

Install Skeleton Crew Runtime via npm:

```bash
npm install skeleton-crew-runtime@1.0.0
```

## Your First Application

Create a simple application with a single screen:

```typescript
import { Runtime } from 'skeleton-crew-runtime';

// Create runtime instance
const runtime = new Runtime();

// Define a simple plugin
const myPlugin = {
  name: 'my-first-plugin',
  version: '1.0.0',
  setup(context) {
    // Register a screen
    context.screens.registerScreen({
      id: 'home',
      title: 'Home',
      component: HomeScreen
    });
    
    // Register an action
    context.actions.registerAction({
      id: 'greet',
      handler: async (params) => {
        return `Hello, ${params.name}!`;
      }
    });
  }
};

// Register the plugin
runtime.registerPlugin(myPlugin);

// Initialize the runtime
await runtime.initialize();
```

## Basic Concepts

### Runtime Initialization

The Runtime must be initialized before use:

```typescript
const runtime = new Runtime();
await runtime.initialize();
```

### Plugin Registration

Plugins must be registered before initialization:

```typescript
runtime.registerPlugin(myPlugin);
```

### Screen Registration

Screens are registered within plugin setup:

```typescript
context.screens.registerScreen({
  id: 'screen-id',
  title: 'Screen Title',
  component: ScreenComponent
});
```

## Next Steps

- Learn about [Plugins](/v1.0/guides/plugins)
- Explore the [Runtime API](/v1.0/api/runtime)
- Build more complex applications

<Callout type="info">
  Version 1.0 provides the foundation for building plugin-driven applications.
</Callout>
