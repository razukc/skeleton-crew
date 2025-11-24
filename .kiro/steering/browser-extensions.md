---
inclusion: always
---

# Browser Extension Development with Skeleton Crew Runtime

## Overview

This steering document provides guidance for building browser extensions using Skeleton Crew Runtime. It covers architecture patterns, best practices, and implementation guidelines specific to browser extension development.

## Architecture Principles

### Plugin-Based Structure

Browser extensions built with Skeleton Crew should follow a plugin-based architecture:

- **Background Script**: Hosts the Runtime instance and core plugins
- **Content Scripts**: Isolated Runtime instances for page interaction
- **UI Surfaces**: Popup, options page, devtools panels as separate UI providers
- **Message Bridge**: Event-based communication between contexts

### Extension Structure

```
extension/
├── manifest.json              # Extension manifest (Manifest V3)
├── src/
│   ├── runtime/              # Skeleton Crew Runtime (symlink or copy)
│   ├── plugins/              # Feature plugins
│   │   ├── core.ts          # Core functionality
│   │   ├── storage.ts       # Data persistence
│   │   └── ui-bridge.ts     # UI communication
│   ├── background/           # Background script
│   │   └── index.ts
│   ├── content/              # Content scripts
│   │   └── index.ts
│   ├── popup/                # Extension popup
│   │   ├── index.html
│   │   └── index.tsx
│   └── components/           # React components
└── dist/                     # Built extension
```

## Communication Patterns

### Background ↔ Popup Communication

```typescript
// Background: Expose runtime via message handler
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.type === 'action') {
    runtime.context.actions.runAction(msg.action, msg.params)
      .then(respond);
    return true; // Async response
  }
});

// Popup: Send messages to background
const result = await chrome.runtime.sendMessage({
  type: 'action',
  action: 'my-action',
  params: { data: 'value' }
});
```

### Event Broadcasting

```typescript
// Plugin emits event
context.events.emit('data:updated', { items: [] });

// Background broadcasts to all tabs
chrome.tabs.query({}, (tabs) => {
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'event',
      event: 'data:updated',
      data: { items: [] }
    });
  });
});
```

## Plugin Development Guidelines

### State Management Plugin Pattern

```typescript
export const statePlugin = {
  name: 'state-manager',
  version: '1.0.0',
  
  setup(context) {
    let state = {};
    
    // Load from storage on startup
    chrome.storage.local.get('state', (result) => {
      state = result.state || {};
      context.events.emit('state:loaded', state);
    });
    
    // Provide state access
    context.actions.registerAction({
      id: 'get-state',
      handler: async () => state
    });
    
    context.actions.registerAction({
      id: 'update-state',
      handler: async (updates) => {
        state = { ...state, ...updates };
        await chrome.storage.local.set({ state });
        context.events.emit('state:changed', state);
        return state;
      }
    });
  }
};
```

### Browser API Integration Pattern

```typescript
export const tabsPlugin = {
  name: 'tabs-manager',
  version: '1.0.0',
  
  setup(context) {
    // Register actions that wrap browser APIs
    context.actions.registerAction({
      id: 'tabs:query',
      handler: async (queryInfo) => {
        return new Promise((resolve) => {
          chrome.tabs.query(queryInfo, resolve);
        });
      }
    });
    
    // Listen to browser events and emit runtime events
    chrome.tabs.onCreated.addListener((tab) => {
      context.events.emit('tab:created', tab);
    });
    
    chrome.tabs.onRemoved.addListener((tabId) => {
      context.events.emit('tab:removed', { tabId });
    });
  }
};
```

## UI Provider Pattern for Extensions

### React UI Provider for Popup

```typescript
// popup/ui-provider.tsx
export function ExtensionUIProvider({ runtime }) {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [data, setData] = useState({});
  
  useEffect(() => {
    // Listen to navigation events
    runtime.context.events.on('screen:navigate', ({ screenId }) => {
      setCurrentScreen(screenId);
    });
    
    // Listen to data updates
    runtime.context.events.on('data:updated', (newData) => {
      setData(prev => ({ ...prev, ...newData }));
    });
  }, [runtime]);
  
  const executeAction = async (actionId, params) => {
    // Send to background script
    return await chrome.runtime.sendMessage({
      type: 'action',
      action: actionId,
      params
    });
  };
  
  const screen = runtime.context.screens.getScreen(currentScreen);
  const ScreenComponent = getComponent(screen.component);
  
  return <ScreenComponent data={data} executeAction={executeAction} />;
}
```

## Testing Guidelines

### Unit Testing Plugins

```typescript
describe('TabsPlugin', () => {
  it('should register tab actions', async () => {
    const runtime = new Runtime();
    runtime.registerPlugin(tabsPlugin);
    await runtime.initialize();
    
    const action = runtime.context.actions.getAction('tabs:query');
    expect(action).toBeDefined();
  });
});
```

### Mock Browser APIs

```typescript
// Mock chrome APIs for testing
global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys, callback) => callback({})),
      set: vi.fn((items, callback) => callback?.())
    }
  },
  tabs: {
    query: vi.fn((info, callback) => callback([])),
    onCreated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() }
  }
};
```

## Build Configuration

### Vite Configuration for Extensions

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: 'src/background/index.ts',
        popup: 'src/popup/index.html',
        content: 'src/content/index.ts'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js'
      }
    }
  }
});
```

### Manifest V3 Template

```json
{
  "manifest_version": 3,
  "name": "Extension Name",
  "version": "1.0.0",
  "permissions": ["storage", "tabs"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

## Best Practices

1. **Separate Concerns**: Keep business logic in plugins, UI in components
2. **Use Events**: Prefer event-driven communication over direct coupling
3. **Async Actions**: All browser API calls should be wrapped in async actions
4. **Error Handling**: Always handle chrome API errors gracefully
5. **Storage**: Use chrome.storage for persistence, not localStorage
6. **Permissions**: Request minimal permissions, add more as needed
7. **Testing**: Mock chrome APIs for unit tests, use Puppeteer for E2E

## Security Considerations

1. **Content Security Policy**: Follow Manifest V3 CSP requirements
2. **Data Encryption**: Encrypt sensitive data before storage
3. **Permission Requests**: Request permissions only when needed
4. **Input Validation**: Validate all data from content scripts
5. **XSS Prevention**: Sanitize user input in UI components

## Performance Optimization

1. **Lazy Loading**: Load plugins on-demand when possible
2. **Debouncing**: Debounce frequent events (input, scroll)
3. **Batch Operations**: Batch chrome API calls when possible
4. **Memory Management**: Clean up listeners and timers in dispose
5. **Storage Limits**: Monitor chrome.storage quota usage

## Reference Implementation

See the tab manager demo in `demo/tab-manager/` for a complete example implementing these patterns.
