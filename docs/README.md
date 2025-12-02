# Skeleton Crew Runtime - Documentation

**Complete documentation for building plugin-driven applications with minimal boilerplate.**

---

## 🚀 Quick Start

New to Skeleton Crew? Start here:

1. **[Installation](getting-started/installation.md)** - Get up and running in 5 minutes
2. **[Your First Plugin](getting-started/your-first-plugin.md)** - Build your first plugin
3. **[Core Concepts](getting-started/core-concepts.md)** - Understand the fundamentals

**[→ Go to Getting Started](getting-started/)**

---

## 📚 Documentation Sections

### [Getting Started](getting-started/)
**Time**: 30 minutes | **Level**: Beginner

Quick start guides to get you productive fast:
- Installation and setup
- Your first plugin tutorial
- Core concepts explained
- Common patterns

### [Guides](guides/)
**Time**: 1-2 hours | **Level**: Intermediate

Practical guides for building with Skeleton Crew:
- Plugin development best practices
- Testing your plugins
- Event-driven patterns
- Migrating legacy applications

### [Use Cases](use-cases/)
**Time**: 2-3 hours | **Level**: Intermediate

Real-world examples and patterns:
- Browser extensions (65% less code)
- CLI tools (70% less code)
- Real-time applications (75% less code)
- Legacy application migration

### [Architecture](architecture/)
**Time**: 3-4 hours | **Level**: Advanced

Deep technical documentation:
- System architecture overview
- Plugin system internals
- Event bus implementation
- Runtime lifecycle management

### [API Reference](api/)
**Level**: All levels

Complete API documentation:
- TypeScript interfaces and types
- Class methods and properties
- Error handling
- Code examples

### [Migration](migration/)
**Level**: Intermediate to Advanced

Guides for migrating existing applications:
- Migration strategies
- Code examples
- Troubleshooting

### [Troubleshooting](troubleshooting/)
**Level**: All levels

Help when things go wrong:
- Common errors and solutions
- Debugging guide
- Performance tips

---

## 🎯 Learning Paths

### Path 1: Complete Beginner

**Goal**: Build your first plugin-driven application

1. Read [Installation](getting-started/installation.md) (5 min)
2. Follow [Your First Plugin](getting-started/your-first-plugin.md) (15 min)
3. Understand [Core Concepts](getting-started/core-concepts.md) (10 min)
4. Try [Plugin Development Guide](guides/plugin-development.md) (30 min)
5. Build something from [Use Cases](use-cases/) (1-2 hours)

**Total time**: ~2-3 hours

### Path 2: Experienced Developer

**Goal**: Understand architecture and build production apps

1. Skim [Core Concepts](getting-started/core-concepts.md) (5 min)
2. Read [Architecture Overview](architecture/overview.md) (20 min)
3. Study [Use Cases](use-cases/) relevant to your needs (1 hour)
4. Reference [API Documentation](api/reference.md) as needed
5. Build your application

**Total time**: ~1-2 hours

### Path 3: Legacy Migration

**Goal**: Migrate existing application to Skeleton Crew

1. Read [Core Concepts](getting-started/core-concepts.md) (10 min)
2. Study [Migration Strategies](migration/strategies.md) (30 min)
3. Review [Migration Examples](migration/examples.md) (30 min)
4. Follow [Migration Guide](guides/migration-guide.md) (1 hour)
5. Reference [Migration Troubleshooting](migration/troubleshooting.md) as needed

**Total time**: ~2-3 hours

---

## 🔗 External Resources

### Live Examples
- **[Demos](../demo/)** - Quick 30-minute demos
  - Dev Tool Launcher (CLI)
  - Real-Time Collaboration Hub
- **[Showcases](../showcase/)** - Production-ready examples
  - Tab Manager Extension
  - Documentation Engine
- **[Examples](../examples/)** - Learning materials
  - Focused feature demos
  - Complete playground app
  - Step-by-step tutorial

### Source Code
- **[Runtime Source](../src/)** - Core implementation
- **[Tests](../tests/)** - Test suite
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute

---

## 📖 Documentation by Topic

### Core Features

