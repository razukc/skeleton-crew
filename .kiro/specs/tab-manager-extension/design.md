# Tab Manager Extension - Design Document

## Overview

The Tab Manager Extension is a browser extension built on Skeleton Crew Runtime that demonstrates how to build modular, testable browser extensions using a plugin-based architecture. The extension provides tab organization, search, grouping, and session management features while maintaining clean separation between business logic and UI.

## Architecture

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

1. **UI Layer (React)**
   - Popup interface
   - Tab list component
   - Search component
   - Session manager component
   - Action buttons

2. **Runtime Layer (Skeleton Crew)**
   - Plugin registry
   - Action engine
   - Event bus
   - Screen registry

3. **Plugin Layer**
   - Tabs plugin (tab management)
   - Sessions plugin (session save/restore)
   - Storage plugin (data persistence)
   - Search plugin (tab filtering)
   - Groups plugin (tab grouping)

4. **Browser API Layer**
   - chrome.tabs
   - chrome.storage
   - chrome.tabGroups
   - chrome.runtime

## Components and Interfaces

### Background Service Worker

**Purpose**: Hosts the Skeleton Crew Runtime and manages extension lifecycle.

**Responsibilities**:
- Initialize Runtime instance
- Register all plugins
- Handle messages from popup
- Maintain extension state
- Listen to browser events

**Interface**:
```typescript
// Background script entry point
async function initializeExtension(): Promise<void>
function handleMessage(message: Message, sender: MessageSender): Promise<any>
function broadcastEvent(event: string, data: unknown): void
```

### Tabs Plugin

**Purpose**: Manages tab operations and browser tab API integration.

**Actions**:
- `tabs:query` - Query all open tabs
- `tabs:activate` - Activate a specific tab
- `tabs:close` - Close a specific tab
- `tabs:group` - Create a tab group
- `tabs:findDuplicates` - Find duplicate tabs
- `tabs:closeDuplicates` - Close duplicate tabs

**Events Emitted**:
- `tab:created` - When a new tab is created
- `tab:updated` - When a tab is updated
- `tab:removed` - When a tab is closed
- `tab:activated` - When a tab is activated
- `group:created` - When a tab group is created
- `duplicates:found` - When duplicates are detected
- `duplicates:removed` - When duplicates are closed

**State**:
```typescript
interface TabsState {
  tabs: Tab[];
  activeTabId: number | null;
  groups: TabGroup[];
}
```

### Sessions Plugin

**Purpose**: Manages session save and restore functionality.

**Actions**:
- `sessions:save` - Save current tab session
- `sessions:restore` - Restore a saved session
- `sessions:list` - List all saved sessions
- `sessions:delete` - Delete a saved session

**Events Emitted**:
- `session:saved` - When a session is saved
- `session:restored` - When a session is restored
- `session:deleted` - When a session is deleted

**State**:
```typescript
interface SessionsState {
  sessions: SavedSession[];
}

interface SavedSession {
  id: string;
  name: string;
  createdAt: number;
  tabs: TabSnapshot[];
  groups: GroupSnapshot[];
}
```

### Storage Plugin

**Purpose**: Handles data persistence using chrome.storage.

**Actions**:
- `storage:save` - Save data to storage
- `storage:load` - Load data from storage
- `storage:clear` - Clear all stored data

**Events Emitted**:
- `storage:loaded` - When data is loaded from storage
- `storage:saved` - When data is saved to storage
- `storage:error` - When a storage operation fails

### Search Plugin

**Purpose**: Provides tab search and filtering functionality.

**Actions**:
- `search:filter` - Filter tabs by query
- `search:clear` - Clear search and show all tabs

**Events Emitted**:
- `search:updated` - When search query changes
- `search:cleared` - When search is cleared

**State**:
```typescript
interface SearchState {
  query: string;
  filteredTabs: Tab[];
}
```

### Groups Plugin

**Purpose**: Manages tab grouping operations.

**Actions**:
- `groups:create` - Create a new tab group
- `groups:update` - Update group properties
- `groups:ungroup` - Remove tabs from group

