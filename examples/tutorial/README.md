# Task Manager Tutorial

Learn Skeleton Crew Runtime by building a complete task management application from scratch.

## What You'll Build

A fully functional task manager with:
- Add, complete, and delete tasks
- Filter tasks (all/active/completed)
- Statistics dashboard
- Event-driven updates across plugins
- Swappable UI (terminal → React)

## Prerequisites

- Basic TypeScript knowledge
- Understanding of async/await
- Familiarity with plugin architectures (helpful but not required)

## Tutorial Structure

Each step builds on the previous, introducing new concepts progressively:

### [Step 1: Basic Runtime + Task Plugin](./01-basic-task-plugin/)
**Time**: ~10 minutes  
**Concepts**: Runtime initialization, plugin structure, actions, basic state

Build a minimal task manager with add/list functionality.

### [Step 2: Multiple Plugins](./02-multiple-plugins/)
**Time**: ~10 minutes  
**Concepts**: Plugin composition, screen registry, multiple features

Add filter and stats plugins that work alongside the task plugin.

### [Step 3: Event Communication](./03-event-communication/)
**Time**: ~10 minutes  
**Concepts**: Event bus, cross-plugin communication, loose coupling

Connect plugins through events so they react to each other's changes.

### [Step 4: UI Provider Swap](./04-ui-provider-swap/)
**Time**: ~15 minutes  
**Concepts**: UI abstraction, provider pattern, framework independence

Replace terminal UI with React while keeping all plugins unchanged.

### [Step 5: Build Your Own Plugin](./05-custom-plugin/)
**Time**: ~15 minutes  
**Concepts**: Plugin development, extending the runtime, best practices

Create a custom plugin (tags, priorities, or due dates) from scratch.

## Quick Start

```bash
# Build the runtime
npm run build

# Run tutorial step 1 (currently implemented)
npm run tutorial:01

# Additional steps coming soon:
# npm run tutorial:02
# npm run tutorial:03
# npm run tutorial:04
# npm run tutorial:05
```

## Implementation Status

- ✅ **Step 1: Basic Task Plugin** - Fully implemented and working
- 📝 **Step 2: Multiple Plugins** - Documentation complete, code pending
- 📝 **Step 3: Event Communication** - Documentation complete, code pending
- 📝 **Step 4: UI Provider Swap** - Documentation complete, code pending
- 📝 **Step 5: Build Your Own Plugin** - Documentation complete, code pending

## Learning Path

**New to Skeleton Crew?** Follow this path:

1. Read the [main README](../../README.md) for architecture overview
2. Review [focused examples](../README.md) (01-05) for individual concepts
3. Complete this tutorial for full application development
4. Explore the [playground example](../index.ts) for advanced patterns

## What Makes This Tutorial Different

- **Progressive complexity** - Each step adds one new concept
- **Working code at every step** - No broken intermediate states
- **Real-world patterns** - Techniques you'll use in production
- **Clear diffs** - See exactly what changed between steps
- **Runnable examples** - Test each step immediately

## Tutorial Goals

By the end, you'll understand:
- How to structure plugin-based applications
- When to use actions vs events
- How to keep plugins loosely coupled
- How to make your app UI-agnostic
- Best practices for plugin development

## Getting Help

- Check the [API documentation](../../docs/api/API.md)
- Review [existing plugins](../plugins/) for patterns
- Run tests to see expected behavior: `npm test`

---

**Ready?** Start with [Step 1: Basic Task Plugin](./01-basic-task-plugin/) →

---

**Note:** Step 1 is fully implemented and working. Steps 2-5 have complete documentation with code examples, but the actual implementation files need to be created. See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for details.
