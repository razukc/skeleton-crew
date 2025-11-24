# Implementation Plan

- [x] 1. Set up project structure and configuration





  - [x] 1.1 Create project directory structure


    - Create demo/tab-manager/ directory
    - Create src/, tests/, and dist/ subdirectories
    - Create plugins/, components/, utils/, and types/ folders
    - _Requirements: 9.1, 10.1_


  - [x] 1.2 Configure build system

    - Create package.json with dependencies
    - Create tsconfig.json for TypeScript
    - Create vite.config.ts for bundling
    - Add build scripts for Chrome and Firefox
    - _Requirements: 14.1, 14.2_

  - [x] 1.3 Create manifest files


    - Create manifest.chrome.json for Chrome/Edge
    - Create manifest.firefox.json for Firefox
    - Define permissions (storage, tabs, tabGroups)
    - _Requirements: 14.1, 14.3, 14.5_

  - [x] 1.4 Set up testing framework


    - Configure Vitest for unit tests
    - Install fast-check for property-based testing
    - Create test directory structure
    - _Requirements: 15.1, 15.2_

- [x] 2. Implement browser adapter utility




  - [x] 2.1 Create browser API adapter


    - Implement browserAPI detection (chrome vs browser)
    - Create promisified wrappers for storage API
    - Create promisified wrappers for tabs API
    - Create promisified wrappers for tabGroups API
    - _Requirements: Cross-browser compatibility_

  - [x] 2.2 Implement feature detection


    - Create hasTabGroups() function
    - Create features object with capability flags
    - Export feature detection utilities
    - _Requirements: Cross-browser compatibility_

  - [ ]* 2.3 Write unit tests for browser adapter
    - Test Chrome API detection
    - Test Firefox API detection
    - Test promisified wrappers
    - Test feature detection
    - _Requirements: 15.1_

- [x] 3. Implement Storage Plugin





  - [x] 3.1 Create storage plugin structure


    - Define plugin with name and version
    - Implement setup callback
    - Register storage actions
    - _Requirements: 9.1, 12.1_

  - [x] 3.2 Implement storage actions

    - Implement storage:save action
    - Implement storage:load action
    - Implement storage:clear action
    - Add error handling for quota exceeded
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 3.3 Implement storage event emission

    - Emit storage:loaded on successful load
    - Emit storage:saved on successful save
    - Emit storage:error on failures
    - _Requirements: 11.1_

  - [ ]* 3.4 Write property test for storage persistence
    - **Property 9: Session storage persistence**
    - **Validates: Requirements 4.3**

  - [ ]* 3.5 Write property test for immediate save
    - **Property 37: Immediate save on update**
    - **Validates: Requirements 12.4**

  - [ ]* 3.6 Write property test for storage failure handling
    - **Property 36: Storage failure default values**
    - **Validates: Requirements 12.3**

- [-] 4. Implement Tabs Plugin



  - [x] 4.1 Create tabs plugin structure


    - Define plugin with name and version
    - Implement setup callback
    - Initialize tabs state
    - _Requirements: 9.1_

  - [x] 4.2 Implement tab query action

    - Implement tabs:query action
    - Query all tabs using browser API
    - Return tabs with title, URL, favicon
    - _Requirements: 1.1, 1.2_

  - [x] 4.3 Implement tab activation action

    - Implement tabs:activate action
    - Use chrome.tabs.update to activate
    - Emit tab:activated event
    - _Requirements: 7.1, 7.5_

  - [x] 4.4 Implement tab close action

    - Implement tabs:close action
    - Use chrome.tabs.remove to close
    - Emit tab:closed event
    - _Requirements: 8.2, 8.5_

  - [x] 4.5 Listen to browser tab events






    - Listen to chrome.tabs.onCreated
    - Listen to chrome.tabs.onUpdated
    - Listen to chrome.tabs.onRemoved
    - Emit corresponding runtime events
    - _Requirements: 1.5, 11.1_

  - [ ]* 4.6 Write property test for tab data completeness
    - **Property 1: Tab data completeness**
    - **Validates: Requirements 1.2**

  - [ ]* 4.7 Write property test for tab list refresh
    - **Property 3: Tab list refresh on update**
    - **Validates: Requirements 1.5**

  - [ ]* 4.8 Write property test for tab closure list update
    - **Property 23: Tab closure list update**
    - **Validates: Requirements 8.3**

  - [ ]* 4.9 Write property test for event emissions
    - **Property 22: Tab activation event emission**
    - **Property 24: Tab close event emission**
    - **Validates: Requirements 7.5, 8.5**

