# Step 4: UI Provider Swap

Replace terminal UI with React while keeping all plugins unchanged.

## Learning Goals

- Understand UI abstraction in Skeleton Crew
- Implement a React UI provider
- Prove plugins are UI-agnostic
- Learn the UIProvider interface

## What We're Demonstrating

**The Power of UI Abstraction:**
- Same plugins from Step 3
- Zero plugin code changes
- Completely different UI (terminal → React)
- Same functionality, different presentation

## Code Structure

```
04-ui-provider-swap/
├── index.html            # NEW: HTML entry point
├── index.tsx             # NEW: React app entry
├── plugins/
│   ├── tasks.ts          # UNCHANGED from step 3
│   ├── filters.ts        # UNCHANGED from step 3
│   └── stats.ts          # UNCHANGED from step 3
└── ui/
    ├── terminal-ui.ts    # Original terminal UI
    └── react-ui.tsx      # NEW: React UI provider
```

## Step-by-Step Guide

### 1. Create React UI Provider

Implement the UIProvider interface with React.

```typescript
// ui/react-ui.tsx
import React, { useState, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { RuntimeContext, ScreenDefinition } from '../../../../src/types.js';
import { getTasks, Task } from '../plugins/tasks.js';
import { getCurrentFilter, FilterType } from '../plugins/filters.js';

interface AppProps {
  context: RuntimeContext;
}

const App: React.FC<AppProps> = ({ context }) => {
  const [currentScreen, setCurrentScreen] = useState<string>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0, completionRate: 0 });
  const [events, setEvents] = useState<string[]>([]);
  
  // Subscribe to events
  useEffect(() => {
    const updateData = () => {
      setTasks(getTasks());
      setFilter(getCurrentFilter());
      context.actions.executeAction('get-stats', {}).then(setStats);
    };
    
    context.events.on('task:added', (data) => {
      updateData();
      setEvents(prev => [...prev, `Task added: ${data.task.text}`]);
    });
    
    context.events.on('task:completed', (data) => {
      updateData();
      setEvents(prev => [...prev, `Task completed: ${data.task.text}`]);
    });
    
    context.events.on('task:deleted', (data) => {
      updateData();
      setEvents(prev => [...prev, `Task deleted: ${data.task.text}`]);
    });
    
    updateData();
  }, [context]);
  
  // Task screen component
  const TasksScreen = () => {
    const [newTaskText, setNewTaskText] = useState('');
    
    const handleAddTask = async () => {
      if (newTaskText.trim()) {
        await context.actions.executeAction('add-task', { text: newTaskText });
        setNewTaskText('');
      }
    };
    
    const handleCompleteTask = async (id: string) => {
      await context.actions.executeAction('complete-task', { id });
    };
    
    const handleDeleteTask = async (id: string) => {
      await context.actions.executeAction('delete-task', { id });
    };
    
    return (
      <div className="screen">
        <h2>Task Manager</h2>
        
        <div className="add-task">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Enter new task..."
          />
          <button onClick={handleAddTask}>Add Task</button>
        </div>
        
        <div className="task-list">
          {tasks.length === 0 ? (
            <p>No tasks yet!</p>
          ) : (
            tasks.map(task => (
              <div key={task.id} className={`task ${task.completed ? 'completed' : ''}`}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleCompleteTask(task.id)}
                />
                <span>{task.text}</span>
                <button onClick={() => handleDeleteTask(task.id)}>Delete</button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };
  
  // Filters screen component
  const FiltersScreen = () => {
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    
    useEffect(() => {
      context.actions.executeAction('get-filtered-tasks', {}).then(setFilteredTasks);
    }, [filter, tasks]);
    
    const handleSetFilter = async (newFilter: FilterType) => {
      await context.actions.executeAction('set-filter', { filter: newFilter });
      setFilter(newFilter);
    };
    
    return (
      <div className="screen">
        <h2>Task Filters</h2>
        
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => handleSetFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'active' ? 'active' : ''}
            onClick={() => handleSetFilter('active')}
          >
            Active
          </button>
          <button 
            className={filter === 'completed' ? 'active' : ''}
            onClick={() => handleSetFilter('completed')}
          >
            Completed
          </button>
        </div>
        
        <div className="task-list">
          {filteredTasks.length === 0 ? (
            <p>No tasks match this filter.</p>
          ) : (
            filteredTasks.map(task => (
              <div key={task.id} className={`task ${task.completed ? 'completed' : ''}`}>
                <span>{task.completed ? '✓' : '○'}</span>
                <span>{task.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };
  
  // Stats screen component
  const StatsScreen = () => (
    <div className="screen">
      <h2>Task Statistics</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completionRate.toFixed(1)}%</div>
          <div className="stat-label">Completion Rate</div>
        </div>
      </div>
    </div>
  );
  
  // Events screen component
  const EventsScreen = () => (
    <div className="screen">
      <h2>Event Log</h2>
      
      <div className="event-log">
        {events.length === 0 ? (
          <p>No events yet.</p>
        ) : (
          events.slice(-10).reverse().map((event, i) => (
            <div key={i} className="event">{event}</div>
          ))
        )}
      </div>
    </div>
  );
  
  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'tasks': return <TasksScreen />;
      case 'filters': return <FiltersScreen />;
      case 'stats': return <StatsScreen />;
      case 'events': return <EventsScreen />;
      default: return <TasksScreen />;
    }
  };
  
  return (
    <div className="app">
      <nav className="sidebar">
        <h1>Task Manager</h1>
        <button onClick={() => setCurrentScreen('tasks')}>Tasks</button>
        <button onClick={() => setCurrentScreen('filters')}>Filters</button>
        <button onClick={() => setCurrentScreen('stats')}>Stats</button>
        <button onClick={() => setCurrentScreen('events')}>Events</button>
      </nav>
      
      <main className="content">
        {renderScreen()}
      </main>
    </div>
  );
};

// React UI Provider implementation
export const reactUIProvider = {
  root: null as Root | null,
  
  async mount(target: HTMLElement, context: RuntimeContext): Promise<void> {
    this.root = createRoot(target);
    this.root.render(<App context={context} />);
  },
  
  async unmount(): Promise<void> {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
};
```

