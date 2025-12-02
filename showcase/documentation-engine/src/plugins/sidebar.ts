/**
 * Sidebar Plugin
 * 
 * Builds navigation tree from registered screens and tracks active page.
 * Organizes pages hierarchically based on folder structure.
 * 
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import type { ScreenMetadata } from './markdown.js';

/**
 * Navigation item in the sidebar tree
 */
export interface NavigationItem {
  id: string;
  title: string;
  path: string;
  order: number;
  children: NavigationItem[];
}

/**
 * Navigation tree structure
 */
export interface NavigationTree {
  root: NavigationItem[];
  flat: Map<string, NavigationItem>;
}

/**
 * Sidebar plugin interface
 */
export interface SidebarPlugin {
  /**
   * Get the navigation tree
   * @returns Navigation tree with root items and flat map
   */
  getNavigationTree(): NavigationTree;

  /**
   * Get the active page ID
   * @returns Active page ID or null if none
   */
  getActivePage(): string | null;

  /**
   * Set the active page
   * @param pageId - Page ID to set as active
   */
  setActivePage(pageId: string): void;
}

/**
 * Extended RuntimeContext with sidebar plugin
 */
export interface RuntimeContextWithSidebar extends RuntimeContext {
  sidebar: SidebarPlugin;
}

/**
 * Build hierarchical navigation tree from flat screen list
 * 
 * @param screens - Map of screen IDs to metadata
 * @returns Navigation tree with hierarchical structure
 * @see Requirements 3.1, 3.2
 */
function buildNavigationTree(
  screens: Map<string, ScreenMetadata>
): NavigationTree {
  const flat = new Map<string, NavigationItem>();
  const root: NavigationItem[] = [];

  // First pass: Create all navigation items
  for (const [id, metadata] of screens.entries()) {
    const item: NavigationItem = {
      id,
      title: metadata.frontmatter.title || id,
      path: metadata.path,
      order: metadata.frontmatter.order ?? 999,
      children: []
    };
    flat.set(id, item);
  }

  // Second pass: Build hierarchy based on path structure
  for (const [_id, item] of flat.entries()) {
    // Split path into segments (e.g., '/guides/plugins' -> ['guides', 'plugins'])
    const segments = item.path
      .split('/')
      .filter(s => s.length > 0);

    if (segments.length === 0 || segments.length === 1) {
      // Top-level item (root path '/' or single segment like '/getting-started')
      root.push(item);
    } else {
      // Find parent based on path
      // For '/guides/plugins', parent would be '/guides'
      const parentPath = '/' + segments.slice(0, -1).join('/');
      
      // Find parent by path
      let parent: NavigationItem | undefined;
      for (const [, potentialParent] of flat.entries()) {
        if (potentialParent.path === parentPath) {
          parent = potentialParent;
          break;
        }
      }

      if (parent) {
        parent.children.push(item);
      } else {
        // If no parent found, add to root
        root.push(item);
      }
    }
  }

  return { root, flat };
}

/**
 * Sort navigation items by order then alphabetically
 * 
 * @param items - Navigation items to sort
 * @see Requirements 3.4, 3.5
 */
function sortNavigationItems(items: NavigationItem[]): void {
  items.sort((a, b) => {
    // First sort by order
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    // Then alphabetically by title
    return a.title.localeCompare(b.title);
  });

  // Recursively sort children
  for (const item of items) {
    if (item.children.length > 0) {
      sortNavigationItems(item.children);
    }
  }
}

/**
 * Create the sidebar plugin
 * 
 * This plugin builds a navigation tree from registered screens,
 * tracks the active page, and provides navigation data to the UI.
 * 
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function createSidebarPlugin(): PluginDefinition {
  let navigationTree: NavigationTree = { root: [], flat: new Map() };
  let activePage: string | null = null;
  
  // Store unsubscribe functions for cleanup
  let unsubscribePageRegistered: (() => void) | null = null;
  let unsubscribeAllPagesLoaded: (() => void) | null = null;
  let unsubscribeNavigated: (() => void) | null = null;

  // Sidebar plugin implementation
  const sidebarPlugin: SidebarPlugin = {
    getNavigationTree(): NavigationTree {
      return navigationTree;
    },

    getActivePage(): string | null {
      return activePage;
    },

    setActivePage(pageId: string): void {
      activePage = pageId;
    }
  };

  return {
    name: 'sidebar',
    version: '1.0.0',
    setup(context: RuntimeContext): void {
      // Extend the runtime context with sidebar plugin
      (context as RuntimeContextWithSidebar).sidebar = sidebarPlugin;

      /**
       * Rebuild navigation tree from current screens
       * @see Requirements 3.1, 3.2, 3.4, 3.5
       */
      const rebuildNavigationTree = (): void => {
        // Get markdown plugin from context
        const markdownContext = context as any;
        if (!markdownContext.markdown) {
          console.warn('Markdown plugin not found, cannot build navigation tree');
          return;
        }

        // Get all screen metadata
        const screens = markdownContext.markdown.getAllMetadata();

        // Build hierarchical tree
        navigationTree = buildNavigationTree(screens);

        // Sort items by order and alphabetically
        sortNavigationItems(navigationTree.root);
      };

      // Listen to markdown:page-registered events to update navigation
      // @see Requirements 3.1, 3.2
      unsubscribePageRegistered = context.events.on('markdown:page-registered', (_data: any) => {
        rebuildNavigationTree();
      });

      // Listen to markdown:all-pages-loaded event to rebuild navigation after all pages are loaded
      // @see Requirements 3.1, 3.2
      unsubscribeAllPagesLoaded = context.events.on('markdown:all-pages-loaded', (_data: any) => {
        console.log('[sidebar] All pages loaded, rebuilding navigation tree');
        rebuildNavigationTree();
      });

      // Listen to router:navigated events to update active page
      // @see Requirements 3.3
      unsubscribeNavigated = context.events.on('router:navigated', (data: any) => {
        if (data && data.screenId) {
          activePage = data.screenId;
        }
      });

      // Initial build of navigation tree
      // This handles screens that were registered before the sidebar plugin
      rebuildNavigationTree();
    },
    dispose(): void {
      // Clean up event listeners
      if (unsubscribePageRegistered) unsubscribePageRegistered();
      if (unsubscribeAllPagesLoaded) unsubscribeAllPagesLoaded();
      if (unsubscribeNavigated) unsubscribeNavigated();
      
      // Clear navigation tree
      navigationTree = { root: [], flat: new Map() };
      activePage = null;
      
      console.log('[sidebar] Plugin disposed');
    }
  };
}
