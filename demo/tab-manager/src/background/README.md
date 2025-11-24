# Background Service Worker

This directory contains the background service worker for the Tab Manager extension.

## Overview

The background script (`index.ts`) serves as the main entry point for the extension. It:

1. **Initializes the Skeleton Crew Runtime** - Creates and configures the runtime instance
2. **Registers all plugins** - Loads storage, tabs, search, groups, and sessions plugins
3. **Handles messages** - Routes action requests from the popup UI to the appropriate plugins
4. **Broadcasts events** - Forwards runtime events to the popup and other extension contexts

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Background Service Worker                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Skeleton Crew Runtime                     │  │
│  │                                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │ Storage  │  │   Tabs   │  │  Search  │       │  │
│  │  │  Plugin  │  │  Plugin  │  │  Plugin  │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  │                                                    │  │
│  │  ┌──────────┐  ┌──────────┐                      │  │
│  │  │  Groups  │  │ Sessions │                      │  │
│  │  │  Plugin  │  │  Plugin  │                      │  │
│  │  └──────────┘  └──────────┘                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Message Handler                           │  │
│  │  - Receives action requests from popup            │  │
│  │  - Routes to runtime.actions.runAction()          │  │
│  │  - Returns results or errors                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Event Broadcaster                         │  │
│  │  - Listens to runtime events                      │  │
│  │  - Forwards to popup via chrome.runtime.sendMessage│ │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Plugin Registration Order

Plugins are registered in a specific order to ensure dependencies are available:

1. **Storage Plugin** - Must be first as other plugins depend on it for persistence
2. **Tabs Plugin** - Provides core tab management functionality
3. **Search Plugin** - Depends on tabs data
4. **Groups Plugin** - Depends on tabs API
5. **Sessions Plugin** - Depends on storage and tabs plugins

## Message Protocol

### Action Messages (Popup → Background)

```typescript
{
  type: 'action',
  action: 'tabs:query',  // Action ID
  params: { ... }         // Optional parameters
}
```

**Response:**
```typescript
{
  success: true,
  result: { ... }  // Action result
}
// OR
{
  success: false,
  error: 'Error message'
}
```

### Event Messages (Background → Popup)

```typescript
{
  type: 'event',
  event: 'tab:created',  // Event name
  data: { ... }           // Event data
}
```

## Events Broadcasted

The background script broadcasts the following events to the popup:

### Tab Events
- `tab:created` - New tab created
- `tab:updated` - Tab properties changed
- `tab:removed` - Tab closed
- `tab:activated` - Tab activated
- `tab:closed` - Tab closed via extension

### Group Events
- `group:created` - Tab group created
- `group:updated` - Group properties changed
- `group:removed` - Group removed

### Session Events
- `session:saved` - Session saved
- `session:restored` - Session restored
- `session:restore-partial` - Session partially restored (some tabs failed)
- `session:deleted` - Session deleted

### Search Events
- `search:updated` - Search query changed
- `search:cleared` - Search cleared

### Storage Events
- `storage:loaded` - Data loaded from storage
- `storage:saved` - Data saved to storage
- `storage:cleared` - Storage cleared
- `storage:error` - Storage operation failed

### Duplicate Events
- `duplicates:found` - Duplicate tabs detected
- `duplicates:removed` - Duplicate tabs closed

## Error Handling

The background script handles errors at multiple levels:

1. **Action Execution Errors** - Caught and returned as error responses
2. **Event Broadcasting Errors** - Silently ignored (popup might not be open)
3. **Plugin Initialization Errors** - Logged to console

## Lifecycle

### Initialization
1. Create Runtime instance
2. Register all plugins
3. Call `runtime.initialize()` to execute plugin setup callbacks
4. Set up message handler
5. Set up event broadcaster

### Shutdown
- Handled automatically by browser when extension is suspended
- Runtime cleanup is managed by plugin dispose callbacks

## Testing

See `tests/unit/background.test.ts` for comprehensive tests covering:
- Plugin registration
- Message handling
- Event broadcasting
- Cross-plugin communication
- Runtime lifecycle

## Requirements

This implementation satisfies the following requirements:
- **9.1** - Plugin-based architecture
- **9.2** - Plugin setup execution
- **10.4** - UI-to-plugin communication via actions
- **11.2** - Event delivery to all listeners
- **14.2** - Manifest V3 service worker

