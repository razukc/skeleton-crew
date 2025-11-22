/**
 * Router Plugin
 * 
 * Manages URL-to-screen mapping and browser navigation.
 * Integrates with the browser History API for client-side routing.
 * 
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 11.2
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

/**
 * Route mapping interface
 */
export interface RouteMap {
  path: string;      // URL path (e.g., '/getting-started')
  screenId: string;  // Screen identifier
}

/**
 * Navigation result
 */
export interface NavigationResult {
  path: string;
  screenId: string;
}

/**
 * Navigation error event data
 */
export interface NavigationError {
  path: string;
  error: string;
}

/**
 * Router interface for managing routes and navigation
 */
export interface Router {
  /**
   * Register a route mapping
   * @param path - URL path
   * @param screenId - Screen identifier
   * @see Requirements 2.1
   */
  registerRoute(path: string, screenId: string): void;

  /**
   * Get screen ID for a given path
   * @param path - URL path
   * @returns Screen identifier or undefined if not found
   * @see Requirements 2.1
   */
  getScreenForPath(path: string): string | undefined;

  /**
   * Get all registered routes
   * @returns Map of paths to screen IDs
   */
  getAllRoutes(): Map<string, string>;
}

/**
 * Extended RuntimeContext with router
 */
export interface RuntimeContextWithRouter extends RuntimeContext {
  router: Router;
}

/**
 * Create the router plugin
 * 
 * This plugin manages URL routing and navigation using the browser History API.
 * It provides actions for navigation and emits events when navigation occurs.
 * 
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 11.2
 */
export function createRouterPlugin(): PluginDefinition {
  // Route storage using Map<path, screenId>
  const routes = new Map<string, string>();
  
  // Store unregister functions for cleanup
  const unregisterFunctions: Array<() => void> = [];
  
  // Store popstate handler for cleanup
  let popstateHandler: ((event: PopStateEvent) => void) | null = null;

  // Router implementation
  const router: Router = {
    registerRoute(path: string, screenId: string): void {
      // Validate inputs
      if (!path || typeof path !== 'string') {
        throw new Error('Route path must be a non-empty string');
      }
      if (!screenId || typeof screenId !== 'string') {
        throw new Error('Screen ID must be a non-empty string');
      }

      // Normalize path (ensure it starts with /)
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;

      // Register the route
      routes.set(normalizedPath, screenId);
    },

    getScreenForPath(path: string): string | undefined {
      // Normalize path
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return routes.get(normalizedPath);
    },

    getAllRoutes(): Map<string, string> {
      // Return a copy to prevent external modification
      return new Map(routes);
    }
  };

  return {
    name: 'router',
    version: '1.0.0',
    setup(context: RuntimeContext): void {
      // Extend the runtime context with router
      (context as RuntimeContextWithRouter).router = router;

      // Register router:navigate action
      // @see Requirements 2.2, 11.2
      const unregisterNavigate = context.actions.registerAction({
        id: 'router:navigate',
        timeout: 5000,
        handler: async (params: { path: string }): Promise<NavigationResult> => {
          const { path } = params;

          if (!path || typeof path !== 'string') {
            throw new Error('Navigation path must be a non-empty string');
          }

          // Normalize path
          const normalizedPath = path.startsWith('/') ? path : `/${path}`;

          // Get screen ID for path
          const screenId = router.getScreenForPath(normalizedPath);

          if (!screenId) {
            // Emit error event for invalid path
            // @see Requirements 2.5
            const errorData: NavigationError = {
              path: normalizedPath,
              error: `No screen found for path: ${normalizedPath}`
            };
            context.events.emit('router:error', errorData);
            throw new Error(`No screen found for path: ${normalizedPath}`);
          }

          // Update browser URL without reload
          if (typeof window !== 'undefined' && window.history) {
            window.history.pushState({ path: normalizedPath, screenId }, '', normalizedPath);
          }

          // Emit navigation event
          context.events.emit('router:navigated', {
            path: normalizedPath,
            screenId
          });

          return { path: normalizedPath, screenId };
        }
      });
      unregisterFunctions.push(unregisterNavigate);

      // Register router:back action
      // @see Requirements 2.3, 11.2
      const unregisterBack = context.actions.registerAction({
        id: 'router:back',
        timeout: 5000,
        handler: async (): Promise<NavigationResult> => {
          if (typeof window !== 'undefined' && window.history) {
            window.history.back();

            // Get current state after navigation
            const state = window.history.state;
            if (state && state.path && state.screenId) {
              // Emit navigation event
              context.events.emit('router:navigated', {
                path: state.path,
                screenId: state.screenId
              });

              return { path: state.path, screenId: state.screenId };
            }
          }

          throw new Error('Browser history navigation not available');
        }
      });
      unregisterFunctions.push(unregisterBack);

      // Register router:forward action
      // @see Requirements 2.4, 11.2
      const unregisterForward = context.actions.registerAction({
        id: 'router:forward',
        timeout: 5000,
        handler: async (): Promise<NavigationResult> => {
          if (typeof window !== 'undefined' && window.history) {
            window.history.forward();

            // Get current state after navigation
            const state = window.history.state;
            if (state && state.path && state.screenId) {
              // Emit navigation event
              context.events.emit('router:navigated', {
                path: state.path,
                screenId: state.screenId
              });

              return { path: state.path, screenId: state.screenId };
            }
          }

          throw new Error('Browser history navigation not available');
        }
      });
      unregisterFunctions.push(unregisterForward);

      // Listen to browser popstate event (back/forward buttons)
      if (typeof window !== 'undefined') {
        popstateHandler = (event) => {
          if (event.state && event.state.path && event.state.screenId) {
            // Emit navigation event
            context.events.emit('router:navigated', {
              path: event.state.path,
              screenId: event.state.screenId
            });
          }
        };
        window.addEventListener('popstate', popstateHandler);
      }
    },
    dispose(): void {
      // Unregister all actions
      unregisterFunctions.forEach(fn => fn());
      unregisterFunctions.length = 0;
      
      // Remove popstate listener
      if (typeof window !== 'undefined' && popstateHandler) {
        window.removeEventListener('popstate', popstateHandler);
        popstateHandler = null;
      }
      
      // Clear routes
      routes.clear();
      
      console.log('[router] Plugin disposed');
    }
  };
}
