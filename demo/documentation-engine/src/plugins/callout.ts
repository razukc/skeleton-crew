/**
 * Callout Plugin
 * 
 * Registers the Callout component for use in MDX files.
 * Provides styled callout boxes for info, warning, and error messages.
 * 
 * @see Requirements 7.4, 13.1, 13.2
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import type { ComponentType } from 'react';
import type { RuntimeContextWithComponents } from './component-registry.js';
import { Callout } from '../components/Callout.js';

/**
 * Create the callout plugin
 * 
 * This plugin registers the Callout component in the component registry,
 * making it available for use in MDX files.
 * 
 * @see Requirements 7.4, 13.1
 */
export function createCalloutPlugin(): PluginDefinition {
  return {
    name: 'callout',
    version: '1.0.0',
    setup(context: RuntimeContext): void {
      // Register Callout component in component registry
      // @see Requirements 7.4, 13.1
      const contextWithComponents = context as RuntimeContextWithComponents;
      
      if (contextWithComponents.componentRegistry) {
        // Register the Callout component
        contextWithComponents.componentRegistry.register('Callout', Callout as ComponentType<any>);
        console.log('[callout] Callout component registered');
      } else {
        console.warn('[callout] Component registry not available, Callout component not registered');
      }
    }
  };
}