**Events Emitted**:
- `group:created` - When a group is created
- `group:updated` - When a group is updated
- `group:removed` - When a group is removed

### React UI Components

**TabList Component**:
```typescript
interface TabListProps {
  tabs: Tab[];
  onTabClick: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
}
```

**SearchBar Component**:
```typescript
interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onClear: () => void;
}
```

**SessionManager Component**:
```typescript
interface SessionManagerProps {
  sessions: SavedSession[];
  onSave: (name: string) => void;
  onRestore: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}
```

**ActionBar Component**:
```typescript
interface ActionBarProps {
  onCreateGroup: () => void;
  onFindDuplicates: () => void;
  onSaveSession: () => void;
}
```

## Data Models

### Tab

```typescript
interface Tab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active: boolean;
  windowId: number;
  groupId?: number;
  lastAccessed?: number;
}
```

### TabGroup

```typescript
interface TabGroup {
  id: number;
  title?: string;
  color: string;
  collapsed: boolean;
}
```

### SavedSession

```typescript
interface SavedSession {
  id: string;
  name: string;
  createdAt: number;
  tabs: TabSnapshot[];
  groups: GroupSnapshot[];
}

interface TabSnapshot {
  title: string;
  url: string;
  groupId?: number;
}

interface GroupSnapshot {
  id: number;
  title?: string;
  color: string;
}
```

### Message

