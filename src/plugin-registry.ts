import semver from 'semver';
import { PluginDefinition, RuntimeContext, Logger, ValidationError, DuplicateRegistrationError, ActionDefinition, ScreenDefinition } from './types.js';
import { SwapBuffer } from './swap-buffer.js';
import type { ActionEngine } from './action-engine.js';
import type { ScreenRegistry } from './screen-registry.js';
import type { ServiceRegistry } from './service-registry.js';

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
   * Builds a buffered context for v2.setup during an atomic hot-swap.
   *
   * Sibling to {@link buildTrackedContext}, but every write goes into the
   * supplied {@link SwapBuffer} instead of the live registries. Reads merge
   * buffer over live: a v2 setup that calls `ctx.services.get('foo')` sees
   * v2's freshly-registered value if it exists in the buffer, otherwise
   * falls through to v1's live registration. This is the Q2 "buffer shadows
   * live" semantics from issue #2.
   *
   * v1 stays fully live for the entire duration of v2.setup (Q4): v1's
   * actions, screens, services, and event handlers continue to serve. If
   * v2.setup throws, the buffer is dropped and v1 is observably untouched
   * — the atomicity guarantee that motivated this whole module.
   *
   * `events.emit` / `runAction` pass through to the live bus / engine: a v2
   * setup that emits a custom event triggers v1's handlers, and a v2 setup
   * that calls into v1's actions runs v1's handler (v2's buffered actions
   * are NOT yet reachable via `runAction` — they activate at commit).
   *
   * `events.on` is buffered: the subscription is recorded but not wired
   * live until commit. Events emitted during v2.setup are NOT delivered to
   * v2's own handlers. Plugins rarely subscribe-then-immediately-test
   * inside their own setup; this trade-off keeps subscriptions from
   * leaking on rollback.
   *
   * @since 0.6.0
   */
  buildBufferedContext(
    pluginName: string,
    newPlugin: PluginDefinition<TConfig>,
    liveContext: RuntimeContext<TConfig>,
    buffer: SwapBuffer<TConfig>,
  ): RuntimeContext<TConfig> {
    const bufferedPlugins = {
      registerPlugin: (p: PluginDefinition<TConfig>) => liveContext.plugins.registerPlugin(p),
      getPlugin: (name: string): PluginDefinition<TConfig> | null => {
        if (name === pluginName) return newPlugin; // v2's view of itself
        return liveContext.plugins.getPlugin(name);
      },
      getAllPlugins: (): PluginDefinition<TConfig>[] => {
        const live = liveContext.plugins.getAllPlugins();
        return live.map(p => (p.name === pluginName ? newPlugin : p));
      },
      getInitializedPlugins: (): string[] => liveContext.plugins.getInitializedPlugins(),
      isInitialized: (name: string): boolean => {
        // v2 is not yet committed; report not-initialized for self.
        if (name === pluginName) return false;
        return liveContext.plugins.isInitialized(name);
      },
    };

    const proxy: RuntimeContext<TConfig> = {
      get events() {
        return {
          emit: (event: string, data?: unknown) => liveContext.events.emit(event, data),
          emitAsync: (event: string, data?: unknown) => liveContext.events.emitAsync(event, data),
          on: (event: string, handler: (data: unknown) => void) => {
            buffer.eventSubscriptions.push({ event, handler });
            return () => {
              const i = buffer.eventSubscriptions.findIndex(
                e => e.event === event && e.handler === handler,
              );
              if (i >= 0) buffer.eventSubscriptions.splice(i, 1);
            };
          },
        };
      },
      get plugins() { return bufferedPlugins; },
      get host() { return liveContext.host; },
      get config() { return liveContext.config; },
      get introspect() { return liveContext.introspect; },
      get logger() { return liveContext.logger; },
      get trace() { return liveContext.trace; },
      getRuntime: () => liveContext.getRuntime(),
      actions: {
        registerAction: <P, R>(action: ActionDefinition<P, R, TConfig>) => {
          const existing = buffer.actions.get(action.id);
          if (existing && !existing.explicitlyRemoved) {
            throw new DuplicateRegistrationError('Action', action.id);
          }
          // Live duplicate doesn't block: v2 is replacing v1's action by
          // design. Only same-plugin double-register is a real duplicate.
          buffer.actions.set(action.id, {
            def: action as unknown as ActionDefinition<unknown, unknown, TConfig>,
            explicitlyRemoved: false,
          });
          return () => {
            const entry = buffer.actions.get(action.id);
            if (entry) { entry.def = undefined; entry.explicitlyRemoved = true; }
          };
        },
        runAction: <P, R>(id: string, params?: P): Promise<R> => {
          // Pass through to live. v2's buffered actions are not reachable
          // via runAction until commit; v2 can read its own buffered defs
          // via hasAction (buffer-first) but cannot dispatch them yet.
          // Plugins rarely runAction during their own setup.
          return liveContext.actions.runAction<P, R>(id, params);
        },
        hasAction: (id: string) => {
          const entry = buffer.actions.get(id);
          if (entry) return !entry.explicitlyRemoved;
          return liveContext.actions.hasAction(id);
        },
      },
      screens: {
        registerScreen: (screen: ScreenDefinition) => {
          const existing = buffer.screens.get(screen.id);
          if (existing && !existing.explicitlyRemoved) {
            throw new DuplicateRegistrationError('Screen', screen.id);
          }
          buffer.screens.set(screen.id, { def: screen, explicitlyRemoved: false });
          return () => {
            const entry = buffer.screens.get(screen.id);
            if (entry) { entry.def = undefined; entry.explicitlyRemoved = true; }
          };
        },
        getScreen: (id: string): ScreenDefinition | null => {
          const entry = buffer.screens.get(id);
          if (entry) return entry.explicitlyRemoved ? null : (entry.def ?? null);
          return liveContext.screens.getScreen(id);
        },
        getAllScreens: (): ScreenDefinition[] => {
          const live = liveContext.screens.getAllScreens();
          const byId = new Map<string, ScreenDefinition>();
          for (const s of live) byId.set(s.id, s);
          for (const [id, entry] of buffer.screens) {
            if (entry.explicitlyRemoved) byId.delete(id);
            else if (entry.def) byId.set(id, entry.def);
          }
          return Array.from(byId.values());
        },
      },
      services: {
        register: <T>(name: string, service: T) => {
          const existing = buffer.services.get(name);
          if (existing && !existing.explicitlyRemoved) {
            throw new DuplicateRegistrationError('Service', name);
          }
          buffer.services.set(name, { def: service, explicitlyRemoved: false });
        },
        get: <T>(name: string): T => {
          const entry = buffer.services.get(name);
          if (entry) {
            if (entry.explicitlyRemoved || entry.def === undefined) {
              throw new Error(`Service "${name}" not found. Ensure the providing plugin is initialized.`);
            }
            return entry.def as T;
          }
          return liveContext.services.get<T>(name);
        },
        has: (name: string) => {
          const entry = buffer.services.get(name);
          if (entry) return !entry.explicitlyRemoved && entry.def !== undefined;
          return liveContext.services.has(name);
        },
        list: (): string[] => {
          const live = new Set(liveContext.services.list());
          for (const [name, entry] of buffer.services) {
            if (entry.explicitlyRemoved) live.delete(name);
            else if (entry.def !== undefined) live.add(name);
          }
          return Array.from(live);
        },
        unregister: (name: string) => {
          // Marks the name as explicitly removed for buffered reads. The
          // live registry is NOT touched here — that happens at commit, and
          // only if v1 owned `name`. If v2.setup throws after this call,
          // the buffer is dropped and v1's service is observably untouched.
          buffer.services.set(name, { def: undefined, explicitlyRemoved: true });
        },
      },
    };

    return proxy;
  }

  /**
   * Flips a {@link SwapBuffer} into the live registries in one synchronous
   * batch. Called by {@link Runtime.swapPluginInternal} after v2.setup
   * resolves successfully. This IS the moment of atomicity — no await
   * between the calls below; nothing else can interleave.
   *
   * Order:
   *  1. Install v2's resources (replaceAtomic if v1 owned the id, register
   *     otherwise). Records each id in newOwnedIds.
   *  2. Honor v2's explicit removals — unregister from live if v1 owned them.
   *  3. Retire orphans (Q1): ids v1 owned that v2 didn't touch get
   *     unregistered from live.
   *  4. Wire v2's event subscriptions live; record returned unsubs.
   *  5. Retire v1's event handlers.
   *  6. Replace the plugin's OwnedIds record with newOwnedIds.
   *
   * Steps 1 and 5 in this order mean an event emitted at the swap boundary
   * fires both v1's and v2's handlers (synchronous, no overlap possible),
   * never neither — preferred over the symmetric gap.
   *
   * @since 0.6.0
   */
  commitSwapBuffer(
    pluginName: string,
    buffer: SwapBuffer<TConfig>,
    registries: {
      actions: ActionEngine<TConfig>;
      screens: ScreenRegistry;
      services: ServiceRegistry;
      events: { on(event: string, handler: (data: unknown) => void): () => void };
    },
  ): void {
    const oldOwned = this.pluginResources.get(pluginName) ?? createOwnedIds();
    const newOwned = createOwnedIds();

    // 1. Install v2's resources.
    for (const [id, entry] of buffer.actions) {
      if (entry.explicitlyRemoved || entry.def === undefined) continue;
      registries.actions.replaceAtomic(entry.def);
      newOwned.actions.set(id, () => registries.actions.unregister(id));
    }
    for (const [id, entry] of buffer.screens) {
      if (entry.explicitlyRemoved || entry.def === undefined) continue;
      registries.screens.replaceAtomic(entry.def);
      newOwned.screens.set(id, () => registries.screens.unregister(id));
    }
    for (const [name, entry] of buffer.services) {
      if (entry.explicitlyRemoved || entry.def === undefined) continue;
      registries.services.replaceAtomic(name, entry.def);
      newOwned.services.set(name, () => registries.services.unregister(name));
    }

    // 2. Honor v2's explicit removals — unregister from live if v1 owned.
    for (const [id, entry] of buffer.actions) {
      if (entry.explicitlyRemoved && oldOwned.actions.has(id)) registries.actions.unregister(id);
    }
    for (const [id, entry] of buffer.screens) {
      if (entry.explicitlyRemoved && oldOwned.screens.has(id)) registries.screens.unregister(id);
    }
    for (const [name, entry] of buffer.services) {
      if (entry.explicitlyRemoved && oldOwned.services.has(name)) registries.services.unregister(name);
    }

    // 3. Retire orphans (Q1): v1 owned, v2 didn't touch → unregister.
    for (const id of oldOwned.actions.keys()) {
      if (!buffer.actions.has(id) && !newOwned.actions.has(id)) registries.actions.unregister(id);
    }
    for (const id of oldOwned.screens.keys()) {
      if (!buffer.screens.has(id) && !newOwned.screens.has(id)) registries.screens.unregister(id);
    }
    for (const name of oldOwned.services.keys()) {
      if (!buffer.services.has(name) && !newOwned.services.has(name)) registries.services.unregister(name);
    }

    // 4. Wire v2's event subscriptions live.
    for (const { event, handler } of buffer.eventSubscriptions) {
      newOwned.eventUnsubs.push(registries.events.on(event, handler));
    }

    // 5. Retire v1's event handlers. Done AFTER v2's are wired so no "neither
    // handler fires" window opens around an emission at the swap boundary.
    for (const unsub of oldOwned.eventUnsubs) {
      try { unsub(); } catch { /* best-effort */ }
    }

    // 6. Install v2's owned record.
    this.pluginResources.set(pluginName, newOwned);
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
   * Calls a plugin's `dispose` (if defined) and swallows-and-logs any throw.
   * Does NOT touch the plugin's owned resources — used by the 0.6 atomic
   * hot-swap path, where {@link commitSwapBuffer} has already retired v1's
   * resources and v2's are already live. The old plugin's dispose runs
   * AFTER commit (Q3), giving v1 a chance to release external handles
   * (db connections, file watchers) once it's no longer serving.
   *
   * Errors are logged, not rethrown: the swap is already observably
   * committed (plugin:swapped fired); a failing dispose cannot un-swap.
   *
   * @since 0.6.0
   */
  async runDispose(
    plugin: PluginDefinition<TConfig>,
    context: RuntimeContext<TConfig>,
  ): Promise<void> {
    if (!plugin.dispose) return;
    try {
      await plugin.dispose(context);
    } catch (err) {
      this.logger.error(`Plugin "${plugin.name}" dispose failed after swap commit`, err);
    }
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
