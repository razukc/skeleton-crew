# Migration Patterns for Existing Applications

This guide covers strategies for adopting Skeleton Crew Runtime in existing applications without requiring a complete rewrite.

## Core Philosophy

Skeleton Crew can be adopted incrementally. You don't need to rewrite your entire application - instead, introduce the runtime alongside existing code and migrate features progressively.

## Migration Strategies

### 1. Gradual Migration Pattern

Add Skeleton Crew alongside existing code and migrate features one at a time.

```typescript
// Existing app structure
class LegacyApp {
  constructor() {
    this.tabs = [];
    this.settings = {};
  }
  
  createTab(params) {
    // Existing implementation
    const tab = { id: Date.now(), ...params };
    this.tabs.push(tab);
    return tab;
  }
  
  updateSettings(newSettings) {
    // Existing implementation
    this.settings = { ...this.settings, ...newSettings };
  }
}

// Add Skeleton Crew alongside
import { Runtime } from 'skeleton-crew-runtime';

class HybridApp extends LegacyApp {
  constructor() {
    super();
    this.runtime = new Runtime();
    this.bridgeLegacyToRuntime();
  }
  
  async bridgeLegacyToRuntime() {
    // Expose legacy functionality as actions
    const bridgePlugin = {
      name: 'legacy-bridge',
      version: '1.0.0',
      setup: (context) => {
        // Wrap existing methods as actions
        context.actions.registerAction({
          id: 'tabs:create',
          handler: (params) => this.createTab(params)
        });
        
        context.actions.registerAction({
          id: 'settings:update',
          handler: (params) => this.updateSettings(params)
        });
        
        // Emit events for legacy operations
        const originalCreateTab = this.createTab.bind(this);
        this.createTab = (params) => {
          const result = originalCreateTab(params);
          context.events.emit('tab:created', result);
          return result;
        };
      }
    };
    
    this.runtime.registerPlugin(bridgePlugin);
    await this.runtime.initialize();
  }
}
```

**Benefits:**
- No breaking changes to existing code
- New features can use Skeleton Crew immediately
- Legacy code continues working
- Migrate at your own pace

### 2. Feature Flag Pattern

Control which features use Skeleton Crew vs legacy implementation.

```typescript
const config = {
  features: {
    tabs: 'skeleton-crew',      // Migrated
    settings: 'legacy',          // Not yet migrated
    ui: 'legacy',                // Not yet migrated
    analytics: 'skeleton-crew'   // Migrated
  }
};

class FeatureFlaggedApp {
  constructor() {
    this.runtime = new Runtime();
    this.initializeFeatures();
  }
  
  async initializeFeatures() {
    // Register plugins based on feature flags
    if (config.features.tabs === 'skeleton-crew') {
      this.runtime.registerPlugin(tabsPlugin);
    } else {
      this.legacyTabs = new LegacyTabManager();
    }
    
    if (config.features.analytics === 'skeleton-crew') {
      this.runtime.registerPlugin(analyticsPlugin);
    } else {
      this.legacyAnalytics = new LegacyAnalytics();
    }
    
    await this.runtime.initialize();
  }
  
  // Unified interface that routes to correct implementation
  async createTab(params) {
    if (config.features.tabs === 'skeleton-crew') {
      return this.runtime.getContext().actions.runAction('tabs:create', params);
    } else {
      return this.legacyTabs.create(params);
    }
  }
}
```

**Benefits:**
- Easy rollback if issues arise
- A/B testing capabilities
- Gradual rollout to users
- Team can work on migration in parallel

### 3. Event Bridge Pattern

Connect existing event systems to Skeleton Crew's EventBus.

```typescript
import { EventEmitter } from 'events';
import { Runtime } from 'skeleton-crew-runtime';

class EventBridge {
  constructor(legacyEmitter, runtime) {
    this.legacyEmitter = legacyEmitter;
    this.context = runtime.getContext();
    this.setupBidirectionalBridge();
  }
  
  setupBidirectionalBridge() {
    // Forward legacy events to Skeleton Crew
    this.legacyEmitter.on('tab-created', (data) => {
      this.context.events.emit('tab:created', data);
    });
    
    this.legacyEmitter.on('tab-closed', (data) => {
      this.context.events.emit('tab:closed', data);
    });
    
    this.legacyEmitter.on('settings-changed', (data) => {
      this.context.events.emit('settings:changed', data);
    });
    
    // Forward Skeleton Crew events to legacy
    this.context.events.on('tab:created', (data) => {
      this.legacyEmitter.emit('tab-created', data);
    });
    
    this.context.events.on('tab:closed', (data) => {
      this.legacyEmitter.emit('tab-closed', data);
    });
    
    this.context.events.on('settings:changed', (data) => {
      this.legacyEmitter.emit('settings-changed', data);
    });
  }
}

// Usage
const legacyEmitter = new EventEmitter();
const runtime = new Runtime();
await runtime.initialize();
const bridge = new EventBridge(legacyEmitter, runtime);

// Now both systems can communicate
legacyEmitter.emit('tab-created', { id: 1 }); // Skeleton Crew plugins will receive this
runtime.getContext().events.emit('tab:closed', { id: 1 }); // Legacy code will receive this
```