```typescript
interface Message {
  type: 'action' | 'event';
  action?: string;
  event?: string;
  params?: unknown;
  data?: unknown;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Tab data completeness
*For any* tab returned by the tabs:query action, the tab object should contain title, URL, and favIconUrl fields (or null for favIconUrl).
**Validates: Requirements 1.2**

### Property 2: Grouped tabs organization
*For any* set of tabs with groupId values, tabs with the same groupId should be adjacent in the organized list.
**Validates: Requirements 1.3**

### Property 3: Tab list refresh on update
*For any* tab:updated event, the tab list should be refreshed to reflect the changes.
**Validates: Requirements 1.5**

### Property 4: Search filtering correctness
*For any* search query and tab list, all filtered results should have either title or URL containing the query string (case-insensitive).
**Validates: Requirements 2.1**

### Property 5: Search clear restoration
*For any* tab list, clearing the search should return the complete original list.
**Validates: Requirements 2.5**

### Property 6: Group creation assignment
*For any* set of selected tabs and group information, creating a group should result in all selected tabs having the new groupId.
**Validates: Requirements 3.3**

### Property 7: Group creation event emission
*For any* group creation operation, a group:created event should be emitted with the group details.
**Validates: Requirements 3.5**

### Property 8: Session capture completeness
*For any* set of open tabs, saving a session should capture all tabs with their URLs.
**Validates: Requirements 4.1**

### Property 9: Session storage persistence
*For any* saved session, the session data should exist in chrome.storage.local after saving.
**Validates: Requirements 4.3**

### Property 10: Session data structure
*For any* saved session, it should contain tab titles, URLs, and group information for all tabs.
**Validates: Requirements 4.4**

### Property 11: Session save event emission
*For any* session save operation, a session:saved event should be emitted with the session details.
**Validates: Requirements 4.5**

### Property 12: Session list completeness
*For any* set of saved sessions, the sessions:list action should return all saved sessions.
**Validates: Requirements 5.1**

### Property 13: Session restore completeness
*For any* saved session, restoring it should open tabs with URLs matching the saved session.
**Validates: Requirements 5.2**

### Property 14: Session group restoration
*For any* saved session with groups, restoring should recreate the groups with the same properties.
**Validates: Requirements 5.3**

### Property 15: Session restore event emission
*For any* session restore operation, a session:restored event should be emitted.
**Validates: Requirements 5.4**

### Property 16: Session restore error handling
*For any* failed session restore operation, the current tab state should remain unchanged.
**Validates: Requirements 5.5**

### Property 17: Duplicate detection accuracy
*For any* set of tabs, the findDuplicates action should identify all tabs with identical URLs.
**Validates: Requirements 6.1**

### Property 18: Duplicate count accuracy
*For any* set of duplicate tabs, the count should equal the actual number of tabs with duplicate URLs.
**Validates: Requirements 6.2**

### Property 19: Duplicate closure uniqueness
*For any* set of duplicate tabs, after closing duplicates, only one tab per unique URL should remain.
**Validates: Requirements 6.3**

### Property 20: Duplicate preservation strategy
*For any* set of duplicate tabs, the tab with the most recent lastAccessed time should be preserved.
**Validates: Requirements 6.4**

### Property 21: Duplicate removal event emission
*For any* duplicate closure operation, a duplicates:removed event should be emitted.
**Validates: Requirements 6.5**

### Property 22: Tab activation event emission
*For any* tab activation operation, a tab:activated event should be emitted with the tab ID.
**Validates: Requirements 7.5**

### Property 23: Tab closure list update
*For any* tab closure operation, the tab should not appear in the tab list after closing.
**Validates: Requirements 8.3**

### Property 24: Tab close event emission
*For any* tab closure operation, a tab:closed event should be emitted with the tab ID.
**Validates: Requirements 8.5**

### Property 25: Plugin setup execution order
*For any* set of registered plugins, setup callbacks should be executed in registration order.
**Validates: Requirements 9.2**

### Property 26: Action availability after registration
*For any* action registered by a plugin, the action should be retrievable via the RuntimeContext.
**Validates: Requirements 9.3**

### Property 27: Event delivery to all subscribers
*For any* emitted event, all registered listeners should receive the event.
**Validates: Requirements 9.4**

### Property 28: Plugin dispose callback execution
*For any* initialized plugin, the dispose callback should be called during shutdown.
**Validates: Requirements 9.5**

### Property 29: UI updates via events
*For any* plugin operation that changes state, the UI should be updated via event emission.
**Validates: Requirements 10.3**

### Property 30: UI logic execution via actions
*For any* UI operation requiring business logic, the UI should execute it via RuntimeContext actions.
**Validates: Requirements 10.4**

### Property 31: Operation event emission
*For any* plugin operation that modifies state, an event describing the change should be emitted.
**Validates: Requirements 11.1**

### Property 32: Event delivery to all listeners
*For any* emitted event, all registered listeners should be invoked with the event data.
**Validates: Requirements 11.2**

### Property 33: Multiple listener invocation
*For any* event with multiple listeners, all listeners should be invoked regardless of execution order.
**Validates: Requirements 11.3**

### Property 34: Listener error isolation
*For any* event listener that throws an error, other listeners should still be invoked.
**Validates: Requirements 11.4**

### Property 35: Disposed plugin unsubscription
*For any* disposed plugin, its event listeners should not receive subsequent events.
**Validates: Requirements 11.5**

### Property 36: Storage failure default values
*For any* storage load operation that fails, the system should use default values and continue.
**Validates: Requirements 12.3**

### Property 37: Immediate save on update
*For any* data update operation, the changes should be saved to storage immediately.
**Validates: Requirements 12.4**

## Error Handling

### Storage Errors

**Scenario**: chrome.storage operations fail (quota exceeded, permission denied)

**Handling**:
1. Log error to console
2. Emit storage:error event with error details
3. Use default/cached values to continue operation
4. Display user-friendly error message in UI

**Example**:
```typescript
try {
  await chrome.storage.local.set({ sessions });
} catch (error) {
  logger.error('Storage save failed:', error);
  context.events.emit('storage:error', { operation: 'save', error });
  // Continue with in-memory state
}
```

### Browser API Errors

**Scenario**: chrome.tabs or chrome.tabGroups operations fail

**Handling**:
1. Catch and log the error
2. Emit appropriate error event
3. Display error message to user
4. Maintain current state

**Example**:
```typescript
try {
  await chrome.tabs.update(tabId, { active: true });
} catch (error) {
  logger.error('Tab activation failed:', error);
  context.events.emit('tab:activation-failed', { tabId, error });
  throw new Error(`Failed to activate tab: ${error.message}`);
}
```

### Plugin Initialization Errors

**Scenario**: Plugin setup callback throws an error

**Handling**:
1. Log error with plugin name
2. Abort initialization
3. Roll back already-initialized plugins
4. Display error to user

**Example**:
```typescript
try {
  await plugin.setup(context);
} catch (error) {
  logger.error(`Plugin ${plugin.name} setup failed:`, error);
  // Runtime handles rollback
  throw error;
}
```

### Session Restore Errors

**Scenario**: Session restore fails (invalid URLs, permission issues)

**Handling**:
1. Log which tabs failed to restore
2. Continue restoring remaining tabs
3. Emit session:restore-partial event
4. Display summary of failures to user

**Example**:
```typescript
const failures = [];
for (const tab of session.tabs) {
  try {
    await chrome.tabs.create({ url: tab.url });
  } catch (error) {
    failures.push({ url: tab.url, error });
  }
}
if (failures.length > 0) {
  context.events.emit('session:restore-partial', { failures });
}
```

## Testing Strategy

### Unit Testing

**Scope**: Individual plugins and their actions

**Approach**:
- Test each plugin in isolation
- Mock chrome APIs using vitest mocks
- Verify action handlers return correct results
- Verify events are emitted correctly
- Test error handling paths

**Example**:
```typescript
describe('TabsPlugin', () => {
  it('should query all tabs', async () => {
    const mockTabs = [
      { id: 1, title: 'Tab 1', url: 'https://example.com' }
    ];
    global.chrome.tabs.query = vi.fn((info, cb) => cb(mockTabs));
    
    const runtime = new Runtime();
    runtime.registerPlugin(tabsPlugin);
    await runtime.initialize();
    
    const result = await runtime.context.actions.runAction('tabs:query');
    expect(result).toEqual(mockTabs);
  });
});
```

### Property-Based Testing

**Scope**: Correctness properties defined above

**Approach**:
- Use fast-check library for property testing
- Generate random test data (tabs, sessions, queries)
- Run each property test 100+ times
- Verify properties hold for all generated inputs
- Tag tests with property numbers

**Example**:
```typescript
import fc from 'fast-check';

