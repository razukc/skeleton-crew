# Tab Manager Extension - Architecture Documentation

This document provides a detailed explanation of the Tab Manager Extension's architecture, including the plugin structure, message passing system, event system, and how all components work together.

## Table of Contents

- [Overview](#overview)
- [Architecture Diagram](#architecture-diagram)
- [Core Concepts](#core-concepts)
- [Plugin System](#plugin-system)
- [Message Passing](#message-passing)
- [Event System](#event-system)
- [Data Flow](#data-flow)
- [Browser API Integration](#browser-api-integration)
- [Cross-Browser Compatibility](#cross-browser-compatibility)

## Overview

The Tab Manager Extension is built on **Skeleton Crew Runtime**, a minimal plugin-based application runtime. This architecture provides:

- **Separation of Concerns** - Business logic in plugins, UI in React components
- **Loose Coupling** - Plugins communicate via events, not direct calls
- **Testability** - Each plugin can be tested in isolation
- **Extensibility** - New features can be added as plugins
- **UI-Agnostic Core** - Business logic doesn't depend on UI framework

## Architecture Diagram

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Extension                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   Popup UI   │◄────────┤  Background  │                 │
│  │   (React)    │ Messages│   Service    │                 │
│  │              │────────►│   Worker     │                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                          │
│                          ┌────────▼────────┐                │
│                          │ Skeleton Crew   │                │
│                          │    Runtime      │                │
│                          └────────┬────────┘                │
│                                   │                          │
│              ┌────────────────────┼────────────────────┐    │
│              │                    │                    │    │
│         ┌────▼─────┐      ┌──────▼──────┐     ┌──────▼────┐│
│         │  Tabs    │      │  Sessions   │     │  Storage  ││
│         │  Plugin  │      │   Plugin    │     │  Plugin   ││
│         └──────────┘      └─────────────┘     └───────────┘│
│                                                               │
│         ┌──────────────────────────────────────────────┐    │
│         │         Chrome Extension APIs                 │    │
│         │  chrome.tabs | chrome.storage | chrome.tabGroups│ │
│         └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Layers

The extension is organized into four distinct layers:

#### 1. UI Layer (React)
- **Popup Interface** - Main extension popup
- **Components** - Reusable React components
  - `TabList` - Displays tabs
  - `SearchBar` - Search input
  - `SessionManager` - Session management UI
  - `ActionBar` - Action buttons
- **Responsibilities**:
  - Render user interface
  - Handle user interactions
  - Send action requests to background
  - Listen for events from background
  - Update UI based on events

#### 2. Runtime Layer (Skeleton Crew)
- **Plugin Registry** - Manages plugin lifecycle
- **Action Engine** - Registers and executes actions
- **Event Bus** - Pub/sub event system
- **Screen Registry** - Stores screen definitions
- **Responsibilities**:
  - Initialize plugins
  - Route action calls to handlers
  - Broadcast events to subscribers
  - Manage plugin lifecycle

#### 3. Plugin Layer
- **Storage Plugin** - Data persistence
- **Tabs Plugin** - Tab management
- **Search Plugin** - Tab filtering
- **Groups Plugin** - Tab grouping
- **Sessions Plugin** - Session save/restore
- **Responsibilities**:
  - Implement business logic
  - Register actions
  - Emit events on state changes
  - Listen to browser API events
  - Maintain plugin-specific state

#### 4. Browser API Layer
- **chrome.tabs** - Tab management APIs
- **chrome.storage** - Data persistence APIs
- **chrome.tabGroups** - Tab grouping APIs (Chrome only)
- **chrome.runtime** - Message passing APIs
- **Responsibilities**:
  - Provide browser functionality
  - Emit browser events
  - Execute browser operations

## Core Concepts

### Plugin Definition

A plugin is a JavaScript object that follows this structure:

```typescript
interface PluginDefinition {
  name: string;           // Unique plugin identifier
  version: string;        // Plugin version
  setup: (context: RuntimeContext) => void | Promise<void>;
  dispose?: (context: RuntimeContext) => void | Promise<void>;
}
```

**Example:**
```typescript
export const myPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  setup(context) {
    // Register actions
    context.actions.registerAction({
      id: 'my:action',
      handler: async (params) => {
        // Business logic
        return result;
      }
    });
    
    // Subscribe to events
    context.events.on('some:event', (data) => {
      // Handle event
    });
  },
  
  dispose(context) {
    // Cleanup (optional)
  }
};
```

### Runtime Context

The `RuntimeContext` provides plugins with access to all runtime subsystems:

```typescript
interface RuntimeContext {
  actions: ActionEngine;    // Execute and register actions
  events: EventBus;         // Emit and subscribe to events
  screens: ScreenRegistry;  // Register and retrieve screens
  logger: Logger;           // Logging utilities
}
```

### Actions

Actions are executable operations that plugins register:

```typescript
context.actions.registerAction({
  id: 'tabs:close',           // Unique action ID
  handler: async (params) => { // Action handler
    await chrome.tabs.remove(params.tabId);
    context.events.emit('tab:closed', { tabId: params.tabId });
  },
  timeout: 5000               // Optional timeout
});
```

Actions are executed via:
```typescript
const result = await context.actions.runAction('tabs:close', { tabId: 123 });
```

### Events

Events enable loose coupling between plugins:

```typescript
// Emit an event
context.events.emit('tab:created', { id: 123, title: 'New Tab' });

// Subscribe to an event
context.events.on('tab:created', (data) => {
  console.log('Tab created:', data);
});
```

## Plugin System

### Plugin Registration and Initialization

Plugins are registered before runtime initialization:

```typescript
// src/background/index.ts
const runtime = new Runtime();

// Register plugins in order
runtime.registerPlugin(storagePlugin);
runtime.registerPlugin(tabsPlugin);
runtime.registerPlugin(searchPlugin);
runtime.registerPlugin(groupsPlugin);
runtime.registerPlugin(sessionsPlugin);

// Initialize runtime (calls setup on all plugins)
await runtime.initialize();
```

**Initialization Sequence:**
1. Runtime creates subsystems (actions, events, screens)
2. Runtime creates RuntimeContext
3. Runtime calls `setup()` on each plugin in registration order
4. Plugins register actions, subscribe to events, etc.
5. Runtime is ready for use

### Plugin Lifecycle

```
┌──────────────┐
│  Registered  │
└──────┬───────┘
       │
       │ runtime.initialize()
       ▼
┌──────────────┐
│    Setup     │ ◄── plugin.setup(context) called
└──────┬───────┘
       │
       │ Plugin registers actions, subscribes to events
       ▼
┌──────────────┐
│    Active    │ ◄── Plugin is operational
└──────┬───────┘
       │
       │ runtime.shutdown()
       ▼
┌──────────────┐
│   Dispose    │ ◄── plugin.dispose(context) called
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Shutdown   │
└──────────────┘
```

### Plugin Examples

#### Storage Plugin

Handles data persistence using chrome.storage:

```typescript
export const storagePlugin = {
  name: 'storage',
  version: '1.0.0',
  
  setup(context) {
    // Register save action
    context.actions.registerAction({
      id: 'storage:save',
      handler: async ({ key, value }) => {
        await chrome.storage.local.set({ [key]: value });
        context.events.emit('storage:saved', { key });
      }
    });
    
    // Register load action
    context.actions.registerAction({
      id: 'storage:load',
      handler: async ({ key }) => {
        const result = await chrome.storage.local.get(key);
        return result[key];
      }
    });
  }
};
```

#### Tabs Plugin

Manages tab operations and browser tab events:

```typescript
export const tabsPlugin = {
  name: 'tabs',
  version: '1.0.0',
  
  setup(context) {
    // Register query action
    context.actions.registerAction({
      id: 'tabs:query',
      handler: async (filter) => {
        return await chrome.tabs.query(filter || {});
      }
    });
    
    // Listen to browser tab events
    chrome.tabs.onCreated.addListener((tab) => {
      context.events.emit('tab:created', tab);
    });
    
    chrome.tabs.onRemoved.addListener((tabId) => {
      context.events.emit('tab:removed', { tabId });
    });
  }
};
```

#### Sessions Plugin

Depends on other plugins via actions and events:

```typescript
export const sessionsPlugin = {
  name: 'sessions',
  version: '1.0.0',
  
  setup(context) {
    context.actions.registerAction({
      id: 'sessions:save',
      handler: async ({ name }) => {
        // Use tabs plugin to get tabs
        const tabs = await context.actions.runAction('tabs:query');
        
        const session = {
          id: Date.now().toString(),
          name,
          tabs,
          createdAt: Date.now()
        };
        
        // Use storage plugin to save
        await context.actions.runAction('storage:save', {
          key: `session:${session.id}`,
          value: session
        });
        
        // Emit event
        context.events.emit('session:saved', session);
        
        return session;
      }
    });
  }
};
```

## Message Passing

The extension uses Chrome's message passing API to communicate between the popup UI and background service worker.

### Message Structure

```typescript
interface Message {
  type: 'action' | 'event';
  action?: string;      // For action messages
  params?: unknown;     // Action parameters
  event?: string;       // For event messages
  data?: unknown;       // Event data
}
```

### Popup → Background (Action Execution)

**Popup sends action request:**
```typescript
// src/popup/message-bridge.ts
export async function executeAction(action: string, params?: unknown) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'action', action, params },
      (response) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error));
        }
      }
    );
  });
}

// Usage in React component
const tabs = await executeAction('tabs:query');
```

**Background handles action:**
```typescript
// src/background/index.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'action') {
    context.actions.runAction(message.action, message.params)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }
});
```

### Background → Popup (Event Broadcasting)

**Background broadcasts event:**
```typescript
// src/background/index.ts
context.events.on('tab:created', (data) => {
  chrome.runtime.sendMessage({
    type: 'event',
    event: 'tab:created',
    data
  }).catch(() => {
    // Popup might not be open, ignore error
  });
});
```

**Popup listens for events:**
```typescript
// src/popup/index.tsx
useEffect(() => {
  const listener = (message: Message) => {
    if (message.type === 'event') {
      handleEvent(message.event, message.data);
    }
  };
  
  chrome.runtime.onMessage.addListener(listener);
  
  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}, []);
```

### Message Flow Diagram

```
┌─────────────┐                    ┌──────────────┐
│   Popup UI  │                    │  Background  │
│             │                    │   Worker     │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │ 1. User clicks "Close Tab"      │
       │                                  │
       │ 2. executeAction('tabs:close')  │
       ├─────────────────────────────────►│
       │    { type: 'action',             │
       │      action: 'tabs:close',       │
       │      params: { tabId: 123 } }    │
       │                                  │
       │                                  │ 3. Execute action
       │                                  │    via runtime
       │                                  │
       │                                  │ 4. chrome.tabs.remove()
       │                                  │
       │ 5. Response                      │
       │◄─────────────────────────────────┤
       │    { success: true }             │
       │                                  │
       │                                  │ 6. Emit event
       │                                  │    'tab:closed'
       │                                  │
       │ 7. Broadcast event               │
       │◄─────────────────────────────────┤
       │    { type: 'event',              │
       │      event: 'tab:closed',        │
       │      data: { tabId: 123 } }      │
       │                                  │
       │ 8. Update UI                     │
       │                                  │
```

## Event System

The event system enables loose coupling between plugins and UI components.

### Event Naming Convention

Events follow the pattern: `<entity>:<action>`

Examples:
- `tab:created` - A tab was created
- `tab:closed` - A tab was closed
- `session:saved` - A session was saved
- `storage:error` - A storage operation failed

### Event Flow

```
┌──────────────┐
│   Plugin A   │
│              │
│ Performs     │
│ operation    │
└──────┬───────┘
       │
       │ 1. Emit event
       │    context.events.emit('tab:created', data)
       ▼
┌──────────────┐
│  Event Bus   │
│              │
│ Broadcasts   │
│ to all       │
│ subscribers  │
└──────┬───────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
       ▼              ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Plugin B │   │ Plugin C │   │ Plugin D │   │ Popup UI │
│          │   │          │   │          │   │          │
│ Handles  │   │ Handles  │   │ Ignores  │   │ Updates  │
│ event    │   │ event    │   │ event    │   │ display  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

### Event Examples

**Tab Events:**
```typescript
// Emitted by tabs plugin
context.events.emit('tab:created', { id, title, url });
context.events.emit('tab:updated', { id, changeInfo });
context.events.emit('tab:removed', { tabId });
context.events.emit('tab:activated', { tabId });
```

**Session Events:**
```typescript
// Emitted by sessions plugin
context.events.emit('session:saved', { id, name, tabs });
context.events.emit('session:restored', { id, name });
context.events.emit('session:deleted', { id });
```

**Storage Events:**
```typescript
// Emitted by storage plugin
context.events.emit('storage:saved', { key });
context.events.emit('storage:loaded', { key, value });
context.events.emit('storage:error', { operation, error });
```

### Event Subscribers

Plugins can subscribe to events from other plugins:

```typescript
// Analytics plugin listens to all events
export const analyticsPlugin = {
  name: 'analytics',
  version: '1.0.0',
  
  setup(context) {
    context.events.on('tab:created', (data) => {
      logAnalytics('tab_created', data);
    });
    
    context.events.on('session:saved', (data) => {
      logAnalytics('session_saved', data);
    });
  }
};
```

### Event Error Handling

Event handlers should never throw errors that break other handlers:

```typescript
context.events.on('tab:created', (data) => {
  try {
    // Your logic
  } catch (error) {
    console.error('Handler failed:', error);
    // Don't re-throw - let other handlers run
  }
});
```

## Data Flow

### Complete Data Flow Example: Closing a Tab

```
1. User clicks close button in UI
   │
   ▼
2. React component calls executeAction('tabs:close', { tabId })
   │
   ▼
3. Message sent to background via chrome.runtime.sendMessage
   │
   ▼
4. Background message handler receives message
   │
   ▼
5. Background calls context.actions.runAction('tabs:close', { tabId })
   │
   ▼
6. Action Engine routes to tabs plugin handler
   │
   ▼
7. Tabs plugin calls chrome.tabs.remove(tabId)
   │
   ▼
8. Browser closes the tab
   │
   ▼
9. Browser fires chrome.tabs.onRemoved event
   │
   ▼
10. Tabs plugin listener emits 'tab:removed' event
    │
    ▼
11. Event Bus broadcasts to all subscribers
    │
    ├──► Storage plugin updates cache
    │
    ├──► Analytics plugin logs event
    │
    └──► Background broadcasts to popup
         │
         ▼
12. Popup receives event message
    │
    ▼
13. React component updates state
    │
    ▼
14. UI re-renders without closed tab
```

### State Management

State is managed at multiple levels:

**Plugin State:**
- Each plugin maintains its own state
- State is private to the plugin
- Other plugins access state via actions

**UI State:**
- React components maintain UI-specific state
- UI state is updated via events from background
- UI sends actions to modify backend state

**Browser State:**
- Browser maintains tab state, storage, etc.
- Plugins interact with browser via APIs
- Browser events trigger plugin events

## Browser API Integration

### Browser Adapter

The extension uses a browser adapter for cross-browser compatibility:

```typescript
// src/utils/browser-adapter.ts
export const browserAPI = (() => {
  if (typeof chrome !== 'undefined') {
    return chrome;
  }
  if (typeof browser !== 'undefined') {
    return browser;
  }
  throw new Error('Browser API not available');
})();
```

### Promisified APIs

Chrome uses callbacks, Firefox uses promises. The adapter provides a unified interface:

```typescript
export const tabs = {
  query: (queryInfo: chrome.tabs.QueryInfo) => {
    return new Promise<chrome.tabs.Tab[]>((resolve) => {
      browserAPI.tabs.query(queryInfo, resolve);
    });
  },
  
  update: (tabId: number, updateProperties: chrome.tabs.UpdateProperties) => {
    return new Promise<chrome.tabs.Tab>((resolve) => {
      browserAPI.tabs.update(tabId, updateProperties, resolve);
    });
  }
};
```

### Feature Detection

Some APIs are not available in all browsers:

```typescript
export const hasTabGroups = () => {
  return typeof browserAPI.tabGroups !== 'undefined';
};

// In groups plugin
setup(context) {
  if (!hasTabGroups()) {
    context.logger.warn('Tab Groups not available');
    return; // Skip registration
  }
  
  // Register group actions
}
```

## Cross-Browser Compatibility

### Manifest Differences

**Chrome:**
```json
{
  "manifest_version": 3,
  "permissions": ["storage", "tabs", "tabGroups"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

**Firefox:**
```json
{
  "manifest_version": 3,
  "permissions": ["storage", "tabs"],
  "background": {
    "scripts": ["background.js"],
    "type": "module"
  },
  "browser_action": {
    "default_popup": "popup.html"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "tab-manager@skeleton-crew.example"
    }
  }
}
```

### Build Configuration

Vite builds separate versions for each browser:

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox';
  
  return {
    build: {
      outDir: isFirefox ? 'dist-firefox' : 'dist-chrome'
    },
    plugins: [
      {
        name: 'copy-manifest',
        writeBundle() {
          const manifest = isFirefox 
            ? 'manifest.firefox.json' 
            : 'manifest.chrome.json';
          // Copy appropriate manifest
        }
      }
    ]
  };
});
```

## Summary

The Tab Manager Extension demonstrates how to build a modular, testable browser extension using Skeleton Crew Runtime:

- **Plugin-based architecture** separates concerns and enables extensibility
- **Event-driven communication** keeps plugins loosely coupled
- **Message passing** connects UI and background seamlessly
- **Browser adapter** provides cross-browser compatibility
- **Clear data flow** makes the system easy to understand and debug

This architecture makes it easy to:
- Add new features as plugins
- Test plugins in isolation
- Maintain and debug the codebase
- Support multiple browsers
- Scale the extension as it grows

For more information, see:
- [README.md](README.md) - User documentation
- [Skeleton Crew Runtime](../../README.md) - Runtime documentation
- [Plugin Examples](src/plugins/) - Plugin implementations