**Benefits:**
- Legacy and new code can communicate
- No need to rewrite event listeners immediately
- Enables gradual migration of event handlers
- Both systems stay in sync

### 4. Adapter Plugin Pattern

Wrap existing services/classes as Skeleton Crew plugins.

```typescript
// Existing service
class TabService {
  async queryTabs(filter) {
    const tabs = await chrome.tabs.query(filter);
    return tabs;
  }
  
  async closeTab(tabId) {
    await chrome.tabs.remove(tabId);
  }
  
  async activateTab(tabId) {
    await chrome.tabs.update(tabId, { active: true });
  }
}

// Adapter plugin - wraps existing service
export const tabServiceAdapter = {
  name: 'tab-service-adapter',
  version: '1.0.0',
  setup(context) {
    const service = new TabService();
    
    // Expose service methods as actions
    context.actions.registerAction({
      id: 'tabs:query',
      handler: (params) => service.queryTabs(params)
    });
    
    context.actions.registerAction({
      id: 'tabs:close',
      handler: ({ tabId }) => service.closeTab(tabId)
    });
    
    context.actions.registerAction({
      id: 'tabs:activate',
      handler: ({ tabId }) => service.activateTab(tabId)
    });
    
    // Optionally emit events for service operations
    const originalCloseTab = service.closeTab.bind(service);
    service.closeTab = async (tabId) => {
      await originalCloseTab(tabId);
      context.events.emit('tab:closed', { tabId });
    };
  }
};
```

**Benefits:**
- Minimal changes to existing code
- Service logic remains unchanged
- Gains Skeleton Crew benefits (events, testability, modularity)
- Easy to test in isolation

### 5. UI Coexistence Pattern

Run Skeleton Crew features alongside existing UI framework.

```typescript
// Existing React app
import { useState, useEffect } from 'react';
import { Runtime } from 'skeleton-crew-runtime';
import { newFeaturePlugin } from './plugins/new-feature.js';

function ExistingApp() {
  const [runtime, setRuntime] = useState(null);
  
  useEffect(() => {
    const rt = new Runtime();
    rt.registerPlugin(newFeaturePlugin);
    rt.initialize().then(() => setRuntime(rt));
  }, []);
  
  return (
    <div className="app">
      {/* Existing UI - unchanged */}
      <LegacyTabManager />
      <LegacySettings />
      
      {/* New Skeleton Crew-powered feature */}
      {runtime && <SkeletonCrewFeature runtime={runtime} />}
    </div>
  );
}

// New feature component using Skeleton Crew
function SkeletonCrewFeature({ runtime }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const context = runtime.getContext();
    
    // Subscribe to events
    const unsubscribe = context.events.on('feature:updated', (newData) => {
      setData(newData);
    });
    
    return unsubscribe;
  }, [runtime]);
  
  const handleAction = async () => {
    const context = runtime.getContext();
    await context.actions.runAction('feature:action', {});
  };
  
  return (
    <div>
      <h2>New Feature (Skeleton Crew)</h2>
      <button onClick={handleAction}>Execute Action</button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

**Benefits:**
- No need to rewrite existing UI
- New features use modern architecture
- Side-by-side comparison possible
- Gradual UI migration

## Real-World Example: Browser Extension Migration

### Before (Monolithic Architecture)

```typescript
// background.js - everything in one file
let tabs = [];
let settings = { theme: 'light' };

chrome.tabs.onCreated.addListener((tab) => {
  tabs.push(tab);
  updateUI(tab);
  saveToStorage(tab);
  logAnalytics('tab_created', tab);
  notifyUser('New tab created');
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabs = tabs.filter(t => t.id !== tabId);
  updateUI();
  saveToStorage();
  logAnalytics('tab_closed', { tabId });
});

function closeTab(tabId) {
  chrome.tabs.remove(tabId);
  updateUI();
  saveToStorage();
  logAnalytics('tab_closed', { tabId });
}

function updateSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  saveToStorage();
  updateUI();
  logAnalytics('settings_changed', newSettings);
}

// ... hundreds more lines
```

**Problems:**
- Tight coupling between features
- Hard to test
- Difficult to add new features
- No clear boundaries
- Analytics, storage, UI all mixed together

### After (Skeleton Crew - Step by Step)

#### Step 1: Add Runtime (No Breaking Changes)

```typescript
// background.js
import { Runtime } from 'skeleton-crew-runtime';

