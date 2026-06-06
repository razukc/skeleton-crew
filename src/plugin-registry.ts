import semver from 'semver';
import { PluginDefinition, RuntimeContext, Logger, ValidationError, DuplicateRegistrationError } from './types.js';

// ─── Semver helpers ───────────────────────────────────────────────────────────

/**
 * Returns true if `next` is strictly greater than `current` by SemVer 2.0 rules.
 *
 * Accepts the full SemVer 2.0 grammar — including pre-release identifiers
 * (`1.2.4-rc.1`, `2.0.0-alpha.3`) and build metadata (`1.2.3+build.5`). A
 * leading `v` is tolerated on either side (`v1.2.3`).
 *
 * Returns `false` when either version cannot be parsed as SemVer 2.0, so an
 * unparseable input never reads as "newer".
 *
 * @example
 *   isNewerVersion('1.2.3', '1.2.4')        // true
 *   isNewerVersion('1.2.3', '1.2.4-rc.1')   // true  (pre-release > 1.2.3)
 *   isNewerVersion('1.2.3-rc.1', '1.2.3')   // true  (1.2.3 > any 1.2.3-pre)
 *   isNewerVersion('2.0.0', '1.9.9')        // false
 *   isNewerVersion('not-semver', '1.0.0')   // false
 */
/**
 * Result of running a plugin's optional `validateConfig` hook, normalized.
 *
 * `ok: true`     — validation passed (or no hook was defined).
 * `ok: false`    — validation rejected. `errors` is a human-readable summary
 *                  (joined message list, or "config validation failed" if the
 *                  hook returned a bare `false`). `threw` is true if the
 *                  hook itself threw rather than returning a rejection — useful
 *                  for callers that want to phrase the error differently
 *                  (e.g. "config validation threw" vs "config validation failed").
 *
 * The helper never throws — callers translate the rejection into whatever
 * error class fits their domain (ValidationError from initial setup,
 * PluginSwapError from hot-swap, etc.).
 */
export type NormalizedValidateConfigResult =
  | { ok: true }
  | { ok: false; errors: string; threw: boolean };

/**
 * Runs `plugin.validateConfig(config)` if defined and normalizes the result.
 * Catches synchronous and asynchronous throws so the caller doesn't have to.
 * Returns `{ ok: true }` when the plugin has no validator.
 *
 * @see NormalizedValidateConfigResult for the return shape.
 */
export async function runValidateConfig<TConfig>(
  plugin: PluginDefinition<TConfig>,
  config: TConfig,
): Promise<NormalizedValidateConfigResult> {
  if (!plugin.validateConfig) return { ok: true };
  let result;
  try {
    result = await plugin.validateConfig(config);
  } catch (err) {
    return { ok: false, errors: (err as Error).message ?? String(err), threw: true };
  }
  const valid = typeof result === 'boolean' ? result : result.valid;
  if (valid) return { ok: true };
  const errors = typeof result === 'object' && result.errors
    ? result.errors.join(', ')
    : 'config validation failed';
  return { ok: false, errors, threw: false };
}

export function isNewerVersion(current: string, next: string): boolean {
  // Tolerate a leading `v` (e.g. `v1.2.3`) by stripping it before validation.
  // Anything else must be a literal valid SemVer 2.0 string — we deliberately
  // do NOT use semver.coerce, which would silently upgrade `"1.2"` or
  // `"2024-06-01"` to a valid version and then compare them.
  const a = semver.valid(current.replace(/^v/, ''));
  const b = semver.valid(next.replace(/^v/, ''));
  if (!a || !b) return false;
  return semver.gt(b, a);
}

/**
 * Per-plugin resource ownership record.
 *
 * Replaces the older `Array<() => void>` shape (an opaque LIFO of unregister
 * closures) with id-keyed Maps. The atomic hot-swap commit step needs to ask
 * "what action / screen / service ids did v1 own?" so it can compute the
 * retire-on-commit set when v2 omits an id v1 had — `.keys()` answers that
 * question directly. The mapped values are the unregister closures (same as
 * before) so teardown still has a deterministic way to call live unregister.
 *
 * Event subscriptions stay as an opaque list: EventBus has no plugin-name
 * metadata, so there is nothing typed to record other than the unsubscribe
 * callback. Within-type teardown order remains insertion order in reverse
 * (LIFO), preserving the property tested in
 * tests/property/disposal-order-inverse.property.test.ts.
 *
 * @since 0.6.0
 */
export interface OwnedIds {
  actions: Map<string, () => void>;
  screens: Map<string, () => void>;
  services: Map<string, () => void>;
  eventUnsubs: Array<() => void>;
}

function createOwnedIds(): OwnedIds {
  return {
    actions: new Map(),
    screens: new Map(),
    services: new Map(),
    eventUnsubs: [],
  };
}

