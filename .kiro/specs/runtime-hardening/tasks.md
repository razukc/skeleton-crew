# Implementation Plan

- [x] 1. Add error classes and logger interface to types.ts





  - Add ValidationError class with resourceType, field, and optional resourceId
  - Add DuplicateRegistrationError class with resourceType and identifier
  - Add ActionTimeoutError class with actionId and timeoutMs
  - Add ActionExecutionError class with actionId and cause
  - Add Logger interface with debug, info, warn, error methods
  - Add RuntimeState enum with all lifecycle states
  - Export all new types from types.ts
  - _Requirements: 6.1, 6.2, 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5, 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 2. Update ActionDefinition with generic types and timeout





  - Add generic type parameters P and R to ActionDefinition interface
  - Update handler signature to use generic types
  - Add optional timeout property to ActionDefinition
  - Update RuntimeContext actions API to use generics
  - Maintain backward compatibility with unknown defaults
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 3. Update UIProvider interface with enhanced lifecycle





  - Add RuntimeContext parameter to mount method
  - Change renderScreen method name from render to renderScreen
  - Add optional unmount method
  - Update UIBridge to use new interface
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4. Update RuntimeContext interface with new APIs





  - Update registerScreen to return unregister function
  - Update registerAction to return unregister function
  - Add getInitializedPlugins method to plugins API
  - Add emitAsync method to events API
  - Ensure all getAll methods return copies
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 5. Implement ConsoleLogger default implementation




  - Create ConsoleLogger class implementing Logger interface
  - Implement debug method delegating to console.debug
  - Implement info method delegating to console.info
  - Implement warn method delegating to console.warn
  - Implement error method delegating to console.error
  - Export ConsoleLogger from types.ts
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 6. Update EventBus with handler protection





  - Add logger parameter to EventBus constructor
  - Wrap each handler invocation in emit with try-catch
  - Log errors with event name and error details
  - Continue invoking remaining handlers after error
  - Ensure all handlers are invoked even if some throw
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Add emitAsync method to EventBus





  - Implement emitAsync method returning Promise<void>
  - Use Promise.allSettled to handle all handlers
  - Wrap each handler in Promise.resolve().then()
  - Log errors from failed handlers
  - Resolve when all handlers complete or fail
  - Update RuntimeContext to expose emitAsync
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 8. Update ScreenRegistry with validation errors and unregister





  - Add logger parameter to ScreenRegistry constructor
  - Replace generic errors with ValidationError for missing fields
  - Replace duplicate error with DuplicateRegistrationError
  - Modify registerScreen to return unregister function
  - Make unregister function idempotent
  - Ensure getAllScreens returns array copy
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5, 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 9. Update ActionEngine with handler protection and timeouts





  - Add logger parameter to ActionEngine constructor
  - Replace generic errors with ValidationError and DuplicateRegistrationError
  - Wrap action handler execution in try-catch
  - Throw ActionExecutionError with action ID and cause
  - Implement timeout handling with ActionTimeoutError
  - Create runWithTimeout private method
  - Modify registerAction to return unregister function
  - Update runAction to accept generic type parameters
  - Ensure getAllActions returns array copy
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5, 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 10. Update PluginRegistry with rollback and reverse disposal





  - Add logger parameter to PluginRegistry constructor
  - Change initializedPlugins from Set to Array to preserve order
  - Replace generic errors with ValidationError and DuplicateRegistrationError
  - Implement rollback in executeSetup on failure
  - Dispose already-initialized plugins in reverse order during rollback
  - Log rollback operations and errors
  - Clear initializedPlugins after rollback
  - Update executeDispose to iterate in reverse order
  - Add getInitializedPlugins method returning array copy
  - Ensure getAllPlugins returns array copy
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.2, 10.3, 10.4, 10.5, 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5, 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 11. Update UIBridge with enhanced validation and lifecycle




  - Add logger parameter to UIBridge constructor
  - Replace generic errors with ValidationError and DuplicateRegistrationError
  - Update setProvider to validate mount and renderScreen methods
  - Add shutdown method that calls provider.unmount if it exists
  - Log unmount operations and errors
  - Update renderScreen to use provider.renderScreen
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 12. Update Runtime with state tracking and logger





  - Add logger parameter to Runtime constructor with default ConsoleLogger
  - Add state property with RuntimeState enum
  - Pass logger to all subsystem constructors
  - Add isInitialized method returning boolean
  - Add getState method returning RuntimeState
  - Update initialize to set state to Initializing then Initialized
  - Update shutdown to set state to ShuttingDown then Shutdown
  - Reset state to Uninitialized on initialization failure
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 13. Add lifecycle event emission to Runtime





  - Emit runtime:initialized event after successful initialization
  - Include RuntimeContext in runtime:initialized event data
  - Emit runtime:shutdown event at start of shutdown
  - Include RuntimeContext in runtime:shutdown event data
  - Use EventBus emit method for lifecycle events
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 14. Update RuntimeContext to expose new APIs




  - Update screens.registerScreen to return unregister function
  - Update actions.registerAction to return unregister function
  - Add plugins.getInitializedPlugins method
  - Add events.emitAsync method
  - Ensure all delegated methods use updated subsystem APIs
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 15. Update UIBridge shutdown in Runtime.shutdown





  - Call uiBridge.shutdown() during Runtime shutdown sequence
  - Call shutdown before clearing registries
  - Handle shutdown errors gracefully
  - _Requirements: 9.5_

- [x] 16. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise

