/**
 * Playground Plugin
 * 
 * Provides interactive code playgrounds for documentation.
 * Allows users to experiment with code examples in real-time.
 * 
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import type { ComponentType } from 'react';
import type { RuntimeContextWithComponents } from './component-registry.js';
import { Playground } from '../components/Playground.js';

/**
 * Create the playground plugin
 * 
 * This plugin registers the Playground component for use in MDX files.
 * The component provides an interactive code editor with live preview.
 * 
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */
export function createPlaygroundPlugin(): PluginDefinition {
  return {
    name: 'playground',
    version: '1.0.0',
    setup(context: RuntimeContext): void {
      console.log('[playground] Initializing playground plugin');

      // Register Playground component in component registry
      // @see Requirements 7.4
      const contextWithComponents = context as RuntimeContextWithComponents;
      if (contextWithComponents.componentRegistry) {
        // Create a wrapper component that passes the context
        const PlaygroundWithContext: ComponentType<any> = (props: any) => {
          return Playground({ ...props, context });
        };

        contextWithComponents.componentRegistry.register('Playground', PlaygroundWithContext);
        console.log('[playground] Playground component registered');
      } else {
        console.warn('[playground] Component registry not available, Playground component not registered');
      }
    }
  };
}