export class PluginRegistry<TConfig = Record<string, unknown>> {
  private plugins: Map<string, PluginDefinition<TConfig>>;
  private initializedPlugins: string[];
  private logger: Logger;
  /**
   * Tracks the resources each plugin owns, keyed by plugin name.
   *
   * Used both by teardown (synthesize unregister calls) and by hot-swap commit
   * (compute the retire-on-commit set for ids v2 omits — see {@link OwnedIds}).
   */
  private pluginResources: Map<string, OwnedIds>;

  constructor(logger: Logger) {
    this.plugins = new Map();
    this.initializedPlugins = [];
    this.logger = logger;
    this.pluginResources = new Map();
  }

  registerPlugin(plugin: PluginDefinition<TConfig>): void {
    // Validate required fields with ValidationError
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new ValidationError('Plugin', 'name');
    }
    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new ValidationError('Plugin', 'version', plugin.name);
    }
    if (!plugin.setup || typeof plugin.setup !== 'function') {
      throw new ValidationError('Plugin', 'setup', plugin.name);
    }

    // Check for duplicate plugin name with DuplicateRegistrationError
    if (this.plugins.has(plugin.name)) {
      throw new DuplicateRegistrationError('Plugin', plugin.name);
    }

    this.plugins.set(plugin.name, plugin);
  }

  getPlugin(name: string): PluginDefinition<TConfig> | null {
    return this.plugins.get(name) ?? null;
  }

  getAllPlugins(): PluginDefinition<TConfig>[] {
    // Return array copy to prevent external mutation
    return Array.from(this.plugins.values());
  }

  /**
   * Returns the names of all successfully initialized plugins.
   * Returns an array copy to prevent external mutation.
   * 
   * @returns Array of initialized plugin names in initialization order
   * 
   * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
   */
  getInitializedPlugins(): string[] {
    // Return array copy to prevent external mutation
    return [...this.initializedPlugins];
  }

  /**
   * Returns true if the named plugin has completed setup successfully.
   * Safe to call from within another plugin's setup to check peer state.
   *
   * @param name - Plugin name to check
   */
  isInitialized(name: string): boolean {
    return this.initializedPlugins.includes(name);
  }

  /**
   * Builds a context proxy for a specific plugin that intercepts resource
   * registration calls and records their unregister callbacks.
   *
   * NOTE: We cannot use object spread here because RuntimeContextImpl exposes
   * its sub-APIs via getters. Spreading a getter-based object resolves the
   * getters at spread time, producing plain `undefined` values in the copy.
   * Instead we build a proper proxy object that delegates to the live context.
   */
  private buildTrackedContext(pluginName: string, context: RuntimeContext<TConfig>): RuntimeContext<TConfig> {
    const owned = createOwnedIds();
    this.pluginResources.set(pluginName, owned);

    const proxy: RuntimeContext<TConfig> = {
      get events() {
        // events.on is wrapped so the unsubscribe lands in owned.eventUnsubs.
        // emit/emitAsync pass through unchanged.
        return {
          emit: (event: string, data?: unknown) => context.events.emit(event, data),
          emitAsync: (event: string, data?: unknown) => context.events.emitAsync(event, data),
          on: (event: string, handler: (data: unknown) => void) => {
            const unsub = context.events.on(event, handler);
            owned.eventUnsubs.push(unsub);
            return unsub;
          },
        };
      },
      get plugins() { return context.plugins; },
      get host() { return context.host; },
      get config() { return context.config; },
      get introspect() { return context.introspect; },
      get logger() { return context.logger; },
      get trace() { return context.trace; },
      getRuntime: () => context.getRuntime(),
      actions: {
        registerAction: (action) => {
          const unregister = context.actions.registerAction(action);
          owned.actions.set(action.id, unregister);
          return unregister;
        },
        runAction: (id, params?) => context.actions.runAction(id, params),
        hasAction: (id) => context.actions.hasAction(id)
      },
      screens: {
        registerScreen: (screen) => {
          const unregister = context.screens.registerScreen(screen);
          owned.screens.set(screen.id, unregister);
          return unregister;
        },
        getScreen: (id) => context.screens.getScreen(id),
        getAllScreens: () => context.screens.getAllScreens()
      },
      services: {
        register: <T>(name: string, service: T) => {
          context.services.register(name, service);
          owned.services.set(name, () => context.services.unregister(name));
        },
        get: <T>(name: string): T => context.services.get<T>(name),
        has: (name) => context.services.has(name),
        list: () => context.services.list(),
        unregister: (name) => {
          context.services.unregister(name);
          owned.services.delete(name);
        }
      }
    };

    return proxy;
  }

  /**
   * Returns the OwnedIds record for a plugin, or undefined if the plugin
   * either is unknown or hasn't run setup yet. The atomic swap commit step
   * uses this to compute the retire-on-commit set when v2 omits an id v1 had.
   *
   * @since 0.6.0
   */
  getOwnedIds(pluginName: string): OwnedIds | undefined {
    return this.pluginResources.get(pluginName);
  }

  /**
   * Tears down a single plugin: calls dispose, then invokes all tracked
   * unregister callbacks.
   *
   * Within-type order is LIFO (reverse of registration). Across types the
   * order is fixed: events → services → screens → actions. This is a new
   * (documented) contract in 0.6.0; the per-plugin disposal-order property in
   * tests/property/disposal-order-inverse.property.test.ts is at the plugin
   * level (not the within-plugin-resource level), so the change is observable
   * only to plugins whose own resources cross types — which is most plugins,
   * but no existing test pins a specific cross-type order.
   */
  async teardownPlugin(pluginName: string, context: RuntimeContext<TConfig>): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (plugin?.dispose) {
      try {
        await plugin.dispose(context);
      } catch (err) {
        this.logger.error(`Plugin "${pluginName}" dispose failed during teardown`, err);
      }
    }
    this.unregisterOwnedResources(pluginName);
    this.pluginResources.delete(pluginName);
    this.initializedPlugins = this.initializedPlugins.filter(n => n !== pluginName);
  }

  /**
   * Invokes every tracked unregister callback for a plugin and clears them
   * from its OwnedIds record (without removing the record itself, so the
   * caller may still inspect what was owned).
   *
   * Internal helper used by both teardownPlugin and the partial-rollback path
   * in executeSetup. Each closure is wrapped in try/catch — a failing
   * unregister should not block the others.
   */
  private unregisterOwnedResources(pluginName: string): void {
    const owned = this.pluginResources.get(pluginName);
    if (!owned) return;

    // events → services → screens → actions; within each type, LIFO.
    for (let i = owned.eventUnsubs.length - 1; i >= 0; i--) {
      try { owned.eventUnsubs[i](); } catch { /* best-effort */ }
    }
    owned.eventUnsubs.length = 0;

    const drainMap = (m: Map<string, () => void>) => {
      const closures = Array.from(m.values());
      for (let i = closures.length - 1; i >= 0; i--) {
        try { closures[i](); } catch { /* best-effort */ }
      }
      m.clear();
    };
    drainMap(owned.services);
    drainMap(owned.screens);
    drainMap(owned.actions);
  }

  async executeSetup(context: RuntimeContext<TConfig>): Promise<void> {    const initialized: string[] = [];
    let failingPluginName: string | undefined;

    try {
      // Execute plugin setup callbacks sequentially in registration order
      for (const plugin of this.plugins.values()) {
        failingPluginName = plugin.name; // Track current plugin in case it fails

        // Dependency Validation (Requirement 14.7)
        if (plugin.dependencies && plugin.dependencies.length > 0) {
          for (const dep of plugin.dependencies) {
            // Check if dependency is present in registry
            if (!this.plugins.has(dep)) {
              throw new Error(`Plugin "${plugin.name}" requires missing dependency "${dep}"`);
            }
            // Check if dependency is already initialized (order matters)
            // Note: SCR processes plugins in registration order. If dependencies are registered but not yet initialized,
            // it implies a wrong order.
            if (!this.initializedPlugins.includes(dep)) {
              throw new Error(`Plugin "${plugin.name}" requires dependency "${dep}" to be initialized first`);
            }
          }
        }

        // Config Validation (v0.3 Feature)
        // Validate plugin config before setup if validateConfig is defined
        if (plugin.validateConfig) {
          const validation = await runValidateConfig(plugin, context.config);
          if (!validation.ok) {
            throw new ValidationError('Plugin', `config (${validation.errors})`, plugin.name);
          }
          this.logger.debug(`Plugin "${plugin.name}" config validated successfully`);
        }

        // Support both sync and async setup callbacks
        const trackedCtx = this.buildTrackedContext(plugin.name, context);
        await plugin.setup(trackedCtx);
        // Track successfully initialized plugins
        initialized.push(plugin.name);
        this.initializedPlugins.push(plugin.name);
        this.logger.debug(`Plugin "${plugin.name}" initialized successfully`);      }
    } catch (error) {
      // Rollback the FAILING plugin's partial registrations first. Its
      // tracked context (buildTrackedContext) has already pushed unregister
      // callbacks for whatever resources it managed to register before
      // throwing — and previously these were leaked because the catch loop
      // below only walks `initialized` (which excludes the failing plugin).
      //
      // We deliberately do NOT call teardownPlugin here: that would invoke
      // the plugin's dispose, which is documented as the inverse of a
      // SUCCESSFUL setup. A half-setup plugin's dispose has no contract;
      // running it is more likely to corrupt state than to clean up. So we
      // only fire the tracked unregister callbacks.
      if (failingPluginName) {
        this.unregisterOwnedResources(failingPluginName);
        this.pluginResources.delete(failingPluginName);
      }

      // Rollback already-initialized plugins in reverse order
      this.logger.error('Plugin setup failed, rolling back initialized plugins');
      for (let i = initialized.length - 1; i >= 0; i--) {
        await this.teardownPlugin(initialized[i], context);
        this.logger.debug(`Rolled back plugin: ${initialized[i]}`);
      }
      this.initializedPlugins = [];
      // Re-throw with plugin context. We preserve the original error's class
      // identity (so callers can use `instanceof ValidationError`,
      // `instanceof DuplicateRegistrationError`, etc., as documented in
      // docs/guides/config-validation.md) while still prefixing the message
      // with the plugin name so users know which plugin failed.
      //
      // Implementation: build a new instance whose prototype chain matches
      // the original's, copy all own properties (including `field`,
      // `resourceType`, `pluginName`, etc.), augment the message, and set
      // `cause` so the original error is still inspectable via Error.cause.
      const wrappedMessage = `Plugin "${failingPluginName}" setup failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      if (error instanceof Error) {
        const proto = Object.getPrototypeOf(error);
        const wrapped = Object.create(proto) as Error;
        wrapped.message = wrappedMessage;
        wrapped.name = error.name;
        // Copy own enumerable properties (custom fields on subclasses like
        // ValidationError.field, ValidationError.resourceType, etc.)
        for (const key of Object.getOwnPropertyNames(error)) {
          if (key === 'message' || key === 'stack') continue;
          const desc = Object.getOwnPropertyDescriptor(error, key);
          if (desc) Object.defineProperty(wrapped, key, desc);
        }
        // Preserve the original stack so debuggers point at the real throw site
        wrapped.stack = error.stack;
        // Expose the original via Error.cause for callers that want to walk
        // the chain (supported by Node 16.9+).
        (wrapped as Error & { cause?: unknown }).cause = error;
        throw wrapped;
      }
      // Non-Error throw (string, object, etc.) — preserve plain Error fallback.
      throw new Error(wrappedMessage);
    }
  }

  async executeDispose(context: RuntimeContext<TConfig>): Promise<void> {
    // Dispose in reverse order of initialization
    const order = [...this.initializedPlugins].reverse();
    for (const pluginName of order) {
      await this.teardownPlugin(pluginName, context);
      this.logger.debug(`Plugin "${pluginName}" disposed`);
    }
  }

  /**
   * Builds a tracked context for a single plugin and runs its setup.
   * Used by hot-swap to set up a replacement plugin with resource tracking.
   */
  async setupSinglePlugin(plugin: PluginDefinition<TConfig>, context: RuntimeContext<TConfig>): Promise<void> {
    const trackedCtx = this.buildTrackedContext(plugin.name, context);
    await plugin.setup(trackedCtx);
    this.initializedPlugins.push(plugin.name);
  }

  /**
   * Replaces an existing plugin definition in the registry (used by hot-swap).
   * Does not run setup/dispose — caller is responsible for lifecycle.
   */
  replacePlugin(plugin: PluginDefinition<TConfig>): void {
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Resets the registry to its empty initial state.
   *
   * IMPORTANT: this is a *pure state reset*. It does NOT call `dispose()` on
   * initialized plugins, does NOT invoke their tracked unregister callbacks,
   * and does NOT touch the sibling registries (ActionEngine, ScreenRegistry,
   * ServiceRegistry) where those plugins registered their resources. Calling
   * `reset()` while plugins are still initialized will orphan their
   * registrations in those sibling registries.
   *
   * The correct pre-shutdown sequence is:
   *   await registry.executeDispose(context);  // dispose + unregister
   *   // ... clear sibling registries ...
   *   registry.reset();                        // wipe local state
   *
   * `Runtime.shutdown()` already does this in the right order.
   *
   * @since 0.5.0 (replaces the misleadingly-named `clear()`)
   */
  reset(): void {
    this.plugins.clear();
    this.initializedPlugins = [];
    this.pluginResources.clear();
  }

  /**
   * @deprecated since 0.5.0 — use {@link reset} instead. The name `clear`
   * suggested a full teardown (dispose + unregister), but this method has
   * always been a pure state reset. Calling it while plugins are still
   * initialized will orphan their registrations in the sibling registries.
   * Emits a logger.warn on every call; will be removed in 0.6.
   */
  clear(): void {
    this.logger.warn(
      'PluginRegistry.clear() is deprecated and will be removed in 0.6. Use reset() instead. ' +
      'Note: reset() is a state reset, not a teardown — call executeDispose() first if plugins are initialized.'
    );
    this.reset();
  }
}