- [x] 17. Write property test for handler isolation








  - **Property 1: Handler Isolation**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
  - Generate random event with multiple handlers where some throw errors
  - Verify all handlers are invoked regardless of errors
  - Verify errors are logged but don't prevent execution

- [x] 18. Write property test for rollback completeness





  - **Property 2: Rollback Completeness**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
  - Generate random plugin sequence where one fails during setup
  - Verify all previously initialized plugins have dispose called
  - Verify dispose is called in reverse order
  - Verify initializedPlugins is cleared after rollback

- [x] 19. Write property test for disposal order inverse





  - **Property 3: Disposal Order Inverse**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
  - Generate random set of plugins that initialize successfully
  - Track initialization order
  - Verify disposal order is exact reverse of initialization order

- [x] 20. Write property test for unregister idempotence





  - **Property 4: Unregister Idempotence**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
  - Generate random screens and actions
  - Call unregister function multiple times
  - Verify resource is removed and subsequent calls are safe

- [x] 21. Write property test for data isolation





  - **Property 5: Data Isolation**
  - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
  - Generate random registry contents
  - Call getAll methods and modify returned arrays
  - Verify internal registry state is unchanged

- [x] 22. Write property test for timeout enforcement





  - **Property 6: Timeout Enforcement**
  - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
  - Generate random actions with timeouts
  - Create handlers that exceed timeout duration
  - Verify ActionTimeoutError is thrown with correct action ID

- [x] 23. Write property test for error context preservation





  - **Property 7: Error Context Preservation**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
  - Generate random actions that throw various errors
  - Verify errors are wrapped in ActionExecutionError
  - Verify wrapped error includes action ID and original error

- [x] 24. Write property test for state transition validity





  - **Property 8: State Transition Validity**
  - **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**
  - Test all valid state transitions through lifecycle
  - Verify state follows sequence: uninitialized → initializing → initialized → shutting_down → shutdown
  - Verify invalid transitions are prevented

- [x] 25. Write property test for lifecycle event emission





  - **Property 9: Lifecycle Event Emission**
  - **Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5**
  - Track events emitted during initialization and shutdown
  - Verify runtime:initialized is emitted after successful init
  - Verify runtime:shutdown is emitted during shutdown
  - Verify events include RuntimeContext

- [x] 26. Write property test for validation before mutation





  - **Property 10: Validation Before Mutation**
  - **Validates: Requirements 18.5, 19.5, 20.5**
  - Generate invalid registrations (missing fields, wrong types)
  - Verify ValidationError is thrown
  - Verify registry state is unchanged after validation error

- [x] 27. Write unit tests for error classes





  - Test ValidationError construction with all parameters
  - Test DuplicateRegistrationError construction
  - Test ActionTimeoutError construction
  - Test ActionExecutionError construction and cause chain
  - Verify error messages include expected information

- [x] 28. Write unit tests for ConsoleLogger




  - Test debug delegates to console.debug
  - Test info delegates to console.info
  - Test warn delegates to console.warn
  - Test error delegates to console.error
  - Test with mock console to verify calls



- [x] 29. Write unit tests for EventBus handler protection


  - Test emit continues after handler throws
  - Test all handlers invoked even with errors
  - Test errors are logged with event name
  - Test emitAsync with failing handlers
  - Test emitAsync resolves after all handlers complete

- [x] 30. Write unit tests for ActionEngine enhancements





  - Test registerAction returns unregister function
  - Test unregister function removes action
  - Test runAction wraps errors with ActionExecutionError
  - Test timeout throws ActionTimeoutError
  - Test ValidationError for missing fields
  - Test DuplicateRegistrationError for duplicates
  - Test getAllActions returns copy

- [x] 31. Write unit tests for ScreenRegistry enhancements




  - Test registerScreen returns unregister function
  - Test unregister function removes screen
  - Test ValidationError for missing fields
  - Test DuplicateRegistrationError for duplicates
  - Test getAllScreens returns copy
-

- [x] 32. Write unit tests for PluginRegistry enhancements




  - Test rollback on setup failure
  - Test rollback disposes in reverse order
  - Test rollback errors are logged
  - Test executeDispose in reverse order
  - Test getInitializedPlugins returns copy
  - Test ValidationError for missing fields
  - Test DuplicateRegistrationError for duplicates
  - Test getAllPlugins returns copy

- [x] 33. Write unit tests for UIBridge enhancements




  - Test setProvider validates mount and renderScreen
  - Test ValidationError for missing methods
  - Test DuplicateRegistrationError for duplicate provider
  - Test shutdown calls unmount if present
  - Test shutdown handles unmount errors

- [x] 34. Write unit tests for Runtime state tracking




  - Test isInitialized returns correct values
  - Test getState returns current state
  - Test state transitions during initialize
  - Test state transitions during shutdown
  - Test state reset on initialization failure

- [x] 35. Write integration tests for lifecycle events








  - Test runtime:initialized emitted after init
  - Test runtime:shutdown emitted during shutdown
  - Test events include RuntimeContext
  - Test plugins can subscribe to lifecycle events

- [x] 36. Write integration tests for custom logger




  - Test Runtime accepts custom logger
  - Test custom logger receives all log calls
  - Test logger integration with all subsystems

- [x] 37. Write integration tests for generic action types




  - Test type-safe action registration with generics
  - Test type-safe action execution with generics
  - Test compile-time type checking (TypeScript tests)

- [x] 38. Final Checkpoint - Ensure all tests pass







  - Ensure all tests pass, ask the user if questions arise