- [x] 5. Implement Search Plugin





  - [x] 5.1 Create search plugin structure


    - Define plugin with name and version
    - Implement setup callback
    - Initialize search state
    - _Requirements: 9.1_

  - [x] 5.2 Implement search filter action

    - Implement search:filter action
    - Filter tabs by title or URL (case-insensitive)
    - Return filtered tab list
    - _Requirements: 2.1_

  - [x] 5.3 Implement search clear action

    - Implement search:clear action
    - Restore full tab list
    - Emit search:cleared event
    - _Requirements: 2.3, 2.5_

  - [x] 5.4 Emit search events

    - Emit search:updated on filter
    - Emit search:cleared on clear
    - _Requirements: 11.1_

  - [ ]* 5.5 Write property test for search filtering
    - **Property 4: Search filtering correctness**
    - **Validates: Requirements 2.1**

  - [ ]* 5.6 Write property test for search clear restoration
    - **Property 5: Search clear restoration**
    - **Validates: Requirements 2.5**

- [x] 6. Implement Groups Plugin




  - [x] 6.1 Create groups plugin structure


    - Define plugin with name and version
    - Implement setup callback with feature detection
    - Skip registration if tabGroups not available
    - _Requirements: 9.1, Cross-browser_

  - [x] 6.2 Implement group creation action


    - Implement groups:create action
    - Use chrome.tabGroups.group API
    - Assign tabs to new group
    - Emit group:created event
    - _Requirements: 3.3, 3.5_

  - [x] 6.3 Implement group update action


    - Implement groups:update action
    - Update group title and color
    - Emit group:updated event
    - _Requirements: 11.1_

  - [x] 6.4 Implement group ungroup action


    - Implement groups:ungroup action
    - Remove tabs from group
    - Emit group:removed event
    - _Requirements: 11.1_

  - [ ]* 6.5 Write property test for group creation
    - **Property 6: Group creation assignment**
    - **Validates: Requirements 3.3**

  - [ ]* 6.6 Write property test for group event emission
    - **Property 7: Group creation event emission**
    - **Validates: Requirements 3.5**

  - [ ]* 6.7 Write property test for grouped tabs organization
    - **Property 2: Grouped tabs organization**
    - **Validates: Requirements 1.3**

- [x] 7. Implement Sessions Plugin




  - [x] 7.1 Create sessions plugin structure


    - Define plugin with name and version
    - Implement setup callback
    - Initialize sessions state
    - _Requirements: 9.1_

  - [x] 7.2 Implement session save action


    - Implement sessions:save action
    - Capture all open tabs with URLs, titles, groups
    - Generate unique session ID
    - Save to storage via storage plugin
    - Emit session:saved event
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 7.3 Implement session restore action


    - Implement sessions:restore action
    - Load session from storage
    - Create tabs for each saved tab
    - Recreate groups if they existed
    - Emit session:restored event
    - Handle errors gracefully
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 7.4 Implement session list action


    - Implement sessions:list action
    - Load all sessions from storage
    - Return sessions with names and dates
    - _Requirements: 5.1_

  - [x] 7.5 Implement session delete action


    - Implement sessions:delete action
    - Remove session from storage
    - Emit session:deleted event
    - _Requirements: 11.1_

  - [ ]* 7.6 Write property test for session capture
    - **Property 8: Session capture completeness**
    - **Validates: Requirements 4.1**

  - [ ]* 7.7 Write property test for session data structure
    - **Property 10: Session data structure**
    - **Validates: Requirements 4.4**

  - [ ]* 7.8 Write property test for session list completeness
    - **Property 12: Session list completeness**
    - **Validates: Requirements 5.1**

  - [ ]* 7.9 Write property test for session restore
    - **Property 13: Session restore completeness**
    - **Property 14: Session group restoration**
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 7.10 Write property test for session restore error handling
    - **Property 16: Session restore error handling**
    - **Validates: Requirements 5.5**

  - [ ]* 7.11 Write property test for session events
    - **Property 11: Session save event emission**
    - **Property 15: Session restore event emission**
    - **Validates: Requirements 4.5, 5.4**

