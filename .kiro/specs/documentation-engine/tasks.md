# Implementation Plan

- [x] 1. Set up project structure and dependencies





  - Create demo/documentation-engine directory structure
  - Install dependencies: unified, remark, react, react-dom, minisearch, shiki, fast-check
  - Configure build tools (Vite for bundling)
  - Set up TypeScript configuration
  - _Requirements: All_

- [x] 2. Implement Component Registry Plugin





  - [x] 2.1 Create component registry core functionality


    - Implement register, get, has, and getAll methods
    - Add component storage using Map
    - Implement error handling for duplicate registrations
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [ ]* 2.2 Write property test for component registration
    - **Property 29: Component availability after registration**
    - **Validates: Requirements 7.4**
  
  - [ ]* 2.3 Write property test for component resolution
    - **Property 27: Component name resolution**
    - **Validates: Requirements 7.2**
  
  - [ ]* 2.4 Write property test for missing component errors
    - **Property 28: Missing component error handling**
    - **Validates: Requirements 7.3**

- [x] 3. Implement Router Plugin







  - [ ] 3.1 Create router core with route mapping
    - Implement route storage using Map<path, screenId>
    - Add registerRoute and getScreenForPath methods
    - Integrate with browser History API


    - _Requirements: 2.1_
  
  - [ ] 3.2 Implement navigation actions
    - Create router:navigate action handler
    - Create router:back action handler


    - Create router:forward action handler
    - Emit router:navigated events
    - _Requirements: 2.2, 2.3, 2.4, 11.2_
  
  - [ ] 3.3 Add error handling for invalid paths
    - Implement 404 error handling
    - Emit router:error events
    - _Requirements: 2.5_
  
  - [ ]* 3.4 Write property test for path mapping
    - **Property 5: Path to screen mapping**
    - **Validates: Requirements 2.1**
  
  - [ ]* 3.5 Write property test for URL updates
    - **Property 6: URL update without reload**
    - **Validates: Requirements 2.2**
  
  - [ ]* 3.6 Write property test for history navigation
    - **Property 7: Browser history navigation**
    - **Validates: Requirements 2.3, 2.4**
  
  - [ ]* 3.7 Write property test for invalid path handling
    - **Property 8: Invalid path error handling**
    - **Validates: Requirements 2.5**
  
  - [ ]* 3.8 Write property test for navigation events
    - **Property 43: Navigation event emission**
    - **Validates: Requirements 11.2**

- [-] 4. Implement Markdown Plugin



  - [x] 4.1 Set up markdown parsing pipeline


    - Configure unified with remark-parse, remark-frontmatter, remark-mdx
    - Implement file scanning for docs directory
    - Add frontmatter extraction logic
    - _Requirements: 1.1, 1.2_
  
  - [x] 4.2 Implement heading and code block extraction





    - Extract heading hierarchy from AST
    - Extract code blocks with language info
    - Generate heading IDs for anchors
    - _Requirements: 1.3, 1.4_
  
  - [x] 4.3 Implement screen registration





    - Register each markdown file as a screen
    - Emit markdown:page-registered events
    - Store metadata in screen definition
    - _Requirements: 1.1, 11.1_
  
  - [x] 4.4 Add MDX component identification




    - Parse MDX component syntax
    - Extract component names and props
    - _Requirements: 7.1_
  
  - [ ]* 4.5 Write property test for file registration
    - **Property 1: Markdown file registration**
    - **Validates: Requirements 1.1**
  
  - [ ]* 4.6 Write property test for frontmatter extraction
    - **Property 2: Frontmatter extraction**
    - **Validates: Requirements 1.2**
  
  - [ ]* 4.7 Write property test for code block preservation
    - **Property 3: Code block preservation**
    - **Validates: Requirements 1.3**
  
  - [ ]* 4.8 Write property test for heading extraction
    - **Property 4: Heading hierarchy extraction**
    - **Validates: Requirements 1.4**
  
  - [ ]* 4.9 Write property test for MDX component identification
    - **Property 26: MDX component identification**
    - **Validates: Requirements 7.1**
  
  - [ ]* 4.10 Write property test for page registration events
    - **Property 42: Page registration event emission**
    - **Validates: Requirements 11.1**

