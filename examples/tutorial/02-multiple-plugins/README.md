# Step 2: Multiple Plugins

Add filter and stats plugins that work alongside the task plugin.

## Learning Goals

- Compose multiple plugins together
- Share data between plugins (direct access pattern)
- Register multiple screens
- Navigate between screens

## What We're Adding

Two new plugins:
1. **Filter Plugin** - View tasks by status (all/active/completed)
2. **Stats Plugin** - Display task statistics (total, completed, completion rate)

## Code Structure

```
02-multiple-plugins/
├── index.ts              # Runtime with 3 plugins
├── plugins/
│   ├── tasks.ts          # Task management (from step 1)
│   ├── filters.ts        # NEW: Task filtering
│   └── stats.ts          # NEW: Task statistics
└── ui/
    └── terminal-ui.ts    # Enhanced UI with screen navigation
```

## Step-by-Step Guide

### 1. Create the Filter Plugin

The filter plugin provides different views of the task list.

```typescript
// plugins/filters.ts
import { PluginDefinition, RuntimeContext } from '../../../../src/types.js';
import { getTasks, Task } from './tasks.js';

export type FilterType = 'all' | 'active' | 'completed';

let currentFilter: FilterType = 'all';

export const filtersPlugin: PluginDefinition = {
  name: 'filters',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // Register filter screen
    context.screens.registerScreen({
      id: 'filters',
      title: 'Task Filters',
      component: 'FiltersScreen'
    });
    
    // Register set-filter action
    context.actions.registerAction({
      id: 'set-filter',
      handler: (params: { filter: FilterType }) => {
        currentFilter = params.filter;
        return currentFilter;
      }
    });
    
    // Register get-filtered-tasks action
    context.actions.registerAction({
      id: 'get-filtered-tasks',
      handler: () => {
        const tasks = getTasks();
        
        switch (currentFilter) {
          case 'active':
            return tasks.filter(t => !t.completed);
          case 'completed':
            return tasks.filter(t => t.completed);
          default:
            return tasks;
        }
      }
    });
  }
};

export function getCurrentFilter(): FilterType {
  return currentFilter;
}
```

### 2. Create the Stats Plugin

The stats plugin calculates and displays task statistics.

```typescript
// plugins/stats.ts
import { PluginDefinition, RuntimeContext } from '../../../../src/types.js';
import { getTasks } from './tasks.js';

interface TaskStats {
  total: number;
  completed: number;
  active: number;
  completionRate: number;
}

export const statsPlugin: PluginDefinition = {
  name: 'stats',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // Register stats screen
    context.screens.registerScreen({
      id: 'stats',
      title: 'Task Statistics',
      component: 'StatsScreen'
    });
    
    // Register get-stats action
    context.actions.registerAction({
      id: 'get-stats',
      handler: (): TaskStats => {
        const tasks = getTasks();
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const active = total - completed;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;
        
        return {
          total,
          completed,
          active,
          completionRate
        };
      }
    });
  }
};
```

### 3. Update Runtime Setup

Register all three plugins.

```typescript
// index.ts
import { Runtime } from '../../../src/runtime.js';
import { tasksPlugin } from './plugins/tasks.js';
import { filtersPlugin } from './plugins/filters.js';
import { statsPlugin } from './plugins/stats.js';
import { terminalUI } from './ui/terminal-ui.js';

async function main() {
  console.log('[Tutorial 02] Initializing runtime with multiple plugins...\n');
  
  const runtime = new Runtime();
  
  // Register all plugins
  runtime.registerPlugin(tasksPlugin);
  runtime.registerPlugin(filtersPlugin);
  runtime.registerPlugin(statsPlugin);
  
  await runtime.initialize();
  
  const context = runtime.getContext();
  
  await terminalUI.mount(null, context);
}

main().catch(console.error);
```

### 4. Enhance Terminal UI

Add screen navigation and new views.

```typescript
// ui/terminal-ui.ts (key additions)
const showScreenMenu = (): void => {
  console.log('\n=== Screens ===');
  console.log('  1. Tasks');
  console.log('  2. Filters');
  console.log('  3. Stats');
  console.log('  x. Exit\n');
};

const showFiltersScreen = async (): Promise<void> => {
  const currentFilter = getCurrentFilter();
  const tasks = await context.actions.executeAction('get-filtered-tasks', {});
  
  console.log('\n=== Task Filters ===');
  console.log(`Current filter: ${currentFilter}\n`);
  
  if (tasks.length === 0) {
    console.log('No tasks match this filter.\n');
  } else {
    tasks.forEach(task => {
      const status = task.completed ? '✓' : ' ';
      console.log(`  [${status}] ${task.text}`);
    });
  }
  
  console.log('\nCommands:');
  console.log('  a - Show all tasks');
  console.log('  c - Show completed tasks');
  console.log('  t - Show active tasks');
  console.log('  b - Back to menu\n');
};

const showStatsScreen = async (): Promise<void> => {
  const stats = await context.actions.executeAction('get-stats', {});
  
  console.log('\n=== Task Statistics ===');
  console.log(`Total tasks:      ${stats.total}`);
  console.log(`Completed:        ${stats.completed}`);
  console.log(`Active:           ${stats.active}`);
  console.log(`Completion rate:  ${stats.completionRate.toFixed(1)}%\n`);
  
  console.log('Commands:');
  console.log('  b - Back to menu\n');
};
```

## Running the Example

```bash
npm run build
npm run tutorial:02
```

## Try It Out

```
[Tutorial 02] Initializing runtime with multiple plugins...

=== Screens ===
  1. Tasks
  2. Filters
  3. Stats
  x. Exit

> 1

=== Task Manager ===
Commands:
  a <text> - Add task
  l        - List tasks
  c <id>   - Complete task
  b        - Back to menu

> a Buy groceries
✓ Task added

> a Write docs
✓ Task added

> b

=== Screens ===
  1. Tasks
  2. Filters
  3. Stats
  x. Exit

> 3

=== Task Statistics ===
Total tasks:      2
Completed:        0
Active:           2
Completion rate:  0.0%

Commands:
  b - Back to menu

> b

> 2

=== Task Filters ===
Current filter: all

  [ ] Buy groceries
  [ ] Write docs

Commands:
  a - Show all tasks
  c - Show completed tasks
  t - Show active tasks
  b - Back to menu

> t

Current filter: active

  [ ] Buy groceries
  [ ] Write docs
```

## Key Takeaways

1. **Plugins compose naturally** - Each plugin is independent but works together
2. **Direct data access** - Filters and stats read tasks directly via exported functions
3. **Multiple screens** - Each plugin can register its own screens
4. **Action-based API** - UI uses actions to interact with all plugins consistently

## What's Still Missing?

- **No automatic updates** - Stats don't update when tasks change
- **Tight coupling** - Filter and stats plugins import from tasks plugin directly
- **Manual refresh** - User must navigate away and back to see updates

These issues happen because plugins communicate through direct imports, not events.

**Next:** [Step 3: Event Communication](../03-event-communication/) - Decouple plugins with events →
