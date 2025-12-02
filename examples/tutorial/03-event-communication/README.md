# Step 3: Event Communication

Connect plugins through events so they react to each other's changes.

## Learning Goals

- Use the EventBus for cross-plugin communication
- Decouple plugins with event-driven architecture
- Subscribe to and emit events
- Understand loose coupling benefits

## What We're Changing

Transform the tightly-coupled plugins from Step 2 into loosely-coupled, event-driven plugins:

**Before (Step 2):**
- Filter plugin imports `getTasks()` directly from tasks plugin
- Stats plugin imports `getTasks()` directly from tasks plugin
- No automatic updates when tasks change

**After (Step 3):**
- Tasks plugin emits events when tasks change
- Filter and stats plugins subscribe to task events
- Automatic updates across all plugins
- No direct imports between plugins

## Code Structure

```
03-event-communication/
├── index.ts
├── plugins/
│   ├── tasks.ts          # MODIFIED: Emits events
│   ├── filters.ts        # MODIFIED: Subscribes to events
│   └── stats.ts          # MODIFIED: Subscribes to events
└── ui/
    └── terminal-ui.ts    # MODIFIED: Shows event log
```

## Step-by-Step Guide

### 1. Update Tasks Plugin to Emit Events

Emit events whenever tasks change.

```typescript
// plugins/tasks.ts (key changes)
export const tasksPlugin: PluginDefinition = {
  name: 'tasks',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // ... screen registration ...
    
    // Add task action - NOW EMITS EVENT
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
        
        // Emit event after state change
        context.events.emit('task:added', { task });
        
        return task;
      }
    });
    
    // Complete task action - NOW EMITS EVENT
    context.actions.registerAction({
      id: 'complete-task',
      handler: (params: { id: string }) => {
        const task = tasks.find(t => t.id === params.id);
        if (task) {
          task.completed = true;
          
          // Emit event after state change
          context.events.emit('task:completed', { task });
        }
        return task;
      }
    });
    
    // Delete task action - NEW + EMITS EVENT
    context.actions.registerAction({
      id: 'delete-task',
      handler: (params: { id: string }) => {
        const index = tasks.findIndex(t => t.id === params.id);
        if (index !== -1) {
          const task = tasks[index];
          tasks.splice(index, 1);
          
          // Emit event after state change
          context.events.emit('task:deleted', { task });
          
          return task;
        }
        return null;
      }
    });
  }
};
```

### 2. Update Stats Plugin to Subscribe to Events

React to task changes automatically.

```typescript
// plugins/stats.ts (key changes)
interface TaskStats {
  total: number;
  completed: number;
  active: number;
  completionRate: number;
}

let cachedStats: TaskStats = {
  total: 0,
  completed: 0,
  active: 0,
  completionRate: 0
};

export const statsPlugin: PluginDefinition = {
  name: 'stats',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // ... screen registration ...
    
    // Calculate stats helper
    const calculateStats = (): void => {
      const tasks = getTasks();
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const active = total - completed;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;
      
      cachedStats = { total, completed, active, completionRate };
    };
    
    // Subscribe to task events
    context.events.on('task:added', () => {
      calculateStats();
      console.log('[Stats] Task added - stats updated');
    });
    
    context.events.on('task:completed', () => {
      calculateStats();
      console.log('[Stats] Task completed - stats updated');
    });
    
    context.events.on('task:deleted', () => {
      calculateStats();
      console.log('[Stats] Task deleted - stats updated');
    });
    
    // Get stats action - returns cached stats
    context.actions.registerAction({
      id: 'get-stats',
      handler: (): TaskStats => {
        return cachedStats;
      }
    });
    
    // Initial calculation
    calculateStats();
  }
};
```

### 3. Update Filters Plugin to Subscribe to Events

Keep filtered view in sync with task changes.

```typescript
// plugins/filters.ts (key changes)
export const filtersPlugin: PluginDefinition = {
  name: 'filters',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // ... screen and action registration ...
    
    // Subscribe to task events to log filter updates
    context.events.on('task:added', () => {
      console.log('[Filters] Task added - filter view updated');
    });
    
    context.events.on('task:completed', () => {
      console.log('[Filters] Task completed - filter view updated');
    });
    
    context.events.on('task:deleted', () => {
      console.log('[Filters] Task deleted - filter view updated');
    });
  }
};
```

### 4. Enhance UI to Show Event Activity

Display real-time event notifications.

```typescript
// ui/terminal-ui.ts (additions)
const eventLog: string[] = [];

// Subscribe to all task events
context.events.on('task:added', (data) => {
  eventLog.push(`[EVENT] task:added - ${data.task.text}`);
});

context.events.on('task:completed', (data) => {
  eventLog.push(`[EVENT] task:completed - ${data.task.text}`);
});

context.events.on('task:deleted', (data) => {
  eventLog.push(`[EVENT] task:deleted - ${data.task.text}`);
});

// Show recent events
const showEventLog = (): void => {
  console.log('\n=== Recent Events ===');
  const recent = eventLog.slice(-5);
  if (recent.length === 0) {
    console.log('No events yet.\n');
  } else {
    recent.forEach(event => console.log(event));
    console.log('');
  }
};
```

## Running the Example

```bash
npm run build
npm run tutorial:03
```

## Try It Out

```
[Tutorial 03] Initializing runtime with event-driven plugins...

=== Screens ===
  1. Tasks
  2. Filters
  3. Stats
  4. Events
  x. Exit

> 1

=== Task Manager ===
> a Buy groceries
✓ Task added
[Stats] Task added - stats updated
[Filters] Task added - filter view updated
[EVENT] task:added - Buy groceries

> a Write docs
✓ Task added
[Stats] Task added - stats updated
[Filters] Task added - filter view updated
[EVENT] task:added - Write docs

> b

> 3

=== Task Statistics ===
Total tasks:      2
Completed:        0
Active:           2
Completion rate:  0.0%

> b

> 1

> c <task-id>
✓ Task completed
[Stats] Task completed - stats updated
[Filters] Task completed - filter view updated
[EVENT] task:completed - Buy groceries

> b

> 3

=== Task Statistics ===
Total tasks:      2
Completed:        1
Active:           1
Completion rate:  50.0%
```

## Key Takeaways

1. **Loose coupling** - Plugins don't import from each other anymore
2. **Automatic updates** - Stats update immediately when tasks change
3. **Event-driven** - Changes propagate through events, not function calls
4. **Scalable** - Easy to add new plugins that react to task events
5. **Observable** - Event log shows system activity in real-time

## Event Naming Convention

Use the pattern: `<domain>:<action>`

Examples:
- `task:added`
- `task:completed`
- `task:deleted`
- `filter:changed`
- `stats:calculated`

## Benefits of Event-Driven Architecture

**Before (Direct Imports):**
```typescript
// Tight coupling
import { getTasks } from './tasks.js';
const tasks = getTasks(); // Direct dependency
```

**After (Events):**
```typescript
// Loose coupling
context.events.on('task:added', (data) => {
  // React to change without knowing about tasks plugin
});
```

**Advantages:**
- Plugins can be added/removed without breaking others
- No circular dependency issues
- Easier to test in isolation
- Clear data flow through events
- Better separation of concerns

**Next:** [Step 4: UI Provider Swap](../04-ui-provider-swap/) - Replace terminal with React →