- [x] 5. Implement React UI Plugin





  - [x] 5.1 Create Layout component


    - Implement responsive layout with sidebar and content areas
    - Add header with theme toggle and search
    - Handle mobile/desktop layouts
    - _Requirements: 12.1, 12.2, 12.5_
  


  - [x] 5.2 Create Sidebar component

    - Render navigation tree
    - Highlight active page
    - Handle click navigation

    - _Requirements: 3.3_
  
  - [x] 5.3 Create SearchBar component

    - Implement search input
    - Display search results
    - Handle result selection
    - _Requirements: 4.3, 4.4_
  
  - [x] 5.4 Create ThemeToggle component


    - Implement toggle button
    - Display current theme
    - Trigger theme actions
    - _Requirements: 6.1_
  
  - [x] 5.5 Create MarkdownPage component


    - Render markdown content
    - Resolve MDX components from registry
    - Display table of contents
    - _Requirements: 7.2, 7.5_
  
  - [ ]* 5.6 Write property test for component prop passing
    - **Property 30: Component prop passing**
    - **Validates: Requirements 7.5**

- [x] 6. Checkpoint - Ensure core functionality works





  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Sidebar Plugin




  - [x] 7.1 Create navigation tree builder


    - Scan registered screens on initialization
    - Build hierarchical tree from folder structure
    - Listen to markdown:page-registered events
    - _Requirements: 3.1, 3.2_
  
  - [x] 7.2 Implement sorting logic


    - Sort by order metadata when present
    - Fall back to alphabetical sorting
    - _Requirements: 3.4, 3.5_
  
  - [x] 7.3 Add active page tracking


    - Listen to router:navigated events
    - Update active page state
    - _Requirements: 3.3_
  
  - [ ]* 7.4 Write property test for tree construction
    - **Property 9: Navigation tree construction**
    - **Validates: Requirements 3.1**
  
  - [ ]* 7.5 Write property test for hierarchical organization
    - **Property 10: Hierarchical organization**
    - **Validates: Requirements 3.2**
  
  - [ ]* 7.6 Write property test for active page highlighting
    - **Property 11: Active page highlighting**
    - **Validates: Requirements 3.3**
  
  - [ ]* 7.7 Write property test for order-based sorting
    - **Property 12: Order-based sorting**
    - **Validates: Requirements 3.4**
  
  - [ ]* 7.8 Write property test for alphabetical sorting
    - **Property 13: Alphabetical fallback sorting**
    - **Validates: Requirements 3.5**

- [x] 8. Implement Search Plugin




  - [x] 8.1 Set up MiniSearch index


    - Configure MiniSearch with fields and options
    - Listen to markdown:page-registered events
    - Index page content on registration
    - _Requirements: 4.1_
  
  - [x] 8.2 Implement search action

    - Create search:query action handler
    - Execute search against index
    - Emit search:results events
    - _Requirements: 4.2, 11.3_
  
  - [x] 8.3 Format search results

    - Extract title, path, and snippets
    - Rank by relevance score
    - Handle empty results
    - _Requirements: 4.3, 4.5_
  
  - [ ]* 8.4 Write property test for page indexing
    - **Property 14: Page indexing**
    - **Validates: Requirements 4.1**
  
  - [ ]* 8.5 Write property test for search matching
    - **Property 15: Search query matching**
    - **Validates: Requirements 4.2**
  
  - [ ]* 8.6 Write property test for result format
    - **Property 16: Search result format**
    - **Validates: Requirements 4.3**
  
  - [ ]* 8.7 Write property test for result navigation
    - **Property 17: Search result navigation**
    - **Validates: Requirements 4.4**
  
  - [ ]* 8.8 Write property test for search events
    - **Property 44: Search results event emission**
    - **Validates: Requirements 11.3**

- [x] 9. Implement Code Block Plugin





  - [x] 9.1 Set up Shiki syntax highlighter


    - Configure Shiki with themes
    - Load language grammars
    - _Requirements: 5.1_
  
  - [x] 9.2 Create CodeBlock component


    - Render highlighted code
    - Add line numbers
    - Add copy-to-clipboard button
    - _Requirements: 5.2, 5.3, 5.4_
  
  - [x] 9.3 Implement theme integration


    - Listen to theme:changed events
    - Update syntax highlighting theme
    - _Requirements: 5.5_
  
  - [x] 9.4 Register CodeBlock in component registry


    - Make available for markdown rendering
    - _Requirements: 7.4_
  
  - [ ]* 9.5 Write property test for syntax highlighting
    - **Property 18: Syntax highlighting application**
    - **Validates: Requirements 5.1**
  
  - [ ]* 9.6 Write property test for line numbers
    - **Property 19: Line number display**
    - **Validates: Requirements 5.2**
  
  - [ ]* 9.7 Write property test for copy button
    - **Property 20: Copy button display**
    - **Validates: Requirements 5.3**
  
  - [ ]* 9.8 Write property test for clipboard copy
    - **Property 21: Clipboard copy functionality**
    - **Validates: Requirements 5.4**
  
  - [ ]* 9.9 Write property test for theme-aware highlighting
    - **Property 22: Theme-aware syntax highlighting**
    - **Validates: Requirements 5.5**

