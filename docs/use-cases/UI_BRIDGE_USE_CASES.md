# UIBridge Feature Report

## Overview

The UIBridge is an optional subsystem in Skeleton Crew Runtime that enables UI framework integration while maintaining the runtime's core principle of being UI-agnostic. It provides a clean abstraction layer between the runtime and any UI rendering technology (React, Vue, Terminal, CLI, etc.).

## Architecture

### Core Concept

The UIBridge acts as an adapter pattern implementation that:
- Accepts any UI provider that implements the `UIProvider` interface
- Validates provider implementations at registration time
- Delegates screen rendering to the registered provider
- Manages provider lifecycle (mount/unmount)
- Maintains runtime functionality even without a UI provider

### Key Design Principles

1. **Optional by Design**: The runtime works fully without a UI provider
2. **Framework Agnostic**: No assumptions about React, Vue, or any specific UI technology
3. **Single Provider**: Only one UI provider can be registered at a time
4. **Validation First**: Providers are validated before registration
5. **Lifecycle Management**: Proper mount/unmount handling for resource cleanup

## UIProvider Interface

```typescript
interface UIProvider {
  mount(target: unknown, context: RuntimeContext): void | Promise<void>;
  renderScreen(screen: ScreenDefinition): unknown | Promise<unknown>;
  unmount?(): void | Promise<void>;
}
```

### Required Methods

1. **mount()**: Initialize the UI and prepare for rendering
   - Receives a mount target (DOM element, terminal, etc.)
   - Gets RuntimeContext for accessing runtime subsystems
   - Can be async for complex initialization

2. **renderScreen()**: Render a specific screen
   - Receives a ScreenDefinition with id, title, and component
   - Returns rendered output (React element, HTML string, etc.)
   - Can be async for data fetching

### Optional Methods

3. **unmount()**: Cleanup and shutdown the UI
   - Called during runtime shutdown
   - Releases resources (event listeners, timers, etc.)
   - Can be async for cleanup operations

## Use Cases

### Use Case 1: Terminal/CLI Applications

**Scenario**: Build a command-line tool with interactive menus and screens

**Implementation**: Terminal UI Provider (see `example/ui/terminal-ui-provider.ts`)

**Benefits**:
- No browser or DOM required
- Works in any terminal environment
- Perfect for developer tools, admin utilities, and automation scripts
- Lightweight and fast

**Example**:
```typescript
const terminalUIProvider = new TerminalUIProvider();
runtime.setUIProvider(terminalUIProvider);
await terminalUIProvider.mount(null, context);
```

**Features Demonstrated**:
- Screen navigation with numbered menus
- Action execution through keyboard input
- Event logging in real-time
- Formatted output with borders and separators
- Interactive prompts for action parameters

### Use Case 2: React Web Applications

**Scenario**: Build a modern web application with React components

**Implementation**: React UI Provider (hypothetical)

**Benefits**:
- Full React ecosystem (hooks, context, routing)
- Rich component libraries (Material-UI, Ant Design)
- Modern web features (animations, responsive design)
- Browser APIs (localStorage, fetch, WebSockets)

**Example**:
```typescript
class ReactUIProvider implements UIProvider {
  private root: ReactDOM.Root | null = null;
  
  mount(target: HTMLElement, context: RuntimeContext): void {
    this.root = ReactDOM.createRoot(target);
    this.root.render(<App context={context} />);
  }
  
  renderScreen(screen: ScreenDefinition): React.ReactElement {
    const Component = componentRegistry[screen.component];
    return <Component screen={screen} />;
  }
  
  unmount(): void {
    this.root?.unmount();
  }
}
```

### Use Case 3: Vue.js Applications

**Scenario**: Build a web application using Vue.js framework

**Implementation**: Vue UI Provider (hypothetical)

**Benefits**:
- Vue's reactive system
- Single-file components
- Vue ecosystem (Vuex, Vue Router)
- Progressive enhancement

**Example**:
```typescript
class VueUIProvider implements UIProvider {
  private app: App | null = null;
  
  mount(target: HTMLElement, context: RuntimeContext): void {
    this.app = createApp(AppComponent, { context });
    this.app.mount(target);
  }
  
  renderScreen(screen: ScreenDefinition): VNode {
    const component = componentRegistry[screen.component];
    return h(component, { screen });
  }
  
  unmount(): void {
    this.app?.unmount();
  }
}
```

### Use Case 4: Server-Side Rendering (SSR)

**Scenario**: Generate HTML on the server for SEO and performance

**Implementation**: SSR UI Provider (hypothetical)

**Benefits**:
- Fast initial page load
- SEO-friendly content
- Works without JavaScript
- Progressive enhancement