| Topic | Document | Level |
|-------|----------|-------|
| Plugin System | [Architecture: Plugin System](architecture/plugin-system.md) | Advanced |
| Actions | [Core Concepts](getting-started/core-concepts.md#actions) | Beginner |
| Events | [Guide: Event Patterns](guides/event-patterns.md) | Intermediate |
| Screens | [Core Concepts](getting-started/core-concepts.md#screens) | Beginner |
| Runtime | [Architecture: Runtime Lifecycle](architecture/runtime-lifecycle.md) | Advanced |

### Common Tasks

| Task | Document | Time |
|------|----------|------|
| Install Skeleton Crew | [Installation](getting-started/installation.md) | 5 min |
| Create a plugin | [Your First Plugin](getting-started/your-first-plugin.md) | 15 min |
| Test a plugin | [Testing Guide](guides/testing-plugins.md) | 30 min |
| Handle events | [Event Patterns](guides/event-patterns.md) | 20 min |
| Migrate legacy app | [Migration Guide](guides/migration-guide.md) | 1-2 hours |
| Debug issues | [Debugging Guide](troubleshooting/debugging.md) | As needed |

### Use Case Specific

| Use Case | Document | Complexity |
|----------|----------|------------|
| Browser Extension | [Browser Extensions](use-cases/browser-extensions.md) | Medium |
| CLI Tool | [CLI Tools](use-cases/cli-tools.md) | Low |
| Real-time App | [Real-time Apps](use-cases/real-time-apps.md) | Medium |
| Legacy Migration | [Legacy Migration](use-cases/legacy-migration.md) | High |

---

## 🎓 Key Concepts

### Plugin Architecture
Skeleton Crew uses a plugin-first architecture where all functionality extends through plugins. The runtime provides primitives (screens, actions, events), and plugins compose them into features.

**Learn more**: [Core Concepts](getting-started/core-concepts.md) | [Plugin System](architecture/plugin-system.md)

### Event-Driven Communication
Plugins communicate through events, enabling loose coupling. Plugins don't need to know about each other - they just emit and subscribe to events.

**Learn more**: [Event Patterns](guides/event-patterns.md) | [Event Bus](architecture/event-bus.md)

### UI-Agnostic Core
The runtime has no UI dependencies. UI providers implement the `UIProvider` interface and can use any rendering technology.

**Learn more**: [Architecture Overview](architecture/overview.md)

### Host Context Injection
Legacy applications can inject existing services into the runtime, allowing plugins to access these services without tight coupling.

**Learn more**: [Migration Guide](guides/migration-guide.md) | [Migration Strategies](migration/strategies.md)

---

## 💡 Quick Reference

### Installation
```bash
npm install skeleton-crew-runtime
```

### Basic Usage
```typescript
import { Runtime } from 'skeleton-crew-runtime';

const runtime = new Runtime();
runtime.registerPlugin(myPlugin);
await runtime.initialize();
```

### Plugin Structure
```typescript
const myPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  setup(ctx) {
    // Register screens, actions, events
  }
};
```

**Full examples**: [Your First Plugin](getting-started/your-first-plugin.md)

---

## 🆘 Need Help?

### Common Issues
- **Installation problems**: [Installation Guide](getting-started/installation.md)
- **Plugin not working**: [Common Errors](troubleshooting/common-errors.md)
- **Events not firing**: [Debugging Guide](troubleshooting/debugging.md)
- **Migration issues**: [Migration Troubleshooting](migration/troubleshooting.md)

### Get Support
- 📖 [Troubleshooting Guide](troubleshooting/)
- 🐛 [Report a Bug](https://github.com/yourusername/skeleton-crew-runtime/issues)
- 💬 [Ask Questions](https://github.com/yourusername/skeleton-crew-runtime/discussions)
- 📧 [Email Support](mailto:skeleton-crew-runtime@gmail.com)

---

## 🤝 Contributing

Want to improve the documentation?

1. Read the [Contributing Guide](../CONTRIBUTING.md)
2. Check [open documentation issues](https://github.com/yourusername/skeleton-crew-runtime/issues?q=is%3Aissue+is%3Aopen+label%3Adocumentation)
3. Submit a pull request

**Documentation follows the painkiller approach**: Problem → Solution → Proof → Metrics

---

## 📊 Documentation Stats

- **Total Guides**: 15+
- **Code Examples**: 50+
- **Use Cases**: 4 detailed
- **API Methods**: 100+ documented
- **Learning Paths**: 3 structured paths

---

**Last Updated**: Dec 2025
**Version**: 0.1.2
**Status**: Active Development

---

**Start your journey**: [Getting Started →](getting-started/)