- [x] 10. Implement Theme Plugin




  - [x] 10.1 Create theme state management


    - Initialize theme from localStorage or system preference
    - Implement theme storage
    - _Requirements: 6.3, 6.5_
  

  - [x] 10.2 Implement theme actions

    - Create theme:toggle action handler
    - Create theme:set action handler
    - Emit theme:changed events
    - _Requirements: 6.1, 6.4, 11.4_

  
  - [x] 10.3 Add theme persistence

    - Save theme to localStorage on change
    - Load theme on initialization
    - _Requirements: 6.2, 6.3_
  
  - [ ]* 10.4 Write property test for theme toggle idempotence
    - **Property 23: Theme toggle idempotence**
    - **Validates: Requirements 6.1**
  
  - [ ]* 10.5 Write property test for theme persistence
    - **Property 24: Theme persistence round-trip**
    - **Validates: Requirements 6.2, 6.3**
  
  - [ ]* 10.6 Write property test for theme events
    - **Property 25: Theme change event emission**
    - **Validates: Requirements 6.4**
  
  - [ ]* 10.7 Write property test for theme event emission
    - **Property 45: Theme change event emission**
    - **Validates: Requirements 11.4**

- [x] 11. Checkpoint - Ensure feature plugins work







  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Callout Component




  - [x] 12.1 Create Callout component


    - Implement rendering with type-based styling
    - Add icons for info, warning, error types
    - Apply appropriate colors
    - _Requirements: 13.2, 13.3, 13.4, 13.5_
  
  - [x] 12.2 Register Callout in component registry


    - Make available for MDX usage
    - _Requirements: 7.4, 13.1_
  
  - [ ]* 12.3 Write property test for type-based styling
    - **Property 48: Callout type-based styling**
    - **Validates: Requirements 13.2**

- [x] 13. Implement Playground Plugin





  - [x] 13.1 Create Playground component


    - Implement code editor (use CodeMirror or Monaco)
    - Add preview pane
    - Implement error boundary
    - _Requirements: 8.1, 8.3_
  

  - [x] 13.2 Add real-time preview updates


    - Debounce code changes
    - Re-render preview on change
    - _Requirements: 8.2_

  
  - [x] 13.3 Implement preset examples


    - Add preset dropdown
    - Switch between examples

    - _Requirements: 8.4_
  
  - [x] 13.4 Add state preservation


    - Store modified code in session storage

    - Restore on navigation return
    - _Requirements: 8.5_
  
  - [x] 13.5 Register Playground in component registry


    - Make available for MDX usage
    - _Requirements: 7.4_
  
  - [ ]* 13.6 Write property test for real-time updates
    - **Property 31: Real-time preview updates**
    - **Validates: Requirements 8.2**
  
  - [ ]* 13.7 Write property test for error handling
    - **Property 32: Error handling without crashes**
    - **Validates: Requirements 8.3**
  
  - [ ]* 13.8 Write property test for state preservation
    - **Property 33: Playground state preservation**
    - **Validates: Requirements 8.5**

- [x] 14. Implement Versioning Plugin





  - [x] 14.1 Create version configuration loader


    - Load version config from file
    - Parse version definitions
    - _Requirements: 9.1_
  
  - [x] 14.2 Create version selector component


    - Display available versions
    - Handle version selection
    - _Requirements: 9.2_
  
  - [x] 14.3 Implement version switching


    - Create version:switch action
    - Navigate to equivalent page in new version
    - Handle missing pages
    - _Requirements: 9.3, 9.4_
  
  - [x] 14.4 Add default version handling


    - Apply default version when none specified
    - _Requirements: 9.5_
  
  - [ ]* 14.5 Write property test for version display
    - **Property 34: Version selector display**
    - **Validates: Requirements 9.2**
  
  - [ ]* 14.6 Write property test for version switching
    - **Property 35: Version switching navigation**
    - **Validates: Requirements 9.3**
  
  - [ ]* 14.7 Write property test for missing page fallback
    - **Property 36: Missing page fallback**
    - **Validates: Requirements 9.4**

- [x] 15. Implement Cache Plugin







  - [ ] 15.1 Create cache storage
    - Implement Map-based cache
    - Add timestamp tracking
    - Configure TTL


    - _Requirements: 14.1_
  
  - [ ] 15.2 Implement cache retrieval
    - Check cache on screen requests


    - Serve cached content if valid
    - Emit cache:hit events
    - _Requirements: 14.2, 14.3_
  


  - [ ] 15.3 Add cache expiration
    - Check TTL on retrieval
    - Re-render expired content
    - Update cache
    - _Requirements: 14.4_
  
  - [ ] 15.4 Implement LRU eviction
    - Track access times
    - Evict least recently used when full
    - _Requirements: 14.5_
  
  - [ ]* 15.5 Write property test for cache storage
    - **Property 49: Screen caching with timestamp**
    - **Validates: Requirements 14.1**
  
  - [ ]* 15.6 Write property test for cache serving
    - **Property 50: Cached content serving**
    - **Validates: Requirements 14.2**
  
  - [ ]* 15.7 Write property test for cache hit events
    - **Property 51: Cache hit event emission**
    - **Validates: Requirements 14.3**
  
  - [ ]* 15.8 Write property test for cache expiration
    - **Property 52: Cache expiration and refresh**
    - **Validates: Requirements 14.4**
  
  - [ ]* 15.9 Write property test for LRU eviction
    - **Property 53: LRU cache eviction**
    - **Validates: Requirements 14.5**

- [x] 16. Implement Static Export Plugin





  - [x] 16.1 Create export action handler


    - Implement export:static action
    - Get all registered screens
    - _Requirements: 10.1_
  
  - [x] 16.2 Implement screen rendering to HTML

    - Render each screen to static HTML
    - Preserve URL path structure
    - Handle rendering errors gracefully
    - _Requirements: 10.2, 10.5_
  
  - [x] 16.3 Add asset copying

    - Copy all files from assets directory
    - Maintain directory structure
    - _Requirements: 10.3_
  
  - [x] 16.4 Add export reporting

    - Count generated pages
    - Report errors
    - _Requirements: 10.4_
  
  - [ ]* 16.5 Write property test for complete export
    - **Property 37: Complete screen export**
    - **Validates: Requirements 10.1**
  
  - [ ]* 16.6 Write property test for path preservation
    - **Property 38: Path structure preservation**
    - **Validates: Requirements 10.2**
  
  - [ ]* 16.7 Write property test for asset copying
    - **Property 39: Asset copying**
    - **Validates: Requirements 10.3**
  
  - [ ]* 16.8 Write property test for export reporting
    - **Property 40: Export completion reporting**
    - **Validates: Requirements 10.4**
  
  - [ ]* 16.9 Write property test for error resilience
    - **Property 41: Export error resilience**
    - **Validates: Requirements 10.5**

- [x] 17. Implement Build-Time Optimization





  - [x] 17.1 Create build-time parser


    - Parse all markdown during build
    - Serialize to JSON
    - _Requirements: 15.1, 15.2_
  
  - [x] 17.2 Implement pre-parsed content loader


    - Load JSON instead of parsing at runtime
    - Skip markdown parser in bundle
    - _Requirements: 15.3, 15.4_
  
  - [ ]* 17.3 Write property test for build-time parsing
    - **Property 54: Build-time markdown parsing**
    - **Validates: Requirements 15.1**
  
  - [ ]* 17.4 Write property test for serialization round-trip
    - **Property 55: Parsed content serialization round-trip**
    - **Validates: Requirements 15.2**
  
  - [ ]* 17.5 Write property test for pre-parsed loading
    - **Property 56: Pre-parsed content loading**
    - **Validates: Requirements 15.3**
  
  - [ ]* 17.6 Write property test for bundle size reduction
    - **Property 57: Bundle size reduction**
    - **Validates: Requirements 15.4**



- [ ] 18. Create sample documentation content



  - [ ] 18.1 Create sample markdown files
    - Write index.md (homepage)
    - Write getting-started.md
    - Write guides/plugins.md
    - Write api/runtime.md
    - Add frontmatter to all files


    - _Requirements: 1.1, 1.2_
  
  - [ ] 18.2 Add code examples
    - Include code blocks with various languages
    - Add MDX components (Callout, Playground)
    - _Requirements: 1.3, 7.1_

- [x] 19. Create main application entry point




  - [x] 19.1 Initialize runtime and register plugins


    - Create Runtime instance
    - Register all plugins in correct order
    - Initialize runtime
    - _Requirements: All_
  


  - [ ] 19.2 Set up initial navigation
    - Navigate to homepage on load
    - Handle initial URL routing


    - _Requirements: 2.1_
  
  - [ ] 19.3 Configure build scripts
    - Add dev server script
    - Add production build script
    - Add static export script
    - _Requirements: 10.1_

- [x] 20. Write property test for event delivery





  - **Property 46: Event delivery to all listeners**
  - **Validates: Requirements 11.5**

- [ ] 21. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
