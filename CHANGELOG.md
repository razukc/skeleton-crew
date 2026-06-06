# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-06-07

A code-review-driven correctness release. 10 findings on `plugin-registry.ts` / `plugin-loader.ts` / `runtime.ts` (with `swapPlugin` as the focal point) were captured as failing reproducer tests on `main` and fixed one commit at a time. The reproducer file ships in this release as `tests/unit/review-reproducers.test.ts`. 9 reproducer assertions are now green; 1 is deferred to 0.6 (see "Known Limitation" below).

### Breaking

- **`runtime.swapPlugin()` sequence reordered (#1).** Validation now runs **before** any side effect. The old sequence was `dispose → teardown resources → validateConfig → setup new`; a failed `validateConfig` left the runtime with the old plugin torn down and the new plugin never set up. The new sequence runs `validateConfig` (and the new dependency pre-flight from #6) **before** the dispose/teardown step. A rejection during pre-flight now leaves the running plugin completely untouched. A failed `validateConfig` that previously propagated as a raw `Error` is now wrapped in `PluginSwapError` with the original message — callers matching the raw error class will need to update.

### Fixed

- **`isNewerVersion` accepts SemVer 2.0 pre-release and build metadata (#5).** `1.2.3-rc.1`, `1.2.3+build.5`, etc. are now compared correctly; previously they were rejected by the hand-rolled regex and produced misleading "must be strictly greater" errors. Backed by the `semver` package.
- **`swapPlugin()` now performs dependency pre-flight (#6).** Previously, a new version that declared a new entry in `dependencies` would proceed through teardown and surface the missing dep as a setup-time runtime error. Now `swapPlugin` mirrors `executeSetup`'s dep validation before any side effect, raising `PluginSwapError`.
- **`executeSetup` rollback now cleans up the failing plugin's partial registrations (#2).** When a plugin's setup threw after registering actions/screens/services through the tracked context, those registrations were orphaned in the sibling registries. The rollback path now fires the failing plugin's tracked unregister callbacks before walking the already-initialized list. `dispose()` is deliberately NOT called on the failing plugin — its setup never completed.
- **`executeSetup` preserves error class identity (#3).** A `ValidationError` (or any other custom subclass) thrown during `validateConfig` or registration is now re-thrown as the same class, with custom own properties intact and the original error attached via `Error.cause`. The message format `Plugin "name" setup failed: <original>` is preserved so existing string-matching code keeps working. The pattern `if (error instanceof ValidationError)` documented in `docs/guides/config-validation.md` now actually works.
- **`swapPlugin()` rejects concurrent calls for the same plugin (#4).** A re-entrancy guard rejects the second concurrent caller with `PluginSwapError("a swap for this plugin is already in progress")`. Different plugins still swap in parallel — they touch disjoint state. Callers that want serialization can retry on `PluginSwapError`.

### Changed

- **`PluginRegistry.clear()` is deprecated; use `reset()` (#7).** The method is a pure state reset (it does NOT call `dispose` or run unregister callbacks); the old name implied a teardown it never performed. `reset()` is the new name with a JSDoc that documents the post-dispose-only contract. `clear()` keeps working as a deprecated alias that emits `logger.warn` on every call; it will be removed in 0.6. `Runtime.shutdown()` already calls `executeDispose` first, so production behavior is unchanged.
- **`DirectoryPluginLoader` warns on missing dependencies at sort time (#8).** When a plugin declares a dependency that isn't present in the discovered batch (commonly: a sibling plugin's load failure), the loader now emits `logger.warn` naming both the dependent and the missing dep. Previously the situation was silent and surfaced later as a confusing "requires dependency X to be initialized first" from the registry, hiding the original load failure.

### Internal

- Pure refactor (#9, #10): drop the redundant per-directory sort inside `DirectoryPluginLoader.loadFromPath` (the outer sort in `loadPlugins` is the only one that can resolve cross-source deps); extract the duplicated `validateConfig` handling between `executeSetup` and `swapPlugin` into a shared `runValidateConfig(plugin, config)` helper that normalizes the boolean/object return shape and catches sync + async throws.

### Known limitation (deferred to 0.6)

If `swapPlugin`'s **new plugin's own setup** throws after the commit phase begins, the old plugin's dispose has already run and cannot be re-instantiated. The new plugin's partial registrations are cleaned up, but the old plugin is gone for that process. Pre-flight is the recovery surface. True atomic swap (build-then-commit with shadow resource buckets) requires the action / screen / service registries to support coexisting `(plugin, version)` pairs, which is a registry-altitude change. The deferred reproducer is `it.skip`ped with a tracking comment in `tests/unit/review-reproducers.test.ts`.

## [0.4.1] - 2026-03-22

- **Plugin Hot-Swap (`runtime.swapPlugin()`)**: New method on `Runtime` that replaces a running plugin with a new version without restarting the runtime. Requires the new plugin to have the same name and a strictly higher semver version. Sequence: dispose old plugin → tear down all its registered resources (actions, screens, services) → run config validation → setup new plugin with resource tracking → emit `plugin:swapped` event. Rolls back on setup failure. *(Note: this sequence was found to be non-atomic in 0.5.0 — see the 0.5.0 entry above. The intended atomic semantics are delivered as of 0.5.0.)*
- **`PluginSwapError`**: New error class thrown when a swap is rejected (plugin not initialized, version not an upgrade, or new plugin setup fails).
- **`isNewerVersion(current, next)`**: Exported semver utility that returns `true` if `next` is strictly greater than `current`.

## [0.4.0] - 2026-03-22

### Added
- **Action Retry**: New `retry` field on `ActionDefinition`. On failure, the action is retried up to `retry` times with exponential backoff (100ms, 200ms, 400ms…). Timeout and memory errors are never retried.
- **Action Memory Limit**: New `memoryLimitMb` field on `ActionDefinition`. Measures heap delta before/after execution and throws `ActionMemoryError` if the limit is exceeded. No-op in browser environments where `process.memoryUsage` is unavailable.
- **Execution Recorder (`ctx.trace`)**: New first-class observability API on `RuntimeContext`. Every action run produces a frozen `TraceEntry` with `runId`, `actionId`, `input`, `output`, `status`, `durationMs`, `startedAt`, `error`, and `attempt`. Accessible via `ctx.trace.getEntries()`, `ctx.trace.getEntriesFor(id)`, and `ctx.trace.clear()`. Capped at 1000 entries by default.
- **`ActionMemoryError`**: New error class thrown when an action exceeds its `memoryLimitMb`.
- **`ExecutionRecorderImpl`**: New exported class for the in-memory recorder implementation.
- **Types**: `TraceEntry`, `TraceStatus`, `ExecutionRecorder`, `PluginSwapError` exported from the core package. `ActionMetadata` now includes `retry` and `memoryLimitMb` fields.

### Changed
- **`PluginRegistry`**: Now wraps each plugin's setup context in a tracked proxy that intercepts `registerAction`, `registerScreen`, and `services.register` calls, recording their unregister callbacks. On teardown (dispose or hot-swap), all tracked resources are cleaned up automatically in reverse registration order.
- **`ActionEngine` constructor**: Now accepts an optional `onTrace` callback for recording execution entries. Fully backward compatible — existing code passing only a logger is unaffected.
- **`RuntimeContextImpl` constructor**: Now accepts an optional `ExecutionRecorderImpl` instance. Falls back to a standalone recorder when not provided (e.g. in tests).

## [0.3.4] - 2026-01-24

### Fixed
- **Browser Compatibility**: Introduced dedicated browser entry point (`index.browser.ts`) to eliminate Node.js dependency errors (`fs`, `path`) in bundlers like Vite.
- **Package Exports**: Updated `package.json` with conditional exports to automatically serve the correct entry point for Browser vs Node.js environments.

### Changed
- **Architecture**: Refactored `Runtime` class to use dependency injection for `PluginLoader`. This completely decouples Node.js file system logic from the core runtime.
- **Node Runtime**: The default export for Node.js (`src/index.ts`) now automatically injects `DirectoryPluginLoader` to maintain backward compatibility.

### Added
- **Types**: New `PluginLoader` interface for implementing custom plugin discovery strategies.

## [0.3.3] - 2026-01-22

### Fixed
- **Browser Compatibility**: Resolved a critical runtime crash in browser environments by converting `fast-glob` to a dynamic import. This prevents `ReferenceError: process is not defined` and ensures the runtime assumes a browser context when Node.js APIs are unavailable.
- **Test Stability**: Fixed flaky performance monitoring tests by using deterministic fake timers instead of relying on `setTimeout` and `performance.now`.

### Documentation
- **TypeScript Imports**: Updated all documentation examples to use strict `import type` syntax for type-only imports, fixing issues with `isolatedModules` and strict TS configurations.
- **Broken Links**: Fixed broken references to `core-concepts.md` in the README and getting started guides.
- **Code Examples**: Modernized "Your First Plugin" guide with generic type examples (`Runtime<AppConfig>`) for improved type safety.

## [0.3.2] - 2026-01-16

### Documentation
- **README Update**: Fully documented the Service Locator API and added new documentation links.
- **Service Locator Guide**: Linked to the new dedicated guide in the README.


## [0.3.1] - 2026-01-16

### Added
- **Service Locator API**: New `ctx.services` API for type-safe inter-plugin communication. Allows plugins to register and consume shared services without hard dependency coupling.
- **Service Locator Guide**: New dedicated guide for using the Service Locator pattern for inter-plugin communication.

### Fixed
- **Unit Test Coverage**: Added comprehensive unit tests for Service Registry and Config Validation features.
- **Type Exports**: Correctly export `ServiceRegistry` and other v0.3.1 types from the core package.

## [0.3.0] - 2026-01-15

### Added
- **Plugin Config Validation**: New `validateConfig` lifecycle method for plugins. Supports schema-based validation (Zod, etc.) and early initialization failure with detailed error reporting.
- **Config Documentation**: New `configKeys` property on `PluginDefinition` for documenting and introspecting plugin configuration requirements.
- **Logger Documentation**: Comprehensive guide on using the built-in `ctx.logger`, including integration examples with Winston and Pino.
- **Config Validation Guide**: New dedicated guide for implementing plugin configuration validation.

### Changed
- **Loading Telemetry**: Consolidated plugin loading messages into a single, clean info message with breakdown (e.g., "Loaded 7 plugins (5 from paths, 2 from packages)").
- **Debug Logging**: Moved verbose plugin loading details (loading order) to debug level to reduce noise during standard startup.

### Fixed
- **Type Exports**: Correctly export `ConfigValidationResult` and other v0.3 types from the core package.

## [0.2.4] - 2026-01-13

### Fixed
- **Plugin Loading**: Resolved issues loading plugins from absolute paths on Windows (backslash/escape character mismatch).
- **Environment Compatibility**: Fixed a bug where `DirectoryPluginLoader` would silently ignore plugins when running via `npx` by relativizing the `node_modules` ignore pattern.
- **Normalization**: Improved platform-agnostic path normalization for all discovered plugins.

## [0.2.3] - 2025-01-07

### Event Bus
- **Wildcard Events**: Updated Event Bus to support wildcard(*) events

## [0.2.2] - 2025-01-07

### Documentation
- **README Updates**: Updated README with comprehensive v0.2.1 feature documentation
- **Plugin Discovery**: Added detailed plugin discovery examples and usage patterns
- **Core Concepts**: Enhanced core concepts section with automatic dependency resolution
- **Production Ready**: Highlighted verified stability and production-ready status

### Notes
- No code changes - documentation synchronization release only
- Ensures npm package documentation reflects current v0.2.1 capabilities

## [0.2.1] - 2025-01-07

### Added
- **Plugin Discovery**: Automatic plugin loading from file paths and npm packages via `RuntimeOptions`
- **DirectoryPluginLoader**: New utility class for discovering and loading plugins
- **Enhanced Documentation**: Comprehensive guide on avoiding closure pitfalls in plugin development
- **Plugin Discovery Options**: `pluginPaths` and `pluginPackages` in `RuntimeOptions`
- **Topological Sort**: Automatic dependency-based plugin initialization ordering

### Changed
- **Plugin Loading**: Discovered plugins are now loaded before manually registered plugins
- **Error Handling**: Plugin discovery errors are logged but don't stop initialization
- **Dependency Resolution**: Plugins are now automatically sorted by dependencies before initialization

### Fixed
- **CRITICAL**: ESM interop issue with fast-glob import (was causing runtime crashes) ✅ VERIFIED
- **CRITICAL**: Removed `**/dist/**` from default ignore patterns (was blocking compiled plugins) ✅ VERIFIED
- **DX**: Improved error messages for missing actions with dependency hints ✅ VERIFIED
- **Plugin Ordering**: Plugins now initialize in correct dependency order automatically ✅ VERIFIED

### Documentation
- Added "Avoiding Closure Pitfalls" guide with real-world examples
- Updated API reference with plugin discovery documentation
- Enhanced RuntimeOptions documentation with discovery examples

### Developer Experience
- Simplified plugin development workflow with automatic discovery
- Better error messages for plugin loading failures and missing dependencies
- Comprehensive test coverage for plugin discovery features
- Automatic dependency resolution eliminates manual ordering concerns

### Migration Verification
- **Status**: ✅ COMPLETE - All critical bugs verified fixed in real-world usage
- **Testing**: Validated with ai-extension-preview migration
- **Stability**: Runtime confirmed stable with all reported issues resolved

### Future Roadmap (v0.3+)
Based on user feedback, the following improvements are planned for future releases:

- **Enhanced Logger Documentation**: Clarify `ctx.logger` as primary logging mechanism
- **Typed Plugin Dependencies**: Explore `ctx.plugins.get<T>('name')` for type-safe plugin access
- **Plugin Config Validation**: Support for plugin-specific config validation (Zod/runtypes)
- **Reduced Debug Noise**: Optimize DirectoryPluginLoader logging output
- **Service Locator Pattern**: Consider structured inter-plugin communication patterns

## [0.2.0] - 2024-01-05

### Added
- **Generic Runtime/Context**: Full TypeScript generic support for type-safe configuration
- **Sync Config Access**: Direct synchronous access to configuration via `ctx.config`
- **Plugin Dependencies**: Explicit dependency resolution with validation
- **Enhanced Logger**: Logger available on context for all plugins
- **Migration Support**: Host context injection and introspection API
- **Comprehensive Documentation**: Complete migration guides and real-world examples

### Changed
- **BREAKING**: None - 100% backward compatible with v0.1.x
- **Improved**: Configuration access is now synchronous and type-safe
- **Enhanced**: Plugin initialization with explicit dependency ordering

### Fixed
- **Critical**: Stale closure prevention with `ctx.config` getter implementation
- **Performance**: Eliminated Promise overhead in configuration access

### Migration
- See [v0.1.x to v0.2.0 Migration Guide](./docs/guides/v0.1-to-v0.2-migration.md)
- **Effort**: Minimal - mostly adding type annotations
- **Risk**: Low - full backward compatibility maintained
- **Benefits**: Significant DX improvements and type safety

## [0.1.5] - 2024-01-01

### Added
- **Core plugin system with registration and lifecycle management
- Screen registry for UI-agnostic screen definitions
- Action engine for business logic execution
- Event bus for plugin communication
- UI bridge for optional UI provider integration

### Features
- Plugin isolation and testability
- Event-driven architecture
- Framework-agnostic design
- Minimal core (< 5KB)
- Zero dependencies

## [0.1.4] - 2023-12-28

### Fixed
- Plugin disposal order and cleanup
- Memory leak prevention in event handlers
- Error handling in action execution

## [0.1.3] - 2023-12-25

### Added
- Action timeout support
- Enhanced error messages
- Performance monitoring hooks

## [0.1.2] - 2023-12-22

### Fixed
- Event handler registration edge cases
- Screen registry validation
- TypeScript type exports

## [0.1.1] - 2023-12-20

### Added
- Basic plugin system
- Screen and action registries
- Event communication

## [0.1.0] - 2023-12-18

### Added
- Initial release
- Core runtime architecture
- Plugin definition interface
- Basic documentation