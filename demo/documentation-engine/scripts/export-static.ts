/**
 * Static Export Script
 * 
 * This script initializes the documentation engine runtime and executes
 * the static export action to generate static HTML files.
 * 
 * @see Requirements 10.1
 */

import { Runtime } from 'skeleton-crew-runtime';
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
} from '../src/plugins/index.js';
// Import static export plugin directly (not exported in browser builds)
import { createStaticExportPlugin } from '../src/plugins/static-export.js';

/**
 * Initialize the runtime with all plugins
 */
async function initializeRuntime(): Promise<Runtime> {
  console.log('[Export] Initializing runtime...');

  const runtime = new Runtime();

  // Register all plugins in the correct order
  runtime.registerPlugin(createComponentRegistryPlugin());
  runtime.registerPlugin(createRouterPlugin());
  runtime.registerPlugin(createMarkdownLoaderPlugin());
  // Note: Using markdown loader instead of markdown plugin for pre-parsed content
  runtime.registerPlugin(createSidebarPlugin());
  runtime.registerPlugin(createSearchPlugin());
  runtime.registerPlugin(createCodeBlockPlugin());
  runtime.registerPlugin(createThemePlugin());
  runtime.registerPlugin(createPlaygroundPlugin());
  runtime.registerPlugin(createVersioningPlugin());
  runtime.registerPlugin(createCachePlugin());
  runtime.registerPlugin(createStaticExportPlugin());
  runtime.registerPlugin(createCalloutPlugin());

  await runtime.initialize();

  console.log('[Export] Runtime initialized successfully!');

  return runtime;
}

/**
 * Execute the static export
 */
async function exportStatic(): Promise<void> {
  try {
    // Initialize runtime
    const runtime = await initializeRuntime();

    // Execute the static export action
    console.log('[Export] Starting static export...');
    const result = await runtime.getContext().actions.runAction<
      { outputDir: string },
      { pages: number; errors: string[] }
    >('export:static', {
      outputDir: './dist'
    });

    console.log('[Export] Static export completed successfully!');
    console.log(`[Export] Generated ${result.pages} pages`);
    
    if (result.errors && result.errors.length > 0) {
      console.warn(`[Export] Encountered ${result.errors.length} errors:`);
      result.errors.forEach((error: string) => {
        console.warn(`  - ${error}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('[Export] Static export failed:', error);
    process.exit(1);
  }
}

// Run the export
exportStatic();
