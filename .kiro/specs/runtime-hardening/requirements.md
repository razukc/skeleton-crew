# Requirements Document

## Introduction

The Runtime Hardening feature enhances the Skeleton Crew Runtime's production readiness by improving error handling, plugin fault isolation, API ergonomics, and developer experience. This feature addresses gaps identified in code review around resilience, type safety, and observability without changing the core architecture or breaking existing functionality.

## Glossary

- **Plugin Fault Isolation**: The ability of the runtime to continue operating when a plugin encounters an error
- **Graceful Degradation**: The runtime's ability to handle errors without cascading failures
- **Rollback**: The process of undoing partial initialization when setup fails
- **Contextual Error**: An error that includes additional information about where and why it occurred
- **Action Timeout**: A maximum duration allowed for action execution before termination
- **Logger Interface**: An abstraction for logging that allows custom implementations
- **Type Generics**: TypeScript generic parameters that improve type safety for plugin authors
- **Unregister Function**: A function returned from registration that removes the registered item
- **Reverse Disposal**: Executing cleanup in the opposite order of initialization
- **Handler Protection**: Wrapping handler invocations in try-catch to prevent crashes

## Requirements

### Requirement 1: Plugin Setup Rollback

**User Story:** As an application developer, I want partial plugin initialization to be cleaned up when setup fails, so that the runtime does not remain in an inconsistent state

#### Acceptance Criteria

1. WHEN a plugin setup callback throws an error, THE Core Runtime SHALL invoke dispose callbacks for all previously initialized plugins
2. THE Core Runtime SHALL invoke dispose callbacks in reverse order of setup
3. WHEN dispose is called during rollback, THE Core Runtime SHALL pass the RuntimeContext to dispose callbacks
4. IF a dispose callback throws during rollback, THEN THE Core Runtime SHALL log the error and continue with remaining dispose callbacks
5. WHEN rollback completes, THE Core Runtime SHALL clear the initialized plugins set
6. THE Core Runtime SHALL include the failing plugin name in the thrown initialization error

### Requirement 2: Event Handler Protection

**User Story:** As a plugin author, I want my event handlers to be isolated from other plugins' errors, so that one failing handler does not prevent other handlers from executing

#### Acceptance Criteria

1. WHEN an event handler throws an error during emit, THE Event Bus SHALL catch the error and log it
2. THE Event Bus SHALL continue invoking remaining handlers after a handler throws
3. THE Event Bus SHALL include the event name and error details in logged messages
4. THE Event Bus SHALL invoke all registered handlers even if earlier handlers throw
5. THE Event Bus SHALL NOT allow a throwing handler to prevent event propagation

### Requirement 3: Action Handler Protection

**User Story:** As an application developer, I want action execution errors to include context about which action failed, so that I can diagnose issues quickly

#### Acceptance Criteria

1. WHEN an action handler throws an error, THE Action Engine SHALL wrap the error with the action ID
2. THE Action Engine SHALL create a contextual error that includes the original error as the cause
3. THE Action Engine SHALL include the action ID in the error message
4. THE Action Engine SHALL propagate the wrapped error to the caller
5. THE Action Engine SHALL NOT catch and suppress action handler errors

### Requirement 4: Registration Unregister Functions

**User Story:** As a plugin author, I want to unregister actions and screens programmatically, so that I can clean up resources during plugin disposal

#### Acceptance Criteria

1. WHEN registerAction is called, THE Action Engine SHALL return a function that unregisters the action
2. WHEN the unregister function is called, THE Action Engine SHALL remove the action from the registry
3. WHEN registerScreen is called, THE Screen Registry SHALL return a function that unregisters the screen
4. WHEN the unregister function is called, THE Screen Registry SHALL remove the screen from the registry
5. THE unregister functions SHALL be idempotent and safe to call multiple times

### Requirement 5: Reverse Disposal Order

**User Story:** As a plugin author, I want plugins to be disposed in reverse initialization order, so that dependencies are cleaned up correctly

#### Acceptance Criteria

1. WHEN shutdown is called, THE Core Runtime SHALL invoke dispose callbacks in reverse order of setup
2. THE Core Runtime SHALL track the order plugins were initialized
3. THE Core Runtime SHALL dispose the last initialized plugin first
4. THE Core Runtime SHALL dispose the first initialized plugin last
5. THE Core Runtime SHALL maintain disposal order even when some plugins lack dispose callbacks

### Requirement 6: Generic Type Parameters

**User Story:** As a plugin author, I want type-safe action definitions, so that I get compile-time checking for action payloads and return types

