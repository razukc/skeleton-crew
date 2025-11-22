/**
 * Component Registry Plugin
 * 
 * Manages registration and resolution of MDX components.
 * Allows plugins to register React components that can be used in markdown files.
 * 
 * @see Requirements 7.2, 7.3, 7.4
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import type { ComponentType } from 'react';

/**
 * Component Registry interface for managing MDX components
 */
export interface ComponentRegistry {
  /**
   * Register a component with a given name
   * @param name - Component name (e.g., "Callout", "Playground")
   * @param component - React component implementation
   * @throws {Error} If component with same name is already registered
   * @see Requirements 7.4
   */
  register(name: string, component: ComponentType<any>): void;

  /**
   * Get a component by name
   * @param name - Component name
   * @returns Component implementation or undefined if not found
   * @see Requirements 7.2
   */
  get(name: string): ComponentType<any> | undefined;

  /**
   * Check if a component is registered
   * @param name - Component name
   * @returns true if component exists, false otherwise
   * @see Requirements 7.3
   */
  has(name: string): boolean;

  /**
   * Get all registered components
   * @returns Map of component names to implementations
   * @see Requirements 7.4
   */
  getAll(): Map<string, ComponentType<any>>;
}

/**
 * Extended RuntimeContext with component registry
 */
export interface RuntimeContextWithComponents extends RuntimeContext {
  componentRegistry: ComponentRegistry;
}

/**
 * Create the component registry plugin
 * 
 * This plugin MUST be registered first before any other plugins that
 * register components (e.g., CodeBlock, Callout, Playground).
 * 
 * @see Requirements 7.2, 7.3, 7.4
 */
export function createComponentRegistryPlugin(): PluginDefinition {
  // Component storage using Map
  const components = new Map<string, ComponentType<any>>();

  // Component registry implementation
  const registry: ComponentRegistry = {
    register(name: string, component: ComponentType<any>): void {
      // Validate inputs
      if (!name || typeof name !== 'string') {
        throw new Error('Component name must be a non-empty string');
      }
      if (!component) {
        throw new Error('Component implementation is required');
      }

      // Check for duplicate registration
      if (components.has(name)) {
        throw new Error(
          `Component "${name}" is already registered. ` +
          `Cannot register duplicate components.`
        );
      }

      // Register the component
      components.set(name, component);
    },

    get(name: string): ComponentType<any> | undefined {
      return components.get(name);
    },

    has(name: string): boolean {
      return components.has(name);
    },

    getAll(): Map<string, ComponentType<any>> {
      // Return a copy to prevent external modification
      return new Map(components);
    }
  };

  return {
    name: 'component-registry',
    version: '1.0.0',
    setup(context: RuntimeContext): void {
      // Extend the runtime context with component registry
      (context as RuntimeContextWithComponents).componentRegistry = registry;
    }
  };
}
