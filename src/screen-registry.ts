import type { ScreenDefinition, Logger } from './types.js';
import { ValidationError, DuplicateRegistrationError } from './types.js';

/**
 * ScreenRegistry subsystem for managing screen definitions.
 * Provides O(1) lookup performance using Map-based storage.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 13.1, 13.5, 16.1
 */
export class ScreenRegistry {
  private screens: Map<string, ScreenDefinition>;
  private logger: Logger;

  constructor(logger: Logger) {
    this.screens = new Map();
    this.logger = logger;
  }

  /**
   * Registers a screen definition.
   * Validates required fields and rejects duplicate IDs.
   * Returns an unregister function that removes the screen when called.
   * 
   * @param screen - The screen definition to register
   * @returns A function that unregisters the screen when called
   * @throws ValidationError if screen is missing required fields (id, title, component)
   * @throws DuplicateRegistrationError if a screen with the same ID is already registered
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.2, 5.5, 5.7, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5, 16.1, 18.1, 18.2, 18.3, 18.4, 18.5
   */
  registerScreen(screen: ScreenDefinition): () => void {
    // Validate required fields before any state modification (Requirements 18.1, 18.2, 18.3, 18.5)
    if (!screen.id || typeof screen.id !== 'string') {
      throw new ValidationError('Screen', 'id');
    }
    if (!screen.title || typeof screen.title !== 'string') {
      throw new ValidationError('Screen', 'title', screen.id);
    }
    if (!screen.component || typeof screen.component !== 'string') {
      throw new ValidationError('Screen', 'component', screen.id);
    }

    // Check for duplicate ID (Requirements 15.1, 15.2, 15.3, 15.4, 15.5)
    if (this.screens.has(screen.id)) {
      throw new DuplicateRegistrationError('Screen', screen.id);
    }

    // Register the screen
    this.screens.set(screen.id, screen);
    this.logger.debug(`Screen "${screen.id}" registered successfully`);

    // Return idempotent, identity-guarded unregister function.
    // Only removes the id if THIS definition is still the live one, so a stale
    // closure (e.g. an old plugin version's dispose firing after a hot-swap
    // installed a new def under the same id) cannot delete the current owner's
    // screen. See Finding 1. (Requirements 4.1, 4.2, 4.3, 4.4, 4.5)
    return () => {
      if (this.screens.get(screen.id) === screen) {
        this.screens.delete(screen.id);
      }
    };
  }

  /**
   * Atomically replaces a screen's definition in place.
   *
   * If the id is already registered, its definition is swapped (single
   * `Map.set`) — no DuplicateRegistrationError, no transient empty state.
   * If the id is absent, behaves like a register (sets the definition; no
   * unregister callback is returned).
   *
   * Used by hot-swap commit (PluginRegistry.commitSwapBuffer) to install v2's
   * resources without going through unregister-then-register. Validation
   * matches registerScreen's so a malformed def cannot replace a good one.
   *
   * @since 0.6.0
   * @throws ValidationError if the screen lacks `id`, `title`, or `component`.
   */
  replaceAtomic(screen: ScreenDefinition): void {
    if (!screen.id || typeof screen.id !== 'string') {
      throw new ValidationError('Screen', 'id');
    }
    if (!screen.title || typeof screen.title !== 'string') {
      throw new ValidationError('Screen', 'title', screen.id);
    }
    if (!screen.component || typeof screen.component !== 'string') {
      throw new ValidationError('Screen', 'component', screen.id);
    }
    this.screens.set(screen.id, screen);
    this.logger.debug(`Screen "${screen.id}" replaced atomically`);
  }

  /**
   * Unregisters a screen by id. Idempotent — no-op if the id is absent.
   * Used by hot-swap commit to retire ids v1 owned that v2 does not
   * re-register. Plugins should continue to use the unregister callback
   * returned by `registerScreen` rather than calling this directly.
   *
   * @since 0.6.0
   */
  unregister(id: string): void {
    if (this.screens.has(id)) {
      this.screens.delete(id);
      this.logger.debug(`Screen "${id}" unregistered`);
    }
  }

  /**
   * Retrieves a screen definition by ID.
   * 
   * @param id - The screen identifier
   * @returns The screen definition or null if not found
   * 
   * Requirements: 5.3, 5.6, 13.1
   */
  getScreen(id: string): ScreenDefinition | null {
    return this.screens.get(id) ?? null;
  }

  /**
   * Retrieves all registered screen definitions.
   * Returns a copy to ensure data isolation.
   * 
   * @returns Array copy of all registered screen definitions
   * 
   * Requirements: 5.4, 10.1, 10.2, 10.3, 10.4, 10.5
   */
  getAllScreens(): ScreenDefinition[] {
    return Array.from(this.screens.values());
  }

  /**
   * Clears all registered screens.
   * Used during shutdown to release resources.
   * 
   * Requirement: 13.5
   */
  clear(): void {
    this.screens.clear();
  }
}
