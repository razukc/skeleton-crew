import { UIProvider, ScreenDefinition } from './types.js';

/**
 * UIBridge manages optional UI provider registration and screen rendering.
 * Validates provider implements required methods and rejects duplicate registration.
 */
export class UIBridge {
  private provider: UIProvider | null = null;

  /**
   * Register a UI provider with the runtime.
   * @throws Error if provider is invalid or already registered
   */
  setProvider(provider: UIProvider): void {
    // Reject duplicate provider registration
    if (this.provider !== null) {
      throw new Error('UI provider already registered');
    }

    // Validate provider has required methods
    if (typeof provider.mount !== 'function') {
      throw new Error('UI provider must implement mount method');
    }

    if (typeof provider.render !== 'function') {
      throw new Error('UI provider must implement render method');
    }

    this.provider = provider;
  }

  /**
   * Get the registered UI provider.
   * @returns The registered UIProvider or null if none registered
   */
  getProvider(): UIProvider | null {
    return this.provider;
  }

  /**
   * Render a screen using the registered UI provider.
   * @throws Error if no UI provider is registered
   */
  renderScreen(screen: ScreenDefinition): unknown {
    if (this.provider === null) {
      throw new Error('No UI provider registered');
    }

    return this.provider.render(screen);
  }

  /**
   * Clear the UI provider during shutdown.
   */
  clear(): void {
    this.provider = null;
  }
}
