/**
 * Markdown Loader Plugin
 * 
 * Loads pre-parsed markdown content from JSON instead of parsing at runtime.
 * This reduces bundle size by excluding the markdown parser and improves load time.
 * 
 * @see Requirements 15.3, 15.4
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import type { Root } from 'mdast';

/**
 * Frontmatter metadata
 */
export interface Frontmatter {
  title?: string;
  description?: string;
  path?: string;
  order?: number;
  [key: string]: any;
}

/**
 * Heading node
 */
export interface HeadingNode {
  level: number;
  text: string;
  id: string;
}

/**
 * Code block node
 */
export interface CodeBlockNode {
  language: string;
  code: string;
  meta?: string;
}

/**
 * Component reference
 */
export interface ComponentReference {
  name: string;
  props: Record<string, any>;
}

/**
 * Screen metadata
 */
export interface ScreenMetadata {
  id: string;
  path: string;
  frontmatter: Frontmatter;
  headings: HeadingNode[];
  content: Root;
  codeBlocks: CodeBlockNode[];
  components: ComponentReference[];
}

/**
 * Markdown loader plugin interface
 */
export interface MarkdownLoaderPlugin {
  /**
   * Get metadata for a screen
   * @param screenId - Screen identifier
   * @returns Screen metadata or undefined if not found
   */
  getMetadata(screenId: string): ScreenMetadata | undefined;

  /**
   * Get all screen metadata
   * @returns Map of screen IDs to metadata
   */
  getAllMetadata(): Map<string, ScreenMetadata>;
}

/**
 * Extended RuntimeContext with markdown loader plugin
 */
export interface RuntimeContextWithMarkdownLoader extends RuntimeContext {
  markdown: MarkdownLoaderPlugin;
}

/**
 * Create the markdown loader plugin
 * 
 * This plugin loads pre-parsed markdown content from a JSON file.
 * The JSON file should be generated at build time using the build-parser script.
 * 
 * @param parsedContentUrl - URL to the parsed content JSON file
 * @see Requirements 15.3, 15.4
 */
export function createMarkdownLoaderPlugin(parsedContentUrl: string = '/parsed-content.json'): PluginDefinition {
  // Metadata storage
  const metadata = new Map<string, ScreenMetadata>();
  
  // Store unregister functions for cleanup
  const unregisterFunctions: Array<() => void> = [];

  // Markdown loader plugin implementation
  const markdownLoaderPlugin: MarkdownLoaderPlugin = {
    getMetadata(screenId: string): ScreenMetadata | undefined {
      return metadata.get(screenId);
    },

    getAllMetadata(): Map<string, ScreenMetadata> {
      return new Map(metadata);
    }
  };

  const plugin: PluginDefinition = {
    name: 'markdown-loader',
    version: '1.0.0',
    async setup(context: RuntimeContext): Promise<void> {
      // Store reference in context for access
      (context as any).markdown = markdownLoaderPlugin;

      try {
        // Load pre-parsed content from JSON
        const response = await fetch(parsedContentUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to load parsed content: ${response.statusText}`);
        }

        const parsedScreens: ScreenMetadata[] = await response.json();

        // Register each screen
        for (const screen of parsedScreens) {
          // Store metadata
          metadata.set(screen.id, screen);

          // Register as a screen and store unregister function
          const unregisterScreen = context.screens.registerScreen({
            id: screen.id,
            title: screen.frontmatter.title || screen.id,
            component: 'MarkdownPage'
          });
          unregisterFunctions.push(unregisterScreen);

          // Register route with router plugin
          const routerContext = context as any;
          if (routerContext.router) {
            routerContext.router.registerRoute(screen.path, screen.id);
          }

          // Emit page registered event
          context.events.emit('markdown:page-registered', {
            id: screen.id,
            metadata: screen
          });
        }

        console.log(`[markdown-loader] Loaded ${parsedScreens.length} pre-parsed markdown files`);
        
        // Emit event that all pages are loaded
        context.events.emit('markdown:all-pages-loaded', {
          count: parsedScreens.length
        });
      } catch (error) {
        console.error('[markdown-loader] Error loading pre-parsed content:', error);
        throw error;
      }
    },
    dispose(): void {
      // Unregister all screens
      unregisterFunctions.forEach(fn => fn());
      unregisterFunctions.length = 0;
      
      // Clear metadata
      metadata.clear();
      
      console.log('[markdown-loader] Plugin disposed');
    }
  };

  return plugin;
}