**Example**:
```typescript
class SSRUIProvider implements UIProvider {
  mount(target: unknown, context: RuntimeContext): void {
    // No-op for SSR
  }
  
  renderScreen(screen: ScreenDefinition): string {
    const Component = componentRegistry[screen.component];
    return renderToString(<Component screen={screen} />);
  }
}
```

### Use Case 5: Native Mobile Applications

**Scenario**: Build mobile apps with React Native or NativeScript

**Implementation**: Native UI Provider (hypothetical)

**Benefits**:
- Native performance
- Platform-specific UI components
- Access to device APIs
- App store distribution

**Example**:
```typescript
class ReactNativeUIProvider implements UIProvider {
  mount(target: unknown, context: RuntimeContext): void {
    AppRegistry.registerComponent('App', () => 
      () => <App context={context} />
    );
  }
  
  renderScreen(screen: ScreenDefinition): React.ReactElement {
    const Component = componentRegistry[screen.component];
    return <Component screen={screen} />;
  }
}
```

### Use Case 6: Desktop Applications (Electron)

**Scenario**: Build cross-platform desktop applications

**Implementation**: Electron UI Provider (hypothetical)

**Benefits**:
- Native desktop experience
- File system access
- System tray integration
- Auto-updates

**Example**:
```typescript
class ElectronUIProvider implements UIProvider {
  private window: BrowserWindow | null = null;
  
  mount(target: unknown, context: RuntimeContext): void {
    this.window = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: { nodeIntegration: true }
    });
    this.window.loadFile('index.html');
  }
  
  renderScreen(screen: ScreenDefinition): void {
    this.window?.webContents.send('render-screen', screen);
  }
  
  unmount(): void {
    this.window?.close();
  }
}
```

### Use Case 7: Testing and Automation

**Scenario**: Automated testing without real UI rendering

**Implementation**: Mock UI Provider

**Benefits**:
- Fast test execution
- No browser dependencies
- Predictable behavior
- Easy assertions

**Example**:
```typescript
class MockUIProvider implements UIProvider {
  public mountCalled = false;
  public renderedScreens: ScreenDefinition[] = [];
  
  mount(target: unknown, context: RuntimeContext): void {
    this.mountCalled = true;
  }
  
  renderScreen(screen: ScreenDefinition): void {
    this.renderedScreens.push(screen);
  }
  
  unmount(): void {
    this.mountCalled = false;
    this.renderedScreens = [];
  }
}
```

### Use Case 8: Headless/API-Only Mode

**Scenario**: Run runtime without any UI for background jobs or APIs

**Implementation**: No UI Provider

**Benefits**:
- Minimal resource usage
- Perfect for microservices
- Background job processing
- API endpoints only

**Example**:
```typescript
const runtime = new Runtime();
runtime.registerPlugin(dataProcessingPlugin);
await runtime.initialize();

// No UI provider registered - runtime still fully functional
// Actions can be triggered programmatically
await runtime.getContext().actions.runAction('process-data', { batch: 1 });
```

## UIBridge Implementation Details

### Validation

The UIBridge validates providers at registration time:

```typescript
setProvider(provider: UIProvider): void {
  // Reject duplicate registration
  if (this.provider !== null) {
    throw new DuplicateRegistrationError('UIProvider', 'default');
  }

  // Validate required methods
  if (typeof provider.mount !== 'function') {
    throw new ValidationError('UIProvider', 'mount');
  }

  if (typeof provider.renderScreen !== 'function') {
    throw new ValidationError('UIProvider', 'renderScreen');
  }

  this.provider = provider;
}
```

### Lifecycle Management

The UIBridge manages provider lifecycle:

```typescript
async shutdown(): Promise<void> {
  if (this.provider?.unmount) {
    try {
      await Promise.resolve(this.provider.unmount());
      this.logger.debug('UI provider unmounted');
    } catch (error) {
      this.logger.error('UI provider unmount failed', error);
    }
  }
  this.provider = null;
}
```

### Error Handling

The UIBridge provides clear error messages:

```typescript
renderScreen(screen: ScreenDefinition): unknown {
  if (this.provider === null) {
    throw new Error('No UI provider registered');
  }

  return this.provider.renderScreen(screen);
}
```

## Integration Patterns

### Pattern 1: Direct Integration

Register UI provider directly with runtime:

```typescript
const runtime = new Runtime();
await runtime.initialize();
runtime.setUIProvider(myUIProvider);
await myUIProvider.mount(target, runtime.getContext());
```

### Pattern 2: Plugin-Based Integration

Register UI provider as a plugin:

```typescript
const uiPlugin = {
  name: 'react-ui',
  version: '1.0.0',
  setup(context) {
    const provider = new ReactUIProvider();
    context.getRuntime().setUIProvider(provider);
    provider.mount(document.getElementById('root'), context);
  }
};

runtime.registerPlugin(uiPlugin);
await runtime.initialize();
```

