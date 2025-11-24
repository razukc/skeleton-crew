# Tab Manager Extension

A modern browser extension built on [Skeleton Crew Runtime](../../README.md) that helps you organize, search, and manage your browser tabs efficiently. This extension demonstrates the power of plugin-based architecture for building modular, testable browser extensions.

## Features

- 📋 **Tab List View** - View all open tabs across all windows in one place
- 🔍 **Search Tabs** - Quickly find tabs by title or URL with real-time filtering
- 📁 **Tab Groups** - Organize related tabs into color-coded groups (Chrome/Edge only)
- 💾 **Session Management** - Save and restore tab sessions for different workflows
- 🔄 **Duplicate Detection** - Find and close duplicate tabs to reduce clutter
- ⚡ **Fast & Lightweight** - Built with performance in mind
- 🔌 **Plugin Architecture** - Modular design using Skeleton Crew Runtime
- 🌐 **Cross-Browser** - Works on Chrome, Edge, and Firefox

## Screenshots

![Tab Manager Popup](docs/screenshot-popup.png)
*Main popup interface showing tab list and search*

![Session Manager](docs/screenshot-sessions.png)
*Session management interface*

## Installation

### From Source (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/skeleton-crew-runtime.git
   cd skeleton-crew-runtime/demo/tab-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   
   For Chrome/Edge:
   ```bash
   npm run build:chrome
   ```
   
   For Firefox:
   ```bash
   npm run build:firefox
   ```

4. **Load the extension**

   **Chrome/Edge:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist-chrome` folder

   **Firefox:**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select any file in the `dist-firefox` folder

### From Release (Coming Soon)

The extension will be available on the Chrome Web Store and Firefox Add-ons once released.

## Usage

### Basic Operations

**View Tabs:**
- Click the extension icon to open the popup
- All open tabs are displayed with their titles and URLs
- Active tab is highlighted

**Search Tabs:**
- Type in the search bar to filter tabs by title or URL
- Search is case-insensitive and updates in real-time
- Click the X button to clear the search

**Switch to Tab:**
- Click any tab in the list to activate it
- The tab's window will be brought to the front
- The popup will close automatically

**Close Tabs:**
- Hover over a tab to reveal the close button (×)
- Click the close button to close that tab
- The tab list updates automatically

### Tab Groups (Chrome/Edge Only)

**Create a Group:**
- Select multiple tabs (Ctrl/Cmd + Click)
- Click the "Create Group" button
- Enter a name and choose a color
- Selected tabs are grouped together

**Manage Groups:**
- Groups are displayed with colored indicators
- Click a group name to collapse/expand it
- Right-click for group options

### Session Management

**Save a Session:**
- Click the "Save Session" button
- Enter a name for the session
- All open tabs and groups are saved

**Restore a Session:**
- Click the "Sessions" tab
- Select a saved session
- Click "Restore" to reopen all tabs

**Delete a Session:**
- Click the "Sessions" tab
- Click the delete button (🗑️) next to a session
- Confirm the deletion

### Duplicate Detection

**Find Duplicates:**
- Click the "Find Duplicates" button
- Duplicate tabs are highlighted
- A count of duplicates is shown

**Close Duplicates:**
- Click "Close Duplicates" after finding them
- The most recently accessed tab is kept
- All other duplicates are closed

## Development

### Project Structure

```
demo/tab-manager/
├── src/
│   ├── background/          # Background service worker
│   │   └── index.ts        # Runtime initialization
│   ├── plugins/            # Feature plugins
│   │   ├── storage.ts      # Data persistence
│   │   ├── tabs.ts         # Tab management
│   │   ├── search.ts       # Search functionality
│   │   ├── groups.ts       # Tab grouping
│   │   └── sessions.ts     # Session management
│   ├── components/         # React UI components
│   │   ├── App.tsx         # Main app component
│   │   ├── TabList.tsx     # Tab list display
│   │   ├── SearchBar.tsx   # Search input
│   │   ├── SessionManager.tsx  # Session UI
│   │   └── ActionBar.tsx   # Action buttons
│   ├── popup/              # Extension popup
│   │   ├── index.html      # Popup HTML
│   │   ├── index.tsx       # React entry point
│   │   └── styles.css      # Popup styles
│   ├── types/              # TypeScript types
│   │   └── index.ts        # Type definitions
│   └── utils/              # Utility functions
│       └── browser-adapter.ts  # Cross-browser API adapter
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── property/          # Property-based tests
│   └── integration/       # Integration tests
├── public/                # Static assets
│   └── icons/            # Extension icons
├── manifest.chrome.json   # Chrome manifest
├── manifest.firefox.json  # Firefox manifest
└── vite.config.ts        # Build configuration
```

### Available Scripts

```bash
# Development
npm run dev              # Build in watch mode
npm run type-check       # Run TypeScript type checking

# Building
npm run build            # Build for Chrome (default)
npm run build:chrome     # Build for Chrome/Edge
npm run build:firefox    # Build for Firefox
npm run build:all        # Build for all browsers

