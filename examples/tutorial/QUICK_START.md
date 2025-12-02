# Tutorial Quick Start

Get started with the Skeleton Crew Runtime tutorial in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Basic TypeScript knowledge
- Terminal/command line familiarity

## Setup

```bash
# Clone or navigate to the skeleton-crew-runtime directory
cd skeleton-crew-runtime

# Install dependencies
npm install

# Build the project
npm run build
```

## Run Step 1

```bash
npm run tutorial:01
```

You should see:

```
[Tutorial 01] Initializing runtime...

Screen "tasks" registered successfully
Action "add-task" registered successfully
Action "complete-task" registered successfully
Action "list-tasks" registered successfully
Plugin "tasks" initialized successfully

=== Task Manager ===

Commands:
  a <text> - Add task
  l        - List tasks
  c <id>   - Complete task
  x        - Exit

>
```

## Try It Out

```bash
# Add some tasks
> a Buy groceries
✓ Task added

> a Write documentation
✓ Task added

# List tasks
> l

Your Tasks:
  [ ] Buy groceries (a1b2c3d4)
  [ ] Write documentation (e5f6g7h8)

# Complete a task (use the short ID shown)
> c a1b2c3d4
✓ Task completed

# List again to see the change
> l

Your Tasks:
  [✓] Buy groceries (a1b2c3d4)
  [ ] Write documentation (e5f6g7h8)

# Exit
> x
Goodbye!
```

## What You Just Did

1. **Initialized a Runtime** - Created and started the Skeleton Crew Runtime
2. **Registered a Plugin** - The tasks plugin added screens and actions
3. **Executed Actions** - Used `add-task`, `list-tasks`, and `complete-task` actions
4. **Managed State** - The plugin maintained task state internally

## Understanding the Code

### Runtime Setup (`index.ts`)

```typescript
const runtime = new Runtime();
runtime.registerPlugin(tasksPlugin);
await runtime.initialize();
```

This is the core pattern: create runtime → register plugins → initialize.

### Plugin Structure (`plugins/tasks.ts`)

```typescript
export const tasksPlugin: PluginDefinition = {
  name: 'tasks',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // Register screens
    context.screens.registerScreen({ ... });
    
    // Register actions
    context.actions.registerAction({ ... });
  }
};
```

Plugins are self-contained modules that extend the runtime.

### UI Provider (`ui/terminal-ui.ts`)

```typescript
export const terminalUI = {
  async mount(target: unknown, context: RuntimeContext): Promise<void> {
    // Render UI and handle user input
    // Execute actions via context.actions.runAction()
  }
};
```

UI providers handle presentation and user interaction.

## Key Concepts

**Runtime** - Orchestrates all subsystems (plugins, screens, actions, events)

**Plugins** - Self-contained modules that register functionality

**Actions** - Named handlers for app behaviors (add task, complete task, etc.)

**Screens** - Named UI surfaces that can be rendered

**RuntimeContext** - API that plugins use to interact with the runtime

## Next Steps

1. **Read the code** - Open `example/tutorial/01-basic-task-plugin/` and explore
2. **Modify it** - Try adding a "delete task" action
3. **Continue the tutorial** - Read [Step 1 README](./01-basic-task-plugin/README.md)
4. **Move to Step 2** - Learn about multiple plugins working together

## Common Issues

### "Cannot find module" error

Make sure you ran `npm run build` first. The TypeScript files need to be compiled to JavaScript.

### "Port already in use" (Step 4 only)

Step 4 uses Vite for the React UI. If port 5173 is in use, Vite will automatically try the next available port.

### Terminal not responding

Press `Ctrl+C` to exit the tutorial at any time.

## Getting Help

- Check the [main tutorial README](./README.md)
- Review the [implementation guide](./TUTORIAL_GUIDE.md)
- Read the [API documentation](../../docs/api/API.md)
- Explore the [example applications](../README.md)

---

**Ready to dive deeper?** Continue with [Step 1: Basic Task Plugin](./01-basic-task-plugin/README.md)