#### Acceptance Criteria

1. THE ActionDefinition interface SHALL accept generic type parameters for payload and return types
2. THE registerAction method SHALL accept generic type parameters matching ActionDefinition
3. THE runAction method SHALL accept generic type parameters for type-safe invocation
4. THE handler function signature SHALL use the generic payload and return types
5. WHERE no generic types are provided, THE ActionDefinition SHALL default to unknown types

### Requirement 7: Pluggable Logger Interface

**User Story:** As an application developer, I want to provide a custom logger implementation, so that runtime logs integrate with my application's logging system

#### Acceptance Criteria

1. THE Core Runtime SHALL define a Logger interface with debug, info, warn, and error methods
2. THE Core Runtime SHALL accept an optional logger during initialization
3. WHERE no logger is provided, THE Core Runtime SHALL use console as the default logger
4. THE Core Runtime SHALL use the logger for all internal logging operations
5. THE Event Bus SHALL use the logger when handlers throw errors
6. THE Plugin Registry SHALL use the logger when dispose callbacks throw errors

### Requirement 8: Enhanced Error Messages

**User Story:** As an application developer, I want detailed error messages for common mistakes, so that I can quickly identify and fix issues

#### Acceptance Criteria

1. WHEN a duplicate screen is registered, THE error message SHALL include the duplicate screen ID
2. WHEN a duplicate action is registered, THE error message SHALL include the duplicate action ID
3. WHEN a duplicate plugin is registered, THE error message SHALL include the duplicate plugin name
4. WHEN an action is not found, THE error message SHALL include the requested action ID
5. WHEN renderScreen is called without a UI provider, THE error message SHALL clearly state no provider is registered
6. WHEN a plugin setup fails, THE error message SHALL include the plugin name and the underlying error message

### Requirement 9: UIProvider Lifecycle Methods

**User Story:** As a UI plugin author, I want explicit mount and unmount lifecycle methods, so that I can properly initialize and clean up UI resources

#### Acceptance Criteria

1. THE UIProvider interface SHALL include a mount method that accepts a mount point and RuntimeContext
2. THE UIProvider interface SHALL include a renderScreen method that accepts a ScreenDefinition
3. THE UIProvider interface SHALL include an optional unmount method for cleanup
4. THE UIBridge SHALL validate that the provider implements mount and renderScreen
5. THE UIBridge SHALL call unmount during shutdown if the method exists

### Requirement 10: Registry Data Isolation

**User Story:** As a plugin author, I want registry methods to return copies of data, so that I cannot accidentally mutate internal runtime state

#### Acceptance Criteria

1. WHEN getAllScreens is called, THE Screen Registry SHALL return a new array containing screen definitions
2. WHEN getAllActions is called, THE Action Engine SHALL return a new array containing action definitions
3. WHEN getAllPlugins is called, THE Plugin Registry SHALL return a new array containing plugin definitions
4. THE returned arrays SHALL NOT allow mutation of internal registry Maps
5. THE RuntimeContext SHALL NOT expose internal Map references to plugins

### Requirement 11: Action Timeout Support

**User Story:** As an application developer, I want to set timeouts for action execution, so that poorly behaving actions do not hang the application

#### Acceptance Criteria

1. THE ActionDefinition interface SHALL accept an optional timeout property in milliseconds
2. WHERE a timeout is specified, THE Action Engine SHALL abort action execution if it exceeds the timeout
3. WHEN an action times out, THE Action Engine SHALL throw a timeout error with the action ID
4. WHERE no timeout is specified, THE Action Engine SHALL allow actions to run indefinitely
5. THE timeout error SHALL be distinguishable from other action errors

### Requirement 12: Async Event Emission

**User Story:** As a plugin author, I want to emit events asynchronously, so that slow event handlers do not block my code

#### Acceptance Criteria

1. THE Event Bus SHALL provide an emitAsync method that returns a Promise
2. THE emitAsync method SHALL invoke all handlers asynchronously
3. THE emitAsync method SHALL use Promise.allSettled to handle handler errors
4. THE emitAsync method SHALL resolve when all handlers complete or fail
5. THE emitAsync method SHALL log errors from failed handlers

### Requirement 13: Plugin Initialization State Tracking

**User Story:** As an application developer, I want to query which plugins initialized successfully, so that I can diagnose initialization issues

#### Acceptance Criteria

