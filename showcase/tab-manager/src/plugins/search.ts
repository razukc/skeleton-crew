/**
 * Search Plugin
 * 
 * Provides tab search and filtering functionality.
 * Filters tabs by title or URL (case-insensitive).
 * Emits events when search query changes or is cleared.
 * 
 * Requirements: 2.1, 2.3, 2.5, 9.1, 11.1
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import type { Tab } from '../types/index.js';

/**
 * Search Plugin State
 */
interface SearchState {
  query: string;
  filteredTabs: Tab[];
  allTabs: Tab[];
}

/**
 * Search Plugin Definition
 * 
 * Provides search actions and emits search events.
 * Maintains search state and filtered tab list.
 */
export const searchPlugin: PluginDefinition = {
  name: 'search',
  version: '1.0.0',

  setup(context: RuntimeContext) {
    // Initialize search state
    const state: SearchState = {
      query: '',
      filteredTabs: [],
      allTabs: []
    };

    /**
     * Action: search:filter
     * 
     * Filter tabs by query string (case-insensitive)
     * Searches in both title and URL
     * 
     * @param params.query - Search query string
     * @param params.tabs - Array of tabs to filter
     * @returns Promise resolving to filtered tab list
     * 
     * Requirements: 2.1
     */
    context.actions.registerAction({
      id: 'search:filter',
      handler: async (params: { query: string; tabs: Tab[] }) => {
        try {
          const { query, tabs } = params;
          
          if (!tabs) {
            throw new Error('Tabs array is required');
          }

          // Store all tabs for later restoration
          state.allTabs = tabs;
          state.query = query || '';

          // If query is empty, return all tabs
          if (!state.query.trim()) {
            state.filteredTabs = tabs;
            context.events.emit('search:updated', { 
              query: state.query, 
              results: state.filteredTabs 
            });
            return state.filteredTabs;
          }

          // Filter tabs by title or URL (case-insensitive)
          const lowerQuery = state.query.toLowerCase();
          state.filteredTabs = tabs.filter(tab => {
            const titleMatch = tab.title.toLowerCase().includes(lowerQuery);
            const urlMatch = tab.url.toLowerCase().includes(lowerQuery);
            return titleMatch || urlMatch;
          });

          // Emit search:updated event
          context.events.emit('search:updated', { 
            query: state.query, 
            results: state.filteredTabs 
          });

          return state.filteredTabs;
        } catch (error: any) {
          throw new Error(`Failed to filter tabs: ${error.message}`);
        }
      }
    });

    /**
     * Action: search:clear
     * 
     * Clear search query and restore full tab list
     * 
     * @returns Promise resolving to full tab list
     * 
     * Requirements: 2.3, 2.5
     */
    context.actions.registerAction({
      id: 'search:clear',
      handler: async () => {
        try {
          // Clear query
          state.query = '';
          
          // Restore full tab list
          state.filteredTabs = state.allTabs;

          // Emit search:cleared event
          context.events.emit('search:cleared', { 
            results: state.filteredTabs 
          });

          return state.filteredTabs;
        } catch (error: any) {
          throw new Error(`Failed to clear search: ${error.message}`);
        }
      }
    });
  },

  dispose(_context: RuntimeContext) {
    // Event listeners are automatically cleaned up by the runtime
  }
};
