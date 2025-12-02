# Step 5: Build Your Own Plugin

Create a custom plugin from scratch using best practices.

## Learning Goals

- Design a plugin from requirements
- Implement plugin structure
- Integrate with existing plugins via events
- Follow plugin development best practices

## What You'll Build

Choose one of these plugin ideas (or create your own):

### Option A: Tags Plugin
Add tagging capability to tasks.

**Features:**
- Add/remove tags from tasks
- Filter tasks by tag
- View all tags with counts
- Tag suggestions

### Option B: Priority Plugin
Add priority levels to tasks.

**Features:**
- Set task priority (low/medium/high)
- Sort tasks by priority
- Priority statistics
- Priority-based filtering

### Option C: Due Dates Plugin
Add due dates to tasks.

**Features:**
- Set due dates on tasks
- View overdue tasks
- Sort by due date
- Due date reminders

## Plugin Development Guide

### Step 1: Define Requirements

Before writing code, answer these questions:

1. **What state does my plugin manage?**
   - Example: List of tags, tag-to-task mappings

2. **What actions does it provide?**
   - Example: add-tag, remove-tag, get-tags-for-task

3. **What events does it emit?**
   - Example: tag:added, tag:removed

4. **What events does it listen to?**
   - Example: task:deleted (to clean up tags)

5. **What screens does it provide?**
   - Example: tags screen showing all tags

### Step 2: Create Plugin Structure

```typescript
// plugins/your-plugin.ts
import { PluginDefinition, RuntimeContext } from '../../../../src/types.js';

// 1. Define types
interface YourDataType {
  // Your data structure
}

// 2. Define state
let state: YourDataType[] = [];

// 3. Export plugin
export const yourPlugin: PluginDefinition = {
  name: 'your-plugin',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // Register screens
    context.screens.registerScreen({
      id: 'your-screen',
      title: 'Your Screen Title',
      component: 'YourScreenComponent'
    });
    
    // Register actions
    context.actions.registerAction({
      id: 'your-action',
      handler: (params) => {
        // Action logic
        // Emit events when state changes
        context.events.emit('your:event', { data });
        return result;
      }
    });
    
    // Subscribe to events
    context.events.on('task:deleted', (data) => {
      // React to other plugins' events
    });
  },
  
  dispose(): void {
    // Cleanup
    state = [];
  }
};

// 4. Export data accessors
export function getYourData(): YourDataType[] {
  return state;
}
```

### Step 3: Implement Tags Plugin (Example)

Here's a complete implementation of the tags plugin:

```typescript
// plugins/tags.ts
import { PluginDefinition, RuntimeContext } from '../../../../src/types.js';

interface TaskTag {
  taskId: string;
  tag: string;
}

let taskTags: TaskTag[] = [];

export const tagsPlugin: PluginDefinition = {
  name: 'tags',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // Register tags screen
    context.screens.registerScreen({
      id: 'tags',
      title: 'Task Tags',
      component: 'TagsScreen'
    });
    
    // Add tag to task
    context.actions.registerAction({
      id: 'add-tag',
      handler: (params: { taskId: string; tag: string }) => {
        const exists = taskTags.some(
          tt => tt.taskId === params.taskId && tt.tag === params.tag
        );
        
        if (!exists) {
          taskTags.push({
            taskId: params.taskId,
            tag: params.tag
          });
          
          context.events.emit('tag:added', {
            taskId: params.taskId,
            tag: params.tag
          });
        }
        
        return taskTags.filter(tt => tt.taskId === params.taskId);
      }
    });
    
    // Remove tag from task
    context.actions.registerAction({
      id: 'remove-tag',
      handler: (params: { taskId: string; tag: string }) => {
        const index = taskTags.findIndex(
          tt => tt.taskId === params.taskId && tt.tag === params.tag
        );
        
        if (index !== -1) {
          taskTags.splice(index, 1);
          
          context.events.emit('tag:removed', {
            taskId: params.taskId,
            tag: params.tag
          });
        }
        
        return taskTags.filter(tt => tt.taskId === params.taskId);
      }
    });
    
    // Get tags for a task
    context.actions.registerAction({
      id: 'get-tags-for-task',
      handler: (params: { taskId: string }) => {
        return taskTags
          .filter(tt => tt.taskId === params.taskId)
          .map(tt => tt.tag);
      }
    });
    
    // Get all unique tags
    context.actions.registerAction({
      id: 'get-all-tags',
      handler: () => {
        const uniqueTags = new Set(taskTags.map(tt => tt.tag));
        return Array.from(uniqueTags);
      }
    });
    
    // Get tasks by tag
    context.actions.registerAction({
      id: 'get-tasks-by-tag',
      handler: (params: { tag: string }) => {
        return taskTags
          .filter(tt => tt.tag === params.tag)
          .map(tt => tt.taskId);
      }
    });
    
    // Clean up tags when task is deleted
    context.events.on('task:deleted', (data) => {
      const removed = taskTags.filter(tt => tt.taskId === data.task.id);
      taskTags = taskTags.filter(tt => tt.taskId !== data.task.id);
      
      if (removed.length > 0) {
        console.log(`[Tags] Cleaned up ${removed.length} tags for deleted task`);
      }
    });
  },
  
  dispose(): void {
    taskTags = [];
  }
};

export function getTaskTags(): TaskTag[] {
  return taskTags;
}

export function getTagsForTask(taskId: string): string[] {
  return taskTags
    .filter(tt => tt.taskId === taskId)
    .map(tt => tt.tag);
}
```