### Pattern 3: Lazy Loading

Load UI provider only when needed:

```typescript
const runtime = new Runtime();
await runtime.initialize();

// Later, when UI is needed
const { ReactUIProvider } = await import('./ui/react-provider.js');
const provider = new ReactUIProvider();
runtime.setUIProvider(provider);
await provider.mount(target, runtime.getContext());
```

## Best Practices

### 1. Validate Early

Always validate provider implementation before registration:

```typescript
function validateProvider(provider: UIProvider): void {
  if (!provider.mount || typeof provider.mount !== 'function') {
    throw new Error('Provider must implement mount()');
  }
  if (!provider.renderScreen || typeof provider.renderScreen !== 'function') {
    throw new Error('Provider must implement renderScreen()');
  }
}
```

### 2. Handle Async Operations

Support both sync and async provider methods:

```typescript
async mount(target: unknown, context: RuntimeContext): Promise<void> {
  // Async initialization
  await this.loadResources();
  await this.connectWebSocket();
  this.render();
}
```

### 3. Cleanup Resources

Always implement unmount() for proper cleanup:

```typescript
async unmount(): Promise<void> {
  // Remove event listeners
  this.eventListeners.forEach(cleanup => cleanup());
  
  // Close connections
  await this.websocket?.close();
  
  // Clear timers
  this.timers.forEach(timer => clearTimeout(timer));
  
  // Unmount UI
  this.root?.unmount();
}
```

### 4. Use RuntimeContext

Access runtime subsystems through context:

```typescript
mount(target: unknown, context: RuntimeContext): void {
  // Subscribe to events
  context.events.on('data:updated', this.handleDataUpdate);
  
  // Register actions
  context.actions.registerAction({
    id: 'ui:refresh',
    handler: () => this.refresh()
  });
  
  // Get screens
  const screens = context.screens.getAllScreens();
}
```

### 5. Error Boundaries

Implement error handling in providers:

```typescript
renderScreen(screen: ScreenDefinition): React.ReactElement {
  try {
    const Component = this.getComponent(screen.component);
    return (
      <ErrorBoundary>
        <Component screen={screen} />
      </ErrorBoundary>
    );
  } catch (error) {
    return <ErrorScreen error={error} />;
  }
}
```

## Comparison with Other Approaches

### vs. Built-in UI Framework

**UIBridge Approach** (Skeleton Crew):
- ✅ Framework agnostic
- ✅ Minimal core size
- ✅ Works without UI
- ✅ Easy to test
- ❌ Requires provider implementation

**Built-in Framework** (e.g., React-only):
- ❌ Locked to one framework
- ❌ Larger bundle size
- ❌ Requires browser/DOM
- ❌ Harder to test
- ✅ Works out of the box

### vs. No UI Abstraction

**UIBridge Approach**:
- ✅ Consistent interface
- ✅ Swappable implementations
- ✅ Testable
- ✅ Documented contract
- ❌ Extra abstraction layer

**No Abstraction**:
- ❌ Tight coupling
- ❌ Hard to swap
- ❌ Difficult to test
- ❌ No clear contract
- ✅ Direct access

## Real-World Examples

### Example 1: Internal Admin Tool

```typescript
// Start with terminal UI for quick development
const terminalProvider = new TerminalUIProvider();
runtime.setUIProvider(terminalProvider);

// Later, upgrade to web UI for broader access
const reactProvider = new ReactUIProvider();
runtime.setUIProvider(reactProvider);
```

### Example 2: Multi-Platform Application

```typescript
// Detect environment and load appropriate provider
const provider = process.env.PLATFORM === 'web'
  ? new ReactUIProvider()
  : process.env.PLATFORM === 'mobile'
  ? new ReactNativeUIProvider()
  : new TerminalUIProvider();

runtime.setUIProvider(provider);
```

### Example 3: Progressive Enhancement

```typescript
// Start with SSR for initial load
const ssrProvider = new SSRUIProvider();
const html = ssrProvider.renderScreen(homeScreen);

// Hydrate with React on client
const reactProvider = new ReactUIProvider();
runtime.setUIProvider(reactProvider);
await reactProvider.mount(document.getElementById('root'), context);
```

## Conclusion

The UIBridge feature enables Skeleton Crew Runtime to remain UI-agnostic while providing a clean, consistent interface for UI integration. This design allows the same runtime and plugins to work across:

- Terminal/CLI applications
- Web applications (React, Vue, Svelte, etc.)
- Mobile applications (React Native, NativeScript)
- Desktop applications (Electron, Tauri)
- Server-side rendering
- Testing and automation
- Headless/API-only modes

The key insight is that UI rendering is just one concern of an application runtime. By separating UI from core functionality, Skeleton Crew Runtime achieves maximum flexibility and reusability across different platforms and use cases.