1. THE Plugin Registry SHALL provide a getInitializedPlugins method that returns plugin names
2. THE method SHALL return only plugins that completed setup successfully
3. THE method SHALL return an array of plugin names in initialization order
4. THE method SHALL return an empty array before initialization completes
5. THE method SHALL be accessible through the RuntimeContext

### Requirement 14: Validation Error Types

**User Story:** As an application developer, I want typed validation errors, so that I can handle different error cases programmatically

#### Acceptance Criteria

1. THE Core Runtime SHALL define a ValidationError class for validation failures
2. THE ValidationError SHALL include the resource type being validated
3. THE ValidationError SHALL include the specific validation failure reason
4. THE Screen Registry SHALL throw ValidationError for missing required fields
5. THE Action Engine SHALL throw ValidationError for missing required fields
6. THE Plugin Registry SHALL throw ValidationError for missing required fields

### Requirement 15: Duplicate Registration Error Types

**User Story:** As an application developer, I want typed duplicate registration errors, so that I can distinguish them from other errors

#### Acceptance Criteria

1. THE Core Runtime SHALL define a DuplicateRegistrationError class
2. THE DuplicateRegistrationError SHALL include the resource type and duplicate identifier
3. THE Screen Registry SHALL throw DuplicateRegistrationError for duplicate screen IDs
4. THE Action Engine SHALL throw DuplicateRegistrationError for duplicate action IDs
5. THE Plugin Registry SHALL throw DuplicateRegistrationError for duplicate plugin names

### Requirement 16: Runtime State Queries

**User Story:** As an application developer, I want to query runtime state, so that I can verify initialization and shutdown completed correctly

#### Acceptance Criteria

1. THE Core Runtime SHALL provide an isInitialized method that returns a boolean
2. THE isInitialized method SHALL return true after initialize completes successfully
3. THE isInitialized method SHALL return false before initialization or after shutdown
4. THE Core Runtime SHALL provide a getState method that returns the current lifecycle state
5. THE lifecycle states SHALL include: uninitialized, initializing, initialized, shutting_down, shutdown

### Requirement 17: Lifecycle Event Emission

**User Story:** As a plugin author, I want to receive events when the runtime initializes and shuts down, so that I can react to lifecycle changes

#### Acceptance Criteria

1. WHEN initialize completes successfully, THE Core Runtime SHALL emit a runtime:initialized event
2. WHEN shutdown begins, THE Core Runtime SHALL emit a runtime:shutdown event
3. THE runtime:initialized event SHALL include the RuntimeContext
4. THE runtime:shutdown event SHALL include the RuntimeContext
5. THE events SHALL be emitted through the Event Bus

### Requirement 18: Screen Definition Validation

**User Story:** As a plugin author, I want clear validation errors for screen definitions, so that I know exactly what fields are missing or invalid

#### Acceptance Criteria

1. WHEN a screen definition is missing the id field, THE Screen Registry SHALL throw ValidationError with "id" in the message
2. WHEN a screen definition is missing the title field, THE Screen Registry SHALL throw ValidationError with "title" in the message
3. WHEN a screen definition is missing the component field, THE Screen Registry SHALL throw ValidationError with "component" in the message
4. THE ValidationError SHALL include the screen ID if available
5. THE ValidationError SHALL occur before any state modification

### Requirement 19: Action Definition Validation

**User Story:** As a plugin author, I want clear validation errors for action definitions, so that I know exactly what fields are missing or invalid

#### Acceptance Criteria

1. WHEN an action definition is missing the id field, THE Action Engine SHALL throw ValidationError with "id" in the message
2. WHEN an action definition is missing the handler field, THE Action Engine SHALL throw ValidationError with "handler" in the message
3. WHEN the handler is not a function, THE Action Engine SHALL throw ValidationError indicating invalid handler type
4. THE ValidationError SHALL include the action ID if available
5. THE ValidationError SHALL occur before any state modification

### Requirement 20: Plugin Definition Validation

**User Story:** As a plugin author, I want clear validation errors for plugin definitions, so that I know exactly what fields are missing or invalid

#### Acceptance Criteria

1. WHEN a plugin definition is missing the name field, THE Plugin Registry SHALL throw ValidationError with "name" in the message
2. WHEN a plugin definition is missing the version field, THE Plugin Registry SHALL throw ValidationError with "version" in the message
3. WHEN a plugin definition is missing the setup field, THE Plugin Registry SHALL throw ValidationError with "setup" in the message
4. WHEN the setup is not a function, THE Plugin Registry SHALL throw ValidationError indicating invalid setup type
5. THE ValidationError SHALL occur before any state modification