describe('Property 4: Search filtering correctness', () => {
  it('should filter tabs by query', () => {
    fc.assert(
      fc.property(
        fc.array(tabArbitrary),
        fc.string(),
        (tabs, query) => {
          const filtered = filterTabs(tabs, query);
          return filtered.every(tab =>
            tab.title.toLowerCase().includes(query.toLowerCase()) ||
            tab.url.toLowerCase().includes(query.toLowerCase())
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Scope**: Plugin interactions and message passing

**Approach**:
- Test multiple plugins working together
- Verify event-driven communication
- Test background ↔ popup message flow
- Mock chrome.runtime.sendMessage

**Example**:
```typescript
describe('Plugin Integration', () => {
  it('should communicate between plugins via events', async () => {
    const runtime = new Runtime();
    runtime.registerPlugin(tabsPlugin);
    runtime.registerPlugin(sessionsPlugin);
    await runtime.initialize();
    
    const eventSpy = vi.fn();
    runtime.context.events.on('session:saved', eventSpy);
    
    await runtime.context.actions.runAction('sessions:save', {
      name: 'Test Session'
    });
    
    expect(eventSpy).toHaveBeenCalled();
  });
});
```

### Manual Testing

**Scope**: UI interactions and browser integration

**Approach**:
- Load extension in Chrome
- Test all user workflows
- Verify UI updates correctly
- Test error scenarios
- Verify persistence across browser restarts

**Test Cases**:
1. Open extension, verify tab list displays
2. Search for tabs, verify filtering works
3. Create tab group, verify group appears
4. Save session, verify it persists
5. Restore session, verify tabs open correctly
6. Find and close duplicates
7. Test with 100+ tabs for performance

## Build and Deployment

### Build Configuration

**Tools**:
- Vite for bundling
- TypeScript for type checking
- Vitest for testing

**Build Steps**:
1. Compile TypeScript to JavaScript
2. Bundle background script
3. Bundle popup UI
4. Copy manifest.json and assets
5. Generate source maps for debugging

**Vite Config**:
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: 'src/background/index.ts',
        popup: 'src/popup/index.html'
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es'
      }
    }
  }
});
```

### Manifest Configuration

**Version**: Manifest V3

**Permissions**:
- `storage` - For saving sessions and settings
- `tabs` - For tab management
- `tabGroups` - For tab grouping

**Structure**:
```json
{
  "manifest_version": 3,
  "name": "Tab Manager",
  "version": "1.0.0",
  "description": "Organize and manage your browser tabs",
  "permissions": ["storage", "tabs", "tabGroups"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

### Deployment Process

1. **Development**:
   ```bash
   npm run dev
   # Load unpacked extension from dist/
   ```

2. **Testing**:
   ```bash
   npm test
   npm run test:coverage
   ```

3. **Production Build**:
   ```bash
   npm run build
   # Creates optimized dist/ folder
   ```

4. **Packaging**:
   ```bash
   cd dist && zip -r ../tab-manager.zip .
   # Upload to Chrome Web Store
   ```

### Directory Structure

```
demo/tab-manager/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── background/
│   │   └── index.ts
│   ├── popup/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   └── App.tsx
│   ├── plugins/
│   │   ├── tabs.ts
│   │   ├── sessions.ts
│   │   ├── storage.ts
│   │   ├── search.ts
│   │   └── groups.ts
│   ├── components/
│   │   ├── TabList.tsx
│   │   ├── SearchBar.tsx
│   │   ├── SessionManager.tsx
│   │   └── ActionBar.tsx
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── browser-adapter.ts
├── tests/
│   ├── unit/
│   │   ├── tabs-plugin.test.ts
│   │   ├── sessions-plugin.test.ts
│   │   └── search-plugin.test.ts
│   ├── property/
│   │   ├── search-filtering.property.test.ts
│   │   ├── duplicate-detection.property.test.ts
│   │   └── session-restore.property.test.ts
│   └── integration/
│       └── plugin-communication.test.ts
└── dist/
    ├── background.js
    ├── popup.html
    ├── popup.js
    └── manifest.json
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Load plugins only when needed
2. **Debouncing**: Debounce search input (300ms)
3. **Memoization**: Cache filtered tab lists
4. **Virtual Scrolling**: For large tab lists (100+ tabs)
5. **Batch Operations**: Batch chrome API calls when possible

### Performance Targets

- Extension load time: < 100ms
- Tab list render: < 50ms for 100 tabs
- Search response: < 100ms
- Session save: < 200ms
- Session restore: < 500ms for 50 tabs

### Memory Management

- Limit stored sessions to 50
- Clean up event listeners on dispose
- Use WeakMap for tab metadata
- Avoid storing large objects in memory

## Cross-Browser Compatibility

### Browser Support

The Tab Manager extension is designed to work across multiple browsers:

- **Chrome**: Full support (primary target)
- **Edge**: Full support (Chromium-based)
- **Firefox**: Full support with adapter
- **Opera**: Full support (Chromium-based)
- **Brave**: Full support (Chromium-based)

### Browser API Differences

#### Chrome vs Firefox API Naming

**Problem**: Chrome uses `chrome.*` namespace, Firefox uses `browser.*` namespace

**Solution**: Browser adapter utility

```typescript
// utils/browser-adapter.ts
export const browserAPI = (() => {
  // Firefox uses 'browser', Chrome uses 'chrome'
  if (typeof chrome !== 'undefined') {
    return chrome;
  }
  if (typeof browser !== 'undefined') {
    return browser;
  }
  throw new Error('Browser API not available');
})();

// Usage in plugins
import { browserAPI } from '../utils/browser-adapter.js';

// Works in both Chrome and Firefox
const tabs = await browserAPI.tabs.query({});
```

#### Promise vs Callback APIs

**Problem**: Chrome uses callbacks, Firefox uses Promises

**Solution**: Promisify Chrome APIs

```typescript
// utils/browser-adapter.ts
export const storage = {
  get: (keys: string | string[] | null) => {
    return new Promise((resolve) => {
      browserAPI.storage.local.get(keys, resolve);
    });
  },
  
  set: (items: Record<string, any>) => {
    return new Promise((resolve) => {
      browserAPI.storage.local.set(items, resolve);
    });
  },
  
  remove: (keys: string | string[]) => {
    return new Promise((resolve) => {
      browserAPI.storage.local.remove(keys, resolve);
    });
  }
};

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
  },
  
  remove: (tabIds: number | number[]) => {
    return new Promise<void>((resolve) => {
      browserAPI.tabs.remove(tabIds, resolve);
    });
  },
  
  create: (createProperties: chrome.tabs.CreateProperties) => {
    return new Promise<chrome.tabs.Tab>((resolve) => {
      browserAPI.tabs.create(createProperties, resolve);
    });
  }
};
```

#### Tab Groups API Availability

**Problem**: Tab Groups API is not available in Firefox

**Solution**: Feature detection and graceful degradation

```typescript
// utils/browser-adapter.ts
export const hasTabGroups = () => {
  return typeof browserAPI.tabGroups !== 'undefined';
};

// In groups plugin
export const groupsPlugin = {
  name: 'groups',
  version: '1.0.0',
  
  setup(context) {
    if (!hasTabGroups()) {
      context.logger.warn('Tab Groups API not available, grouping disabled');
      return;
    }
    
    // Register group actions only if supported
    context.actions.registerAction({
      id: 'groups:create',
      handler: async (params) => {
        // Implementation
      }
    });
  }
};
```

### Manifest Differences

#### Chrome Manifest

```json
{
  "manifest_version": 3,
  "name": "Tab Manager",
  "version": "1.0.0",
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

#### Firefox Manifest

```json
{
  "manifest_version": 3,
  "name": "Tab Manager",
  "version": "1.0.0",
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
      "id": "tab-manager@example.com",
      "strict_min_version": "109.0"
    }
  }
}
```

### Build Configuration for Multiple Browsers

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox';
  
  return {
    build: {
      rollupOptions: {
        input: {
          background: 'src/background/index.ts',
          popup: 'src/popup/index.html'
        },
        output: {
          entryFileNames: '[name].js',
          format: 'es'
        }
      }
    },
    define: {
      __BROWSER__: JSON.stringify(isFirefox ? 'firefox' : 'chrome')
    },
    plugins: [
      // Copy appropriate manifest
      {
        name: 'copy-manifest',
        writeBundle() {
          const manifestSrc = isFirefox 
            ? 'manifest.firefox.json' 
            : 'manifest.chrome.json';
          // Copy logic
        }
      }
    ]
  };
});
```

### Build Scripts

```json
{
  "scripts": {
    "build": "vite build",
    "build:chrome": "vite build --mode chrome",
    "build:firefox": "vite build --mode firefox",
    "build:all": "npm run build:chrome && npm run build:firefox",
    "package:chrome": "cd dist-chrome && zip -r ../tab-manager-chrome.zip .",
    "package:firefox": "cd dist-firefox && zip -r ../tab-manager-firefox.zip ."
  }
}
```

### Testing Across Browsers

#### Unit Tests

Use browser adapter in tests:

```typescript
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { browserAPI } from '../src/utils/browser-adapter.js';

// Mock for Chrome
global.chrome = {
  tabs: {
    query: vi.fn((info, callback) => callback([])),
    update: vi.fn((id, props, callback) => callback({}))
  },
  storage: {
    local: {
      get: vi.fn((keys, callback) => callback({})),
      set: vi.fn((items, callback) => callback())
    }
  }
};

describe('Cross-browser compatibility', () => {
  it('should work with Chrome API', async () => {
    const tabs = await browserAPI.tabs.query({});
    expect(tabs).toEqual([]);
  });
});
```

#### Manual Testing Matrix

| Feature | Chrome | Firefox | Edge | Opera | Brave |
|---------|--------|---------|------|-------|-------|
| Tab listing | ✓ | ✓ | ✓ | ✓ | ✓ |
| Search | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tab groups | ✓ | ✗ | ✓ | ✓ | ✓ |
| Sessions | ✓ | ✓ | ✓ | ✓ | ✓ |
| Duplicates | ✓ | ✓ | ✓ | ✓ | ✓ |
| Storage | ✓ | ✓ | ✓ | ✓ | ✓ |

### Feature Detection Pattern

```typescript
// utils/features.ts
export const features = {
  tabGroups: typeof browserAPI.tabGroups !== 'undefined',
  sessions: typeof browserAPI.sessions !== 'undefined',
  alarms: typeof browserAPI.alarms !== 'undefined'
};

// In UI components
import { features } from '../utils/features.js';

function ActionBar() {
  return (
    <div>
      {features.tabGroups && (
        <button onClick={handleCreateGroup}>Create Group</button>
      )}
      <button onClick={handleSaveSession}>Save Session</button>
    </div>
  );
}
```

### Polyfills and Fallbacks

#### Tab Groups Fallback

```typescript
// For browsers without tab groups, use in-memory grouping
interface VirtualGroup {
  id: string;
  title: string;
  color: string;
  tabIds: number[];
}

const virtualGroups = new Map<string, VirtualGroup>();

export const groupsCompat = {
  create: async (tabIds: number[], title: string, color: string) => {
    if (hasTabGroups()) {
      return await browserAPI.tabGroups.group({ tabIds });
    } else {
      // Virtual grouping
      const groupId = crypto.randomUUID();
      virtualGroups.set(groupId, { id: groupId, title, color, tabIds });
      return { id: groupId };
    }
  },
  
  getGroups: async () => {
    if (hasTabGroups()) {
      return await browserAPI.tabGroups.query({});
    } else {
      return Array.from(virtualGroups.values());
    }
  }
};
```

### Distribution

#### Chrome Web Store

1. Build for Chrome: `npm run build:chrome`
2. Package: `npm run package:chrome`
3. Upload to Chrome Web Store
4. Submit for review

#### Firefox Add-ons

1. Build for Firefox: `npm run build:firefox`
2. Package: `npm run package:firefox`
3. Upload to Firefox Add-ons
4. Submit for review

#### Edge Add-ons

1. Use Chrome build (Chromium-based)
2. Upload to Edge Add-ons
3. Submit for review

### Browser-Specific Considerations

#### Chrome/Edge/Brave

- Full Manifest V3 support
- Service worker background script
- Tab Groups API available
- Declarative Net Request API

#### Firefox

- Manifest V3 support (Firefox 109+)
- Background scripts (not service workers in older versions)
- No Tab Groups API (use fallback)
- Different extension ID format required

#### Testing Recommendations

1. **Primary Development**: Chrome (most features)
2. **Regular Testing**: Firefox (API differences)
3. **Pre-release Testing**: All supported browsers
4. **Automated Testing**: Use browser adapter mocks
5. **Manual Testing**: Test matrix for each release

### Compatibility Checklist

- [ ] Browser adapter implemented
- [ ] Promise wrappers for Chrome APIs
- [ ] Feature detection for optional APIs
- [ ] Graceful degradation for missing features
- [ ] Separate manifests for Chrome/Firefox
- [ ] Build scripts for each browser
- [ ] Cross-browser testing completed
- [ ] Documentation updated with browser support

## Security Considerations

1. **Content Security Policy**: Follow Manifest V3 CSP
2. **Input Validation**: Validate all user inputs
3. **URL Sanitization**: Sanitize URLs before display
4. **Permission Minimization**: Request only necessary permissions
5. **Data Encryption**: Consider encrypting sensitive session data

## Future Enhancements

1. **Cloud Sync**: Sync sessions across devices
2. **Tab Suspending**: Suspend inactive tabs to save memory
3. **Keyboard Shortcuts**: Add keyboard navigation
4. **Tab Preview**: Show tab thumbnails
5. **Advanced Search**: Search by domain, date, etc.
6. **Export/Import**: Export sessions as JSON
7. **Tab Analytics**: Track tab usage statistics