- [x] 8. Implement duplicate detection functionality




  - [x] 8.1 Add duplicate detection to tabs plugin


    - Implement tabs:findDuplicates action
    - Identify tabs with identical URLs
    - Return duplicate groups with counts
    - Emit duplicates:found event
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Add duplicate closure to tabs plugin


    - Implement tabs:closeDuplicates action
    - Keep tab with most recent lastAccessed
    - Close remaining duplicate tabs
    - Emit duplicates:removed event
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ]* 8.3 Write property test for duplicate detection
    - **Property 17: Duplicate detection accuracy**
    - **Property 18: Duplicate count accuracy**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 8.4 Write property test for duplicate closure
    - **Property 19: Duplicate closure uniqueness**
    - **Property 20: Duplicate preservation strategy**
    - **Property 21: Duplicate removal event emission**
    - **Validates: Requirements 6.3, 6.4, 6.5**

- [x] 9. Implement background service worker





  - [x] 9.1 Create background script entry point


    - Import Skeleton Crew Runtime
    - Import all plugins
    - Create Runtime instance
    - _Requirements: 9.1, 14.2_

  - [x] 9.2 Register and initialize plugins

    - Register storage plugin
    - Register tabs plugin
    - Register search plugin
    - Register groups plugin
    - Register sessions plugin
    - Call runtime.initialize()
    - _Requirements: 9.1, 9.2_

  - [x] 9.3 Implement message handler

    - Listen to chrome.runtime.onMessage
    - Route action messages to runtime
    - Return results to sender
    - Handle errors
    - _Requirements: 10.4_

  - [x] 9.4 Implement event broadcaster

    - Listen to runtime events
    - Broadcast to all tabs if needed
    - Send to popup if open
    - _Requirements: 11.2_

  - [ ]* 9.5 Write property test for plugin initialization
    - **Property 25: Plugin setup execution order**
    - **Property 26: Action availability after registration**
    - **Validates: Requirements 9.2, 9.3**

  - [ ]* 9.6 Write property test for plugin disposal
    - **Property 28: Plugin dispose callback execution**
    - **Validates: Requirements 9.5**

- [ ] 10. Checkpoint - Ensure all plugin tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Create React UI components




  - [x] 11.1 Create TabList component


    - Display list of tabs with title, URL, favicon
    - Show active tab indicator
    - Show group organization
    - Handle tab click to activate
    - Show close button on hover
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 8.1_

  - [x] 11.2 Create SearchBar component


    - Input field for search query
    - Clear button
    - Debounce input (300ms)
    - Call search:filter action on change
    - Call search:clear action on clear
    - _Requirements: 2.1, 2.5_

  - [x] 11.3 Create SessionManager component


    - Display list of saved sessions
    - Show session name and date
    - Save button with name prompt
    - Restore button for each session
    - Delete button for each session
    - _Requirements: 4.2, 5.1, 5.2_

  - [x] 11.4 Create ActionBar component


    - Create Group button (if supported)
    - Find Duplicates button
    - Save Session button
    - Show loading states
    - Disable buttons when appropriate
    - _Requirements: 3.1, 6.1, 4.1, 13.3, 13.4_

  - [x] 11.5 Create main App component


    - Layout with search, tabs, actions, sessions
    - Connect to background via messages
    - Listen to events and update state
    - Handle errors and show messages
    - _Requirements: 13.1, 13.5_

- [x] 12. Implement popup UI integration




  - [x] 12.1 Create popup HTML entry point


    - Create popup/index.html
    - Add root div for React
    - Link to bundled JavaScript
    - Add basic styles
    - _Requirements: 13.1_

  - [x] 12.2 Create popup React entry point


    - Create popup/index.tsx
    - Import React and ReactDOM
    - Render App component
    - _Requirements: 10.2_

  - [x] 12.3 Implement message passing to background


    - Create executeAction helper
    - Send messages to background script
    - Handle responses
    - Handle errors
    - _Requirements: 10.4_

  - [x] 12.4 Implement event listening from background


    - Listen to chrome.runtime.onMessage
    - Update component state on events
    - Re-render UI on changes
    - _Requirements: 10.3, 11.2_

  - [ ]* 12.5 Write property test for UI-plugin communication
    - **Property 29: UI updates via events**
    - **Property 30: UI logic execution via actions**
    - **Validates: Requirements 10.3, 10.4**