const runtime = new Runtime();
await runtime.initialize();
const context = runtime.getContext();

// Keep existing code working
let tabs = [];
let settings = { theme: 'light' };

chrome.tabs.onCreated.addListener((tab) => {
  tabs.push(tab);
  updateUI(tab);
  saveToStorage(tab);
  logAnalytics('tab_created', tab);
  notifyUser('New tab created');
  
  // NEW: Also emit event for future plugins
  context.events.emit('tab:created', tab);
});

// ... rest of legacy code unchanged
```

#### Step 2: Extract Analytics to Plugin

```typescript
// plugins/analytics.js
export const analyticsPlugin = {
  name: 'analytics',
  version: '1.0.0',
  setup(context) {
    context.events.on('tab:created', (tab) => {
      logAnalytics('tab_created', tab);
    });
    
    context.events.on('tab:closed', (data) => {
      logAnalytics('tab_closed', data);
    });
    
    context.events.on('settings:changed', (settings) => {
      logAnalytics('settings_changed', settings);
    });
  }
};

// background.js
import { analyticsPlugin } from './plugins/analytics.js';

runtime.registerPlugin(analyticsPlugin);
await runtime.initialize();

// Remove analytics from legacy listeners
chrome.tabs.onCreated.addListener((tab) => {
  tabs.push(tab);
  updateUI(tab);
  saveToStorage(tab);
  // logAnalytics('tab_created', tab); ← REMOVED
  notifyUser('New tab created');
  context.events.emit('tab:created', tab);
});
```

#### Step 3: Extract Storage to Plugin

```typescript
// plugins/storage.js
export const storagePlugin = {
  name: 'storage',
  version: '1.0.0',
  setup(context) {
    context.events.on('tab:created', async (tab) => {
      await saveToStorage('tabs', tab);
    });
    
    context.events.on('tab:closed', async (data) => {
      await removeFromStorage('tabs', data.tabId);
    });
    
    context.events.on('settings:changed', async (settings) => {
      await saveToStorage('settings', settings);
    });
    
    // Provide storage actions
    context.actions.registerAction({
      id: 'storage:load',
      handler: async ({ key }) => {
        return await loadFromStorage(key);
      }
    });
  }
};

// background.js
runtime.registerPlugin(storagePlugin);

chrome.tabs.onCreated.addListener((tab) => {
  tabs.push(tab);
  updateUI(tab);
  // saveToStorage(tab); ← REMOVED
  notifyUser('New tab created');
  context.events.emit('tab:created', tab);
});
```

#### Step 4: Extract Tab Management to Plugin

```typescript
// plugins/tabs.js
export const tabsPlugin = {
  name: 'tabs',
  version: '1.0.0',
  setup(context) {
    let tabs = [];
    
    // Listen to Chrome events
    chrome.tabs.onCreated.addListener((tab) => {
      tabs.push(tab);
      context.events.emit('tab:created', tab);
    });
    
    chrome.tabs.onRemoved.addListener((tabId) => {
      tabs = tabs.filter(t => t.id !== tabId);
      context.events.emit('tab:closed', { tabId });
    });
    
    // Provide tab actions
    context.actions.registerAction({
      id: 'tabs:query',
      handler: async (filter) => {
        return await chrome.tabs.query(filter || {});
      }
    });
    
    context.actions.registerAction({
      id: 'tabs:close',
      handler: async ({ tabId }) => {
        await chrome.tabs.remove(tabId);
        // Event will be emitted by onRemoved listener
      }
    });
    
    context.actions.registerAction({
      id: 'tabs:activate',
      handler: async ({ tabId }) => {
        await chrome.tabs.update(tabId, { active: true });
        context.events.emit('tab:activated', { tabId });
      }
    });
  }
};

// background.js - now much simpler
import { Runtime } from 'skeleton-crew-runtime';
import { tabsPlugin } from './plugins/tabs.js';
import { storagePlugin } from './plugins/storage.js';
import { analyticsPlugin } from './plugins/analytics.js';

const runtime = new Runtime();
runtime.registerPlugin(tabsPlugin);
runtime.registerPlugin(storagePlugin);
runtime.registerPlugin(analyticsPlugin);
await runtime.initialize();

// Legacy code is now gone!
// All functionality is in plugins
```

#### Step 5: Final State - Fully Migrated

```typescript
// background.js - clean and minimal
import { Runtime } from 'skeleton-crew-runtime';
import { tabsPlugin } from './plugins/tabs.js';
import { storagePlugin } from './plugins/storage.js';
import { analyticsPlugin } from './plugins/analytics.js';
import { notificationsPlugin } from './plugins/notifications.js';
import { settingsPlugin } from './plugins/settings.js';

const runtime = new Runtime();

