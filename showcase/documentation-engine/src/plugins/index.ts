/**
 * Plugin exports
 * 
 * Exports all documentation engine plugins.
 */

// Core plugins
// Note: createMarkdownPlugin is not exported for browser builds as it requires Node.js APIs
// It's only used in build scripts (see scripts/build-parser.ts)
export { createMarkdownLoaderPlugin } from './markdown-loader.js';
export { createRouterPlugin } from './router.js';
export { createComponentRegistryPlugin } from './component-registry.js';

// Feature plugins
export { createSidebarPlugin } from './sidebar.js';
export { createSearchPlugin } from './search.js';
export { createCodeBlockPlugin } from './code-block.js';
export { createThemePlugin } from './theme.js';
export { createPlaygroundPlugin } from './playground.js';
export { createVersioningPlugin } from './versioning.js';
export { createCachePlugin } from './cache.js';
// Note: createStaticExportPlugin is not exported for browser builds as it requires Node.js APIs
// It's only used in Node.js environments (see scripts/export-static.ts)
export { createCalloutPlugin } from './callout.js';

// Types
// Note: Markdown plugin types not exported for browser builds
export type { MarkdownLoaderPlugin, RuntimeContextWithMarkdownLoader } from './markdown-loader.js';