- [-] 13. Implement event bus properties


  - [ ]* 13.1 Write property test for event delivery
    - **Property 27: Event delivery to all subscribers**
    - **Property 31: Operation event emission**
    - **Property 32: Event delivery to all listeners**
    - **Validates: Requirements 9.4, 11.1, 11.2**

  - [ ]* 13.2 Write property test for multiple listeners
    - **Property 33: Multiple listener invocation**
    - **Validates: Requirements 11.3**

  - [ ]* 13.3 Write property test for listener error isolation
    - **Property 34: Listener error isolation**
    - **Validates: Requirements 11.4**

  - [ ]* 13.4 Write property test for disposed plugin unsubscription
    - **Property 35: Disposed plugin unsubscription**
    - **Validates: Requirements 11.5**

- [ ] 14. Add styling and polish










  - [x] 14.1 Create CSS styles


    - Style tab list with consistent spacing
    - Style search bar
    - Style action buttons with icons
    - Style session manager
    - Add loading indicators
    - Add error message styles
    - _Requirements: 13.2, 13.3, 13.4, 13.5_

  - [x] 14.2 Add icons and assets


    - Create extension icons (16, 48, 128)
    - Add button icons
    - Add favicon placeholders
    - _Requirements: 13.3_

  - [x] 14.3 Implement responsive layout


    - Ensure popup works at different sizes
    - Add scrolling for long tab lists
    - Optimize for 400x600 popup size
    - _Requirements: 13.1_

- [x] 15. Implement cross-browser compatibility



  - [x] 15.1 Test browser adapter in Firefox


    - Load extension in Firefox
    - Verify browser API detection works
    - Verify promisified APIs work
    - Test feature detection
    - _Requirements: Cross-browser_

  - [x] 15.2 Create Firefox-specific manifest

    - Add browser_specific_settings
    - Use browser_action instead of action
    - Remove tabGroups permission
    - _Requirements: Cross-browser_

  - [x] 15.3 Test graceful degradation

    - Verify groups plugin skips in Firefox
    - Verify UI hides group button in Firefox
    - Verify other features work normally
    - _Requirements: Cross-browser_

  - [x] 15.4 Update build scripts

    - Add build:firefox script
    - Add package:firefox script
    - Test both builds
    - _Requirements: Cross-browser_

- [ ] 16. Integration testing
  - [ ]* 16.1 Write integration test for plugin communication
    - Test tabs plugin → sessions plugin flow
    - Test event propagation between plugins
    - Test storage plugin integration
    - _Requirements: 9.4, 11.2_

  - [ ]* 16.2 Write integration test for background-popup communication
    - Test action execution from popup
    - Test event delivery to popup
    - Test error handling
    - _Requirements: 10.3, 10.4_

- [x] 17. Manual testing and validation





  - [ ] 17.1 Test in Chrome
    - Load unpacked extension
    - Test all features
    - Verify tab operations
    - Verify session save/restore
    - Verify duplicate detection
    - Test with 100+ tabs
    - _Requirements: All_

  - [ ] 17.2 Test in Firefox
    - Load temporary extension
    - Test all features except groups
    - Verify graceful degradation
    - Test storage persistence
    - _Requirements: Cross-browser_

  - [ ] 17.3 Test in Edge
    - Load unpacked extension
    - Verify Chrome build works
    - Test all features
    - _Requirements: Cross-browser_

  - [ ] 17.4 Performance testing
    - Test with 10 tabs
    - Test with 100 tabs
    - Test with 500 tabs
    - Measure load times
    - Verify performance targets met
    - _Requirements: Performance_

- [x] 18. Documentation and README





  - [x] 18.1 Create README.md


    - Add project description
    - Add installation instructions
    - Add usage guide
    - Add development setup
    - Add testing instructions
    - _Requirements: All_

  - [x] 18.2 Document architecture


    - Explain plugin structure
    - Document message passing
    - Document event system
    - Add architecture diagram
    - _Requirements: 9.1, 10.1_

  - [x] 18.3 Add code comments


    - Comment plugin implementations
    - Comment complex logic
    - Add JSDoc for public APIs
    - _Requirements: All_

- [ ] 19. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
