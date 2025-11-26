# Implementation Plan

- [x] 1. Set up example app structure and dependencies





  - Create `example/` directory structure with subdirectories for `ui/` and `plugins/`
  - Add npm script `"example": "tsx example/index.ts"` to package.json
  - Install `tsx` as dev dependency if not already present
  - Install `@types/node` for Node.js types (readline)
  - _Requirements: 10.1_

- [x] 2. Implement Counter Plugin





  - Create `example/plugins/counter.ts` with plugin definition
  - Implement counter state management (count variable starting at 0)
  - Register counter screen with id "counter", title "Counter", component "CounterScreen"
  - Implement increment action that increases count by 1 and emits counter:changed event
  - Implement decrement action that decreases count by 1 and emits counter:changed event
  - Implement reset action that sets count to 0 and emits counter:changed event
  - Export plugin as `counterPlugin`
  - _Requirements: 2.2, 4.1, 4.2, 4.3, 4.4_

- [x] 2.1 Write property test for counter increment behavior







  - **Property 4: Counter increment behavior**
  - **Validates: Requirements 4.2**

- [x] 2.2 Write property test for counter decrement behavior








  - **Property 5: Counter decrement behavior**
  - **Validates: Requirements 4.3**

- [x] 2.3 Write property test for counter change events






  - **Property 6: Counter change events**
  - **Validates: Requirements 4.4**

- [x] 3. Implement Settings Plugin





  - Create `example/plugins/settings.ts` with plugin definition
  - Implement settings state management (theme variable starting at 'light')
  - Register settings screen with id "settings", title "Settings", component "SettingsScreen"
  - Implement toggle-theme action that switches between 'light' and 'dark' and emits settings:changed event
  - Export plugin as `settingsPlugin`
  - _Requirements: 2.3, 5.1, 5.2, 5.3, 5.5_

- [x] 3.1 Write property test for theme toggle idempotence






  - **Property 7: Theme toggle idempotence**
  - **Validates: Requirements 5.2**

- [ ]* 3.2 Write property test for settings change events
  - **Property 8: Settings change events**
  - **Validates: Requirements 5.3**

- [ ]* 3.3 Write property test for settings display completeness
  - **Property 9: Settings display completeness**
  - **Validates: Requirements 5.5**

- [x] 4. Implement Enhanced Core Demo Plugin





- [x] 4.1 Create core demo plugin structure and home screen


  - Create `example/plugins/core-demo.ts` with plugin definition
  - Register home screen with id "home", title "Welcome to Skeleton Crew Playground", component "HomeScreen"
  - Add welcome message explaining the playground and available demos
  - Subscribe to runtime:initialized event to log startup message
  - Export plugin as `coreDemoPlugin`
  - _Requirements: 2.1, 2.4, 11.1_

- [x] 4.2 Implement plugin system demonstration screen


  - Register screen with id "demo-plugin-system", title "Plugin System Demo"
  - Display information about plugin registration and lifecycle
  - Show list of all registered plugins with names and versions
  - Add action to demonstrate plugin metadata access
  - _Requirements: 11.1, 11.2_

- [x] 4.3 Implement screen registry demonstration screen

  - Register screen with id "demo-screen-registry", title "Screen Registry Demo"
  - Display all registered screens with their IDs, titles, and components
  - Add action to inspect specific screen metadata
  - Show screen count and demonstrate screen lookup
  - _Requirements: 11.1, 11.3_

- [x] 4.4 Implement action engine demonstration screen

  - Register screen with id "demo-action-engine", title "Action Engine Demo"
  - Register demo:greet action (no parameters, returns greeting)
  - Register demo:greet-user action (accepts name parameter, returns personalized greeting)
  - Register demo:calculate action (accepts a, b, operation parameters, returns calculation result)
  - Display action execution results in real-time
  - _Requirements: 11.1, 11.4_

- [x] 4.5 Implement event bus demonstration screen

  - Register screen with id "demo-event-bus", title "Event Bus Demo"
  - Register demo:emit-event action that emits custom events
  - Subscribe to demo:event-emitted events and display in real-time
  - Show event propagation to multiple subscribers
  - Display event log with timestamps
  - _Requirements: 11.1, 11.5_

- [x] 4.6 Implement runtime context demonstration screen

  - Register screen with id "demo-runtime-context", title "Runtime Context Demo"
  - Register demo:list-plugins action (retrieves all plugins via context.plugins)
  - Register demo:list-screens action (retrieves all screens via context.screens)
  - Register demo:list-actions action (retrieves all actions via context.actions)
  - Demonstrate unified context API access to all subsystems
  - _Requirements: 11.1, 11.6_

- [x] 4.7 Add demo action event emissions

  - Emit demo:action-executed event when any demo action is triggered
  - Include action ID and parameters in event data
  - Subscribe to demo:action-executed to log action executions
  - _Requirements: 11.7_

- [ ]* 4.8 Write property test for demo screen registration completeness
  - **Property 15: Demo screen registration completeness**
  - **Validates: Requirements 11.1**

- [ ]* 4.9 Write property test for demo action execution
  - **Property 16: Demo action execution returns results**
  - **Validates: Requirements 11.4**