### Step 4: Register Your Plugin

```typescript
// index.ts
import { yourPlugin } from './plugins/your-plugin.js';

runtime.registerPlugin(tasksPlugin);
runtime.registerPlugin(filtersPlugin);
runtime.registerPlugin(statsPlugin);
runtime.registerPlugin(yourPlugin); // Add your plugin
```

### Step 5: Update UI

Add UI for your plugin's screens and actions.

**Terminal UI:**
```typescript
// ui/terminal-ui.ts
case 'YourScreenComponent':
  this.renderYourScreen();
  break;

private renderYourScreen(): void {
  // Render your screen
}
```

**React UI:**
```typescript
// ui/react-ui.tsx
const YourScreen = () => {
  // Your React component
  return <div>Your screen content</div>;
};

// Add to screen rendering
case 'your-screen': return <YourScreen />;
```

## Plugin Best Practices

### 1. State Management
```typescript
// ✓ Good: Private state, exported accessors
let tasks: Task[] = [];
export function getTasks(): Task[] {
  return tasks;
}

// ✗ Bad: Exported mutable state
export let tasks: Task[] = [];
```

### 2. Event Naming
```typescript
// ✓ Good: Consistent pattern
context.events.emit('tag:added', { taskId, tag });
context.events.emit('tag:removed', { taskId, tag });

// ✗ Bad: Inconsistent naming
context.events.emit('tagAdded', { taskId, tag });
context.events.emit('remove-tag', { taskId, tag });
```

### 3. Action Handlers
```typescript
// ✓ Good: Emit events after state changes
context.actions.registerAction({
  id: 'add-tag',
  handler: (params) => {
    // 1. Validate
    if (!params.tag) throw new Error('Tag required');
    
    // 2. Update state
    taskTags.push({ taskId: params.taskId, tag: params.tag });
    
    // 3. Emit event
    context.events.emit('tag:added', params);
    
    // 4. Return result
    return taskTags;
  }
});
```

### 4. Event Subscriptions
```typescript
// ✓ Good: Subscribe in setup()
setup(context: RuntimeContext): void {
  context.events.on('task:deleted', (data) => {
    // Clean up related data
  });
}

// ✗ Bad: Subscribe in action handlers
context.actions.registerAction({
  id: 'some-action',
  handler: () => {
    context.events.on('task:deleted', ...); // Don't do this!
  }
});
```

### 5. Cleanup
```typescript
// ✓ Good: Implement dispose()
dispose(): void {
  taskTags = [];
  // Clean up any resources
}

// ✗ Bad: No cleanup
dispose(): void {
  // Empty or missing
}
```

## Testing Your Plugin

Create tests for your plugin:

```typescript
// tests/your-plugin.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../src/runtime.js';
import { yourPlugin } from '../example/tutorial/05-custom-plugin/plugins/your-plugin.js';

describe('Your Plugin', () => {
  let runtime: Runtime;
  let context: RuntimeContext;
  
  beforeEach(async () => {
    runtime = new Runtime();
    runtime.registerPlugin(yourPlugin);
    await runtime.initialize();
    context = runtime.getContext();
  });
  
  it('should register actions', () => {
    expect(context.actions.hasAction('your-action')).toBe(true);
  });
  
  it('should emit events on state changes', async () => {
    let eventFired = false;
    context.events.on('your:event', () => {
      eventFired = true;
    });
    
    await context.actions.executeAction('your-action', { /* params */ });
    
    expect(eventFired).toBe(true);
  });
});
```

## Challenge Ideas

Once you've built your first plugin, try these challenges:

1. **Search Plugin** - Full-text search across tasks
2. **Export Plugin** - Export tasks to JSON/CSV
3. **Undo Plugin** - Undo/redo functionality
4. **Notifications Plugin** - Browser notifications for events
5. **Sync Plugin** - Sync tasks to localStorage or API

## Key Takeaways

1. **Plugin structure is consistent** - Follow the pattern
2. **Events enable loose coupling** - Plugins communicate without dependencies
3. **Actions are the API** - Well-defined interface for functionality
4. **State is private** - Only expose what's necessary
5. **Cleanup matters** - Implement dispose() properly

## Congratulations! 🎉

You've completed the Skeleton Crew Runtime tutorial. You now understand:

- Runtime initialization and lifecycle
- Plugin architecture and composition
- Event-driven communication
- UI abstraction and provider pattern
- Plugin development best practices

## Next Steps

- Build a real application with Skeleton Crew
- Explore the [API documentation](../../../docs/api/API.md)
- Review the [playground example](../../index.ts)
- Contribute to the project
- Share your plugins with the community

---

**Happy building with Skeleton Crew! 🚀**