// Register all plugins
runtime.registerPlugin(tabsPlugin);
runtime.registerPlugin(storagePlugin);
runtime.registerPlugin(analyticsPlugin);
runtime.registerPlugin(notificationsPlugin);
runtime.registerPlugin(settingsPlugin);

// Initialize
await runtime.initialize();

// Expose context for message handlers
const context = runtime.getContext();

// Handle messages from UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'action') {
    context.actions.runAction(message.action, message.params)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }
});

// Cleanup on shutdown
chrome.runtime.onSuspend.addListener(async () => {
  await runtime.shutdown();
});
```

**Results:**
- 500+ lines → 30 lines in background.js
- Each feature is isolated and testable
- Easy to add new features
- Clear separation of concerns
- No tight coupling

## Migration Checklist

### Phase 1: Preparation
- [ ] Install Skeleton Crew Runtime
- [ ] Create plugins directory structure
- [ ] Set up TypeScript configuration
- [ ] Identify features to migrate first (start with least coupled)

### Phase 2: Foundation
- [ ] Add Runtime instance to main entry point
- [ ] Initialize runtime alongside existing code
- [ ] Create event bridge if using existing event system
- [ ] Verify existing functionality still works

### Phase 3: Incremental Migration
- [ ] Extract first feature to plugin (recommend: analytics or logging)
- [ ] Test thoroughly
- [ ] Extract second feature (recommend: storage or data layer)
- [ ] Test thoroughly
- [ ] Continue with remaining features

### Phase 4: Cleanup
- [ ] Remove legacy code as features are migrated
- [ ] Update tests to use plugin architecture
- [ ] Document plugin APIs
- [ ] Remove event bridge if no longer needed

### Phase 5: Optimization
- [ ] Review plugin boundaries
- [ ] Optimize event usage
- [ ] Add error handling
- [ ] Performance testing

## When to Migrate to Skeleton Crew

### Good Candidates

**Growing complexity:**
- App has 1000+ lines of code
- Multiple features interacting
- Hard to add new features without breaking existing ones

**Testing challenges:**
- Hard to test features in isolation
- Mocking is complex
- Integration tests are brittle

**Team scaling:**
- Multiple developers working on same codebase
- Frequent merge conflicts
- Need clear ownership boundaries

**Modularity needs:**
- Want to enable/disable features
- Need plugin system for extensibility
- Planning to support third-party extensions

### Maybe Not Yet

**Simple applications:**
- Less than 500 lines of code
- Single feature or purpose
- No plans for growth

**Stable applications:**
- No active development
- Feature complete
- Maintenance mode only

**Short-lived projects:**
- Prototypes
- Proof of concepts
- Temporary tools

## Common Migration Pitfalls

### 1. Migrating Too Much at Once

**Problem:** Trying to rewrite entire app in one go

**Solution:** Migrate one feature at a time, test thoroughly

### 2. Not Using Event Bridge

**Problem:** Breaking existing event listeners during migration

**Solution:** Use event bridge to maintain compatibility

### 3. Tight Coupling in Plugins

**Problem:** Plugins directly calling each other's methods

**Solution:** Use events and actions for cross-plugin communication

### 4. Forgetting to Clean Up

**Problem:** Leaving duplicate code paths (legacy + new)

**Solution:** Remove legacy code once feature is fully migrated and tested

### 5. No Rollback Plan

**Problem:** Can't revert if migration causes issues

**Solution:** Use feature flags, keep legacy code until confident

## Testing During Migration

### Test Both Paths

```typescript
describe('Tab Management', () => {
  it('should work with legacy implementation', async () => {
    const app = new App({ useLegacy: true });
    const tab = await app.createTab({ url: 'https://example.com' });
    expect(tab).toBeDefined();
  });
  
  it('should work with Skeleton Crew implementation', async () => {
    const app = new App({ useLegacy: false });
    const tab = await app.createTab({ url: 'https://example.com' });
    expect(tab).toBeDefined();
  });
});
```

### Test Event Bridge

```typescript
describe('Event Bridge', () => {
  it('should forward legacy events to Skeleton Crew', (done) => {
    const bridge = new EventBridge(legacyEmitter, runtime);
    const context = runtime.getContext();
    
    context.events.on('tab:created', (data) => {
      expect(data.id).toBe(123);
      done();
    });
    
    legacyEmitter.emit('tab-created', { id: 123 });
  });
});
```

## Summary

Skeleton Crew Runtime can be adopted incrementally without requiring a full rewrite:

1. **Start small** - Add runtime alongside existing code
2. **Bridge events** - Connect legacy and new systems
3. **Migrate gradually** - One feature at a time
4. **Test thoroughly** - Verify each migration step
5. **Clean up** - Remove legacy code once confident

The key is that Skeleton Crew is designed to coexist with existing code, making migration low-risk and manageable.
