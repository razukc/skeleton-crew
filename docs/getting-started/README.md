# Getting Started with Skeleton Crew Runtime

**Get up and running in 30 minutes.**

## What You'll Learn

This section will teach you:
- How to install Skeleton Crew Runtime
- How to create your first plugin
- Core concepts and patterns
- Common use cases

## Quick Navigation

| Guide | Time | Level |
|-------|------|-------|
| [Installation](installation.md) | 5 min | Beginner |
| [Your First Plugin](your-first-plugin.md) | 15 min | Beginner |
| [Core Concepts](core-concepts.md) | 10 min | Beginner |

**Total time**: ~30 minutes

## Learning Path

### 1. Installation (5 minutes)
Install Skeleton Crew Runtime and verify your setup.

**[→ Start with Installation](installation.md)**

### 2. Your First Plugin (15 minutes)
Build a simple plugin to understand the basics.

**[→ Build Your First Plugin](your-first-plugin.md)**

### 3. Core Concepts (10 minutes)
Understand the fundamental concepts: plugins, actions, events, and screens.

**[→ Learn Core Concepts](core-concepts.md)**

## What's Next?

After completing the getting started guides:

- **[Guides](../guides/)** - Dive deeper into plugin development, testing, and patterns
- **[Use Cases](../use-cases/)** - See real-world examples and applications
- **[API Reference](../api/)** - Complete API documentation
- **[Examples](../../examples/)** - Working code examples

## Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **TypeScript**: 5.x (recommended)
- **Basic JavaScript/TypeScript knowledge**

## Quick Start (TL;DR)

```bash
# Install
npm install skeleton-crew-runtime

# Create a plugin
import { Runtime } from 'skeleton-crew-runtime';

const myPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  setup(ctx) {
    ctx.actions.registerAction({
      id: 'hello',
      handler: () => 'Hello, World!'
    });
  }
};

// Use it
const runtime = new Runtime();
runtime.registerPlugin(myPlugin);
await runtime.initialize();

const result = await runtime.getContext().actions.runAction('hello');
console.log(result); // "Hello, World!"
```

**Want details?** Follow the guides above.

## Need Help?

- **Installation issues**: Check [Troubleshooting](../troubleshooting/)
- **Questions**: [GitHub Discussions](https://github.com/yourusername/skeleton-crew-runtime/discussions)
- **Bugs**: [GitHub Issues](https://github.com/yourusername/skeleton-crew-runtime/issues)

---

**Ready to start?** [→ Installation Guide](installation.md)