### 2. Create HTML Entry Point

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Manager - Skeleton Crew</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
    }
    
    .app {
      display: flex;
      height: 100vh;
    }
    
    .sidebar {
      width: 200px;
      background: #2c3e50;
      color: white;
      padding: 20px;
    }
    
    .sidebar h1 {
      font-size: 18px;
      margin-bottom: 30px;
    }
    
    .sidebar button {
      display: block;
      width: 100%;
      padding: 10px;
      margin-bottom: 10px;
      background: transparent;
      border: 1px solid #34495e;
      color: white;
      cursor: pointer;
      border-radius: 4px;
    }
    
    .sidebar button:hover {
      background: #34495e;
    }
    
    .content {
      flex: 1;
      padding: 40px;
      overflow-y: auto;
    }
    
    .screen h2 {
      margin-bottom: 20px;
      color: #2c3e50;
    }
    
    .add-task {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .add-task input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .add-task button {
      padding: 10px 20px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .task {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: white;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    
    .task.completed span {
      text-decoration: line-through;
      color: #999;
    }
    
    .task button {
      margin-left: auto;
      padding: 5px 10px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
    }
    
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #3498db;
    }
    
    .stat-label {
      margin-top: 8px;
      color: #7f8c8d;
    }
    
    .filter-buttons {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .filter-buttons button {
      padding: 10px 20px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .filter-buttons button.active {
      background: #3498db;
      color: white;
      border-color: #3498db;
    }
    
    .event-log {
      background: white;
      padding: 20px;
      border-radius: 8px;
    }
    
    .event {
      padding: 8px;
      border-bottom: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./index.tsx"></script>
</body>
</html>
```

### 3. Create React Entry Point

```typescript
// index.tsx
import { Runtime } from '../../../src/runtime.js';
import { tasksPlugin } from './plugins/tasks.js';
import { filtersPlugin } from './plugins/filters.js';
import { statsPlugin } from './plugins/stats.js';
import { reactUIProvider } from './ui/react-ui.js';

async function main() {
  console.log('[Tutorial 04] Initializing with React UI...');
  
  const runtime = new Runtime();
  
  // Same plugins as step 3 - NO CHANGES
  runtime.registerPlugin(tasksPlugin);
  runtime.registerPlugin(filtersPlugin);
  runtime.registerPlugin(statsPlugin);
  
  await runtime.initialize();
  
  const context = runtime.getContext();
  
  // Different UI provider - that's the only change!
  const root = document.getElementById('root')!;
  await reactUIProvider.mount(root, context);
}

main().catch(console.error);
```

## Running the Example

```bash
npm run build
npm run tutorial:04
```

This will start a development server and open the React UI in your browser.

## Key Takeaways

1. **UI abstraction works** - Same plugins, completely different UI
2. **Zero plugin changes** - Plugins don't know or care about UI
3. **UIProvider interface** - Simple contract: `mount()`, `unmount()`
4. **Framework flexibility** - Could be React, Vue, Svelte, or anything
5. **True separation** - Business logic (plugins) separate from presentation (UI)

## Comparison

**Terminal UI (Step 3):**
- Text-based interface
- Command-line interactions
- Sequential navigation
- Event log in console

**React UI (Step 4):**
- Graphical interface
- Click-based interactions
- Sidebar navigation
- Real-time updates

**Same:**
- All plugin code
- All business logic
- All events
- All actions

## The Power of Abstraction

```typescript
// This is the ONLY difference between step 3 and step 4:

// Step 3 (Terminal)
await terminalUIProvider.mount(null, context);

// Step 4 (React)
await reactUIProvider.mount(rootElement, context);
```

Everything else is identical. This proves the UI-agnostic architecture works.

**Next:** [Step 5: Build Your Own Plugin](../05-custom-plugin/) - Create a custom plugin →