- [ ]* 4.10 Write property test for demo event propagation
  - **Property 17: Demo event emission propagation**
  - **Validates: Requirements 11.5**

- [ ]* 4.11 Write property test for demo action parameter validation
  - **Property 18: Demo action parameter validation**
  - **Validates: Requirements 11.4**

- [x] 4.12 Write property test for plugin screen registration completeness
  - **Property 1: Plugin screen registration completeness**
  - **Validates: Requirements 2.4**

- [x] 5. Implement Terminal UI Provider - Core Structure





  - Create `example/ui/terminal-ui-provider.ts` with UIProvider interface implementation
  - Define TerminalUIProvider class with state properties (currentScreen, eventLog, readline interface)
  - Implement mount method that initializes readline, displays welcome message, and shows screen menu
  - Implement renderScreen method that displays screen title, content, and action menu
  - Implement unmount method that closes readline and cleans up
  - Export provider instance as `terminalUIProvider`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6. Implement Terminal UI Provider - Screen Rendering





  - Implement displayScreenMenu method that lists all registered screens from context
  - Implement screen-specific rendering logic for HomeScreen, CounterScreen, and SettingsScreen
  - Format screen output with headers, current state, and action options
  - Handle screen component identifier mapping
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 5.1, 5.5_

- [ ]* 6.1 Write property test for screen menu completeness
  - **Property 2: Screen menu completeness**
  - **Validates: Requirements 3.1**

- [ ]* 6.2 Write property test for screen rendering includes title
  - **Property 3: Screen rendering includes title**
  - **Validates: Requirements 3.3**

- [ ]* 6.3 Write property test for screen rendering produces output
  - **Property 14: Screen rendering produces output**
  - **Validates: Requirements 8.5**

- [x] 7. Implement Terminal UI Provider - User Input Handling





  - Implement handleUserInput method to process user commands
  - Handle screen selection from menu (numeric input)
  - Handle action selection within screens (letter input)
  - Handle back command to return to screen menu
  - Handle exit command to shutdown runtime
  - Display error messages for invalid input
  - _Requirements: 3.2, 3.4, 3.5_

- [x] 8. Implement Terminal UI Provider - Event Logging
  - Implement logEvent method to add events to eventLog array
  - Subscribe to counter:changed and settings:changed events in mount method
  - Display event logs in formatted output with event name and data
  - Limit event log size to prevent memory issues (keep last 10 events)
  - _Requirements: 6.2, 6.3, 6.4, 7.5_

- [ ]* 8.1 Write property test for event log completeness
  - **Property 13: Event log completeness**
  - **Validates: Requirements 7.5**

- [x] 9. Implement Terminal UI Provider - Visual Formatting





  - Implement formatting helpers for headers, action menus, and event logs
  - Display plugin initialization messages during mount
  - Format screen headers with borders or separators
  - Format action options as numbered or lettered lists
  - Display action execution confirmations
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 9.1 Write property test for plugin initialization logging
  - **Property 10: Plugin initialization logging**
  - **Validates: Requirements 7.1**

- [ ]* 9.2 Write property test for screen header formatting
  - **Property 11: Screen header formatting**
  - **Validates: Requirements 7.2**

- [ ]* 9.3 Write property test for action menu display
  - **Property 12: Action menu display**
  - **Validates: Requirements 7.3**

- [x] 10. Implement Main Entry Point





  - Create `example/index.ts` as the main entry point
  - Import Runtime from skeleton-crew runtime
  - Import all three plugins (coreDemoPlugin, counterPlugin, settingsPlugin)
  - Import terminalUIProvider
  - Create Runtime instance with default ConsoleLogger
  - Register all plugins using runtime.registerPlugin before initialization
  - Call runtime.initialize() to start the application
  - Get RuntimeContext using runtime.getContext()
  - Register Terminal UI Provider using runtime.setUIProvider()
  - Call terminalUIProvider.mount() to start user interaction
  - Handle process signals (SIGINT, SIGTERM) for graceful shutdown
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.2, 10.3, 10.4, 10.5_

- [ ]* 10.1 Write integration test for full initialization sequence
  - Test that entry point creates runtime, registers plugins, initializes, and registers UI provider
  - Verify runtime:initialized event is emitted
  - _Requirements: 1.4, 2.1, 2.2, 2.3_

- [ ]* 10.2 Write integration test for screen navigation flow
  - Test that user can navigate from menu to screen and back
  - _Requirements: 3.2, 3.4_

- [ ]* 10.3 Write integration test for action execution flow
  - Test that actions execute and update state correctly
  - _Requirements: 4.2, 4.3, 5.2_

- [ ]* 10.4 Write integration test for event propagation
  - Test that events emitted by plugins are received by UI provider
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Add example app documentation








  - Create `example/README.md` with overview and usage instructions
  - Document how to run the example: `npm run example`
  - Document the plugin architecture and how to extend
  - Add code comments explaining key concepts
  - _Requirements: 1.1, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 13. Manual testing and polish
  - Run `npm run example` and verify all features work
  - Test all navigation paths
  - Test all actions (increment, decrement, reset, toggle theme)
  - Verify event logging displays correctly
  - Verify graceful shutdown on exit
  - Polish terminal output formatting for readability
  - _Requirements: All requirements_
