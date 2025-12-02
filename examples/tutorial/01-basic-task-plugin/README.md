# Step 1: Basic Runtime + Task Plugin

Build a minimal task manager with add/list functionality.

## Learning Goals

- Understand Runtime initialization
- Create a basic plugin structure
- Register and execute actions
- Manage plugin state

## What We're Building

A simple task manager that can:
- Add new tasks
- List all tasks
- Mark tasks as complete

## Code Structure

```
01-basic-task-plugin/
├── index.ts              # Runtime setup and initialization
├── plugins/
│   └── tasks.ts          # Task management plugin
└── ui/
    └── terminal-ui.ts    # Simple terminal interface
```

## Step-by-Step Guide

### 1. Create the Task Plugin

The task plugin manages a list of tasks and provides actions to manipulate them.

**Key concepts:**
- Plugin definition with `name`, `version`, and `setup()`
- State management within the plugin
- Action registration with handlers
- Screen registration for UI

```typescript
// plugins/tasks.ts
interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

let tasks: Task[] = [];

export const tasksPlugin: PluginDefinition = {
  name: 'tasks',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // Register the tasks screen
    context.screens.registerScreen({
      id: 'tasks',
      title: 'Task Manager',
      component: 'TasksScreen'
    });
    
    // Register actions
    context.actions.registerAction({
      id: 'add-task',
      handler: (params: { text: string }) => {
        const task: Task = {
          id: crypto.randomUUID(),
          text: params.text,
          completed: false,
          createdAt: new Date()
        };
        tasks.push(task);
        return task;
      }
    });
    
    context.actions.registerAction({
      id: 'complete-task',
      handler: (params: { id: string }) => {
        const task = tasks.find(t => t.id === params.id);
        if (task) {
          task.completed = true;
        }
        return task;
      }
    });
    
    context.actions.registerAction({
      id: 'list-tasks',
      handler: () => {
        return tasks;
      }
    });
  },
  
  dispose(): void {
    tasks = [];
  }
};

// Export for UI access
export function getTasks(): Task[] {
  return tasks;
}
```

### 2. Create the Runtime Setup

Initialize the runtime and register the plugin.

```typescript
// index.ts
import { Runtime } from '../../src/runtime.js';
import { tasksPlugin } from './plugins/tasks.js';
import { terminalUI } from './ui/terminal-ui.js';

async function main() {
  // Create runtime instance
  const runtime = new Runtime();
  
  // Register plugin BEFORE initialization
  runtime.registerPlugin(tasksPlugin);
  
  // Initialize runtime (executes plugin setup)
  await runtime.initialize();
  
  // Get context for UI
  const context = runtime.getContext();
  
  // Start terminal UI
  await terminalUI.mount(null, context);
}

main().catch(console.error);
```

### 3. Create the Terminal UI

A simple terminal interface to interact with tasks.

```typescript
// ui/terminal-ui.ts
import * as readline from 'readline';
import { RuntimeContext } from '../../../src/types.js';
import { getTasks } from '../plugins/tasks.js';

export const terminalUI = {
  async mount(target: unknown, context: RuntimeContext): Promise<void> {
    console.log('=== Task Manager ===\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const showMenu = () => {
      console.log('\nCommands:');
      console.log('  a <text> - Add task');
      console.log('  l        - List tasks');
      console.log('  c <id>   - Complete task');
      console.log('  x        - Exit\n');
    };
    
    const listTasks = () => {
      const tasks = getTasks();
      if (tasks.length === 0) {
        console.log('No tasks yet!\n');
        return;
      }
      
      console.log('\nYour Tasks:');
      tasks.forEach(task => {
        const status = task.completed ? '✓' : ' ';
        console.log(`  [${status}] ${task.text} (${task.id.slice(0, 8)})`);
      });
      console.log('');
    };
    
    showMenu();
    
    rl.on('line', async (input) => {
      const [cmd, ...args] = input.trim().split(' ');
      
      switch (cmd) {
        case 'a':
          if (args.length === 0) {
            console.log('Usage: a <task text>');
            break;
          }
          await context.actions.executeAction('add-task', { 
            text: args.join(' ') 
          });
          console.log('✓ Task added');
          break;
          
        case 'l':
          listTasks();
          break;
          
        case 'c':
          if (args.length === 0) {
            console.log('Usage: c <task id>');
            break;
          }
          await context.actions.executeAction('complete-task', { 
            id: args[0] 
          });
          console.log('✓ Task completed');
          break;
          
        case 'x':
          console.log('Goodbye!');
          rl.close();
          process.exit(0);
          break;
          
        default:
          showMenu();
      }
    });
  }
};
```

## Running the Example

```bash
npm run build
npm run tutorial:01
```

## Try It Out

```
=== Task Manager ===

Commands:
  a <text> - Add task
  l        - List tasks
  c <id>   - Complete task
  x        - Exit

> a Buy groceries
✓ Task added

> a Write documentation
✓ Task added

> l

Your Tasks:
  [ ] Buy groceries (a1b2c3d4)
  [ ] Write documentation (e5f6g7h8)

> c a1b2c3d4
✓ Task completed

> l

Your Tasks:
  [✓] Buy groceries (a1b2c3d4)
  [ ] Write documentation (e5f6g7h8)
```

## Key Takeaways

1. **Plugins are self-contained** - All task logic lives in the plugin
2. **Actions are the API** - UI interacts through actions, not direct function calls
3. **State is private** - Only the plugin manages its state
4. **Setup happens once** - Plugin `setup()` runs during `runtime.initialize()`

## What's Missing?

- No way to filter tasks (all/active/completed)
- No statistics about task completion
- Plugins can't communicate with each other
- UI is tightly coupled to task plugin

**Next:** [Step 2: Multiple Plugins](../02-multiple-plugins/) - Add filter and stats plugins →