# Packaging
npm run package:chrome   # Create Chrome .zip
npm run package:firefox  # Create Firefox .zip

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Assets
npm run icons            # Generate icon placeholders
```

### Development Workflow

1. **Make changes** to source files in `src/`
2. **Run build** with `npm run dev` for auto-rebuild
3. **Reload extension** in browser
4. **Test changes** in the extension popup
5. **Run tests** with `npm test`
6. **Commit changes** when tests pass

### Testing

The extension includes comprehensive tests:

**Unit Tests:**
- Test individual plugins in isolation
- Mock browser APIs for testing
- Located in `tests/unit/`

**Property-Based Tests:**
- Test correctness properties across many inputs
- Use fast-check for property testing
- Located in `tests/property/`

**Integration Tests:**
- Test plugin interactions
- Test message passing between components
- Located in `tests/integration/`

Run tests:
```bash
npm test                    # Run all tests once
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Generate coverage report
```

### Adding New Features

To add a new feature:

1. **Create a plugin** in `src/plugins/`
2. **Register the plugin** in `src/background/index.ts`
3. **Add UI components** in `src/components/` if needed
4. **Write tests** in `tests/`
5. **Update documentation**

Example plugin structure:
```typescript
export const myPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  setup(context) {
    // Register actions
    context.actions.registerAction({
      id: 'my:action',
      handler: async (params) => {
        // Implementation
      }
    });
    
    // Subscribe to events
    context.events.on('some:event', (data) => {
      // Handle event
    });
  },
  
  dispose(context) {
    // Cleanup
  }
};
```

## Architecture

The Tab Manager Extension is built on **Skeleton Crew Runtime**, a minimal plugin-based application runtime. This architecture provides:

- **Modularity** - Features are isolated in plugins
- **Testability** - Plugins can be tested independently
- **Extensibility** - Easy to add new features
- **Maintainability** - Clear separation of concerns

### Core Components

**Runtime Layer:**
- Plugin Registry - Manages plugin lifecycle
- Action Engine - Executes plugin actions
- Event Bus - Handles cross-plugin communication
- Screen Registry - Manages UI screens

**Plugin Layer:**
- Storage Plugin - Data persistence
- Tabs Plugin - Tab management
- Search Plugin - Tab filtering
- Groups Plugin - Tab grouping
- Sessions Plugin - Session management

**UI Layer:**
- React Components - User interface
- Message Bridge - UI ↔ Background communication

### Communication Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Popup UI  │ ◄─────► │  Background  │ ◄─────► │   Browser   │
│   (React)   │ Messages│   Service    │   APIs  │     APIs    │
│             │         │   Worker     │         │             │
└─────────────┘         └──────┬───────┘         └─────────────┘
                               │
                        ┌──────▼──────┐
                        │  Skeleton   │
                        │    Crew     │
                        │   Runtime   │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
         │  Tabs   │     │ Sessions│     │ Storage │
         │ Plugin  │     │  Plugin │     │ Plugin  │
         └─────────┘     └─────────┘     └─────────┘
```

For detailed architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Browser Compatibility

| Feature | Chrome | Edge | Firefox | Opera | Brave |
|---------|--------|------|---------|-------|-------|
| Tab listing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tab groups | ✅ | ✅ | ❌ | ✅ | ✅ |
| Sessions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Duplicates | ✅ | ✅ | ✅ | ✅ | ✅ |

**Note:** Tab Groups are not available in Firefox due to API limitations. The extension gracefully degrades and hides group-related features in Firefox.

## Performance

The extension is optimized for performance:

- **Fast startup** - Loads in < 100ms
- **Efficient rendering** - Handles 500+ tabs smoothly
- **Low memory** - Minimal memory footprint
- **Debounced search** - 300ms debounce for smooth typing
- **Lazy loading** - Plugins load on-demand

## Troubleshooting

### Extension not loading

- Check that you've built the extension (`npm run build`)
- Verify the correct dist folder is selected (dist-chrome or dist-firefox)
- Check browser console for errors

### Tabs not showing

- Ensure the extension has "tabs" permission
- Check that the background service worker is running
- Look for errors in the extension's service worker console

### Search not working

- Clear the search input and try again
- Check browser console for JavaScript errors
- Verify the search plugin is registered

### Sessions not saving

- Check that the extension has "storage" permission
- Verify chrome.storage quota is not exceeded
- Check for storage errors in the console

### Groups not available

- Tab Groups are only available in Chrome/Edge
- Firefox does not support the Tab Groups API
- The extension will hide group features in unsupported browsers

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write tests for your changes
5. Run tests (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

Please ensure:
- All tests pass
- Code follows the existing style
- Documentation is updated
- Commit messages are clear

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Acknowledgments

- Built with [Skeleton Crew Runtime](../../README.md)
- Uses [React](https://react.dev/) for UI
- Bundled with [Vite](https://vitejs.dev/)
- Tested with [Vitest](https://vitest.dev/) and [fast-check](https://fast-check.dev/)

## Support

- 📖 [Documentation](../../README.md)
- 🐛 [Report a Bug](https://github.com/yourusername/skeleton-crew-runtime/issues)
- 💡 [Request a Feature](https://github.com/yourusername/skeleton-crew-runtime/issues)
- 💬 [Discussions](https://github.com/yourusername/skeleton-crew-runtime/discussions)

## Roadmap

- [ ] Chrome Web Store release
- [ ] Firefox Add-ons release
- [ ] Tab suspending for memory management
- [ ] Tab history and undo
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Export/import sessions
- [ ] Cloud sync for sessions
- [ ] Tab analytics and insights

---

**Made with ❤️ using Skeleton Crew Runtime**
