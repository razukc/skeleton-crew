/**
 * Documentation Engine - Main Entry Point
 * 
 * This is the main entry point for the documentation engine application.
 * It initializes the Skeleton Crew Runtime and registers all plugins in the correct order.
 * 
 * @see Requirements: All
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Runtime } from 'skeleton-crew-runtime';

// Import all plugins
import {
  createComponentRegistryPlugin,
  createRouterPlugin,
  createMarkdownLoaderPlugin,
  createSidebarPlugin,
  createSearchPlugin,
  createCodeBlockPlugin,
  createThemePlugin,
  createPlaygroundPlugin,
  createVersioningPlugin,
  createCachePlugin,
  createCalloutPlugin,
} from './plugins/index.js';

// Import UI components
import { Layout } from './components/index.js';
import type { RuntimeContextWithRouter } from './plugins/router.js';

/**
 * Initialize the documentation engine
 * 
 * This function creates a Runtime instance and registers all plugins in the correct order:
 * 1. Component Registry (must be first - other plugins depend on it)
 * 2. Router Plugin
 * 3. Markdown Loader Plugin (for pre-parsed content)
 * 4. Markdown Plugin (for runtime parsing)
 * 5. Feature Plugins (order independent)
 * 
 * @see Requirements: All
 */
async function initializeDocumentationEngine(): Promise<Runtime> {
  console.log('[Documentation Engine] Initializing runtime...');

  // Create Runtime instance
  const runtime = new Runtime();

  // 1. Register Component Registry Plugin (MUST be first)
  console.log('[Documentation Engine] Registering Component Registry Plugin...');
  runtime.registerPlugin(createComponentRegistryPlugin());

  // 2. Register Router Plugin
  console.log('[Documentation Engine] Registering Router Plugin...');
  runtime.registerPlugin(createRouterPlugin());

  // 3. Register Markdown Loader Plugin (for pre-parsed content in browser)
  console.log('[Documentation Engine] Registering Markdown Loader Plugin...');
  runtime.registerPlugin(createMarkdownLoaderPlugin());

  // Note: Markdown Plugin is not registered in browser builds as it requires Node.js APIs
  // It's only used during the build process (see scripts/build-parser.ts)

  // 5. Register Feature Plugins (order independent)
  console.log('[Documentation Engine] Registering Feature Plugins...');
  runtime.registerPlugin(createSidebarPlugin());
  runtime.registerPlugin(createSearchPlugin());
  runtime.registerPlugin(createCodeBlockPlugin());
  runtime.registerPlugin(createThemePlugin());
  runtime.registerPlugin(createPlaygroundPlugin());
  
  // Load version configuration
  let versionConfig;
  try {
    const response = await fetch('/docs/versions.json');
    if (response.ok) {
      versionConfig = await response.json();
      console.log('[Documentation Engine] Loaded version configuration:', versionConfig);
    }
  } catch (error) {
    console.warn('[Documentation Engine] Failed to load versions.json, using default config:', error);
  }
  runtime.registerPlugin(createVersioningPlugin(versionConfig));
  
  runtime.registerPlugin(createCachePlugin());
  runtime.registerPlugin(createCalloutPlugin());
  // Note: StaticExportPlugin is not registered in browser builds (only used in Node.js)

  // Initialize runtime (executes all plugin setup callbacks)
  console.log('[Documentation Engine] Initializing plugins...');
  await runtime.initialize();

  console.log('[Documentation Engine] Runtime initialized successfully!');

  return runtime;
}

/**
 * Set up initial navigation
 * 
 * Handles initial URL routing and navigates to the appropriate page on load.
 * If no path is specified, navigates to the homepage.
 * Waits for markdown pages to be loaded before attempting navigation.
 * 
 * @param runtime - The initialized Runtime instance
 * @see Requirements 2.1
 */
async function setupInitialNavigation(runtime: Runtime): Promise<void> {
  console.log('[Documentation Engine] Setting up initial navigation...');

  const context = runtime.getContext();
  const routerContext = context as RuntimeContextWithRouter;

  // Wait for markdown pages to be loaded
  await new Promise<void>((resolve) => {
    const checkLoaded = () => {
      const markdownContext = context as any;
      if (markdownContext.markdown && markdownContext.markdown.getAllMetadata().size > 0) {
        console.log('[Documentation Engine] Markdown pages loaded');
        resolve();
      } else {
        // Listen for the all-pages-loaded event
        const unsubscribe = context.events.on('markdown:all-pages-loaded', () => {
          console.log('[Documentation Engine] Received all-pages-loaded event');
          unsubscribe(); // Unsubscribe after first call
          resolve();
        });
      }
    };
    checkLoaded();
  });

  // Get the current URL path
  const currentPath = window.location.pathname;
  console.log('[Documentation Engine] Current path:', currentPath);

  // Check if the path exists in the router
  const screenId = routerContext.router?.getScreenForPath(currentPath);

  if (screenId) {
    // Navigate to the current path
    console.log('[Documentation Engine] Navigating to:', currentPath);
    try {
      await context.actions.runAction('router:navigate', { path: currentPath });
    } catch (error) {
      console.warn('[Documentation Engine] Navigation to current path failed:', error);
      // Fall back to homepage
      await navigateToHomepage(runtime);
    }
  } else {
    // Navigate to homepage if path doesn't exist
    console.log('[Documentation Engine] Path not found, navigating to homepage');
    await navigateToHomepage(runtime);
  }
}

/**
 * Navigate to the homepage
 * 
 * @param runtime - The initialized Runtime instance
 */
async function navigateToHomepage(runtime: Runtime): Promise<void> {
  const context = runtime.getContext();
  
  try {
    // Try to navigate to the root path
    await context.actions.runAction('router:navigate', { path: '/' });
    console.log('[Documentation Engine] Navigated to homepage');
  } catch (error) {
    console.warn('[Documentation Engine] Homepage navigation failed:', error);
  }
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    // Initialize the runtime and register all plugins
    const runtime = await initializeDocumentationEngine();

    // Set up initial navigation (navigate to homepage or current URL)
    await setupInitialNavigation(runtime);

    // Get the root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // Render the application
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <Layout runtime={runtime} />
      </React.StrictMode>
    );

    console.log('[Documentation Engine] Application rendered successfully!');

    // Handle browser back/forward buttons
    window.addEventListener('popstate', async () => {
      const path = window.location.pathname;
      console.log('[Documentation Engine] Browser navigation to:', path);
      try {
        await runtime.getContext().actions.runAction('router:navigate', { path });
      } catch (error) {
        console.error('[Documentation Engine] Browser navigation failed:', error);
      }
    });
  } catch (error) {
    console.error('[Documentation Engine] Initialization failed:', error);
    
    // Display error to user
    const rootElement = document.getElementById('root');
    if (rootElement) {
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#d32f2f' }}>
            <h1>Documentation Engine - Initialization Error</h1>
            <p>Failed to initialize the documentation engine:</p>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '1rem', 
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </div>
        </React.StrictMode>
      );
    }
  }
}

// Start the application
main();
