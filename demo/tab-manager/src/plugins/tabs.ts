/**
 * Tabs Plugin
 * 
 * Manages tab operations and browser tab API integration.
 * Provides actions for querying, activating, and closing tabs.
 * Listens to browser tab events and emits corresponding runtime events.
 * 
 * Requirements: 1.1, 1.2, 1.5, 7.1, 7.5, 8.2, 8.5, 9.1, 11.1
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import { tabs, browserAPI } from '../utils/browser-adapter.js';
import type { Tab } from '../types/index.js';

/**
 * Tabs Plugin State
 */
interface TabsState {
  tabs: Tab[];
  activeTabId: number | null;
}

/**
 * Tabs Plugin Definition
 * 
 * Provides tab management actions and emits tab events.
 * Integrates with browser tab API for real-time updates.
 */
export const tabsPlugin: PluginDefinition = {
  name: 'tabs',
  version: '1.0.0',

  setup(context: RuntimeContext) {
    // Initialize tabs state
    const state: TabsState = {
      tabs: [],
      activeTabId: null
    };

    /**
     * Action: tabs:query
     * 
     * Query all open tabs across all windows
     * 
     * @param params - Optional query filter
     * @returns Promise resolving to array of tabs
     * 
     * Requirements: 1.1, 1.2
     */
    context.actions.registerAction({
      id: 'tabs:query',
      handler: async (params?: chrome.tabs.QueryInfo) => {
        try {
          // Query all tabs using browser API
          const queryInfo = params || {};
          const chromeTabs = await tabs.query(queryInfo);
          
          // Convert to our Tab interface
          const tabList: Tab[] = chromeTabs.map(tab => ({
            id: tab.id!,
            title: tab.title || 'Untitled',
            url: tab.url || '',
            favIconUrl: tab.favIconUrl,
            active: tab.active,
            windowId: tab.windowId,
            groupId: tab.groupId !== -1 ? tab.groupId : undefined,
            lastAccessed: (tab as any).lastAccessed
          }));
          
          // Update state
          state.tabs = tabList;
          const activeTab = tabList.find(t => t.active);
          if (activeTab) {
            state.activeTabId = activeTab.id;
          }
          
          return tabList;
        } catch (error: any) {
          throw new Error(`Failed to query tabs: ${error.message}`);
        }
      }
    });

    /**
     * Action: tabs:activate
     * 
     * Activate a specific tab and bring its window to front
     * 
     * @param params.tabId - Tab ID to activate
     * @returns Promise resolving when tab is activated
     * 
     * Requirements: 7.1, 7.5
     */
    context.actions.registerAction({
      id: 'tabs:activate',
      handler: async (params: { tabId: number }) => {
        try {
          const { tabId } = params;
          
          if (!tabId) {
            throw new Error('Tab ID is required');
          }
          
          // Activate the tab
          await tabs.update(tabId, { active: true });
          
          // Update state
          state.activeTabId = tabId;
          
          // Emit tab:activated event
          context.events.emit('tab:activated', { tabId });
          
          return { success: true, tabId };
        } catch (error: any) {
          throw new Error(`Failed to activate tab: ${error.message}`);
        }
      }
    });

    /**
     * Action: tabs:close
     * 
     * Close a specific tab
     * 
     * @param params.tabId - Tab ID to close
     * @returns Promise resolving when tab is closed
     * 
     * Requirements: 8.2, 8.5
     */
    context.actions.registerAction({
      id: 'tabs:close',
      handler: async (params: { tabId: number }) => {
        try {
          const { tabId } = params;
          
          if (!tabId) {
            throw new Error('Tab ID is required');
          }
          
          // Close the tab
          await tabs.remove(tabId);
          
          // Update state
          state.tabs = state.tabs.filter(t => t.id !== tabId);
          if (state.activeTabId === tabId) {
            state.activeTabId = null;
          }
          
          // Emit tab:closed event
          context.events.emit('tab:closed', { tabId });
          
          return { success: true, tabId };
        } catch (error: any) {
          throw new Error(`Failed to close tab: ${error.message}`);
        }
      }
    });

    /**
     * Action: tabs:findDuplicates
     * 
     * Find tabs with identical URLs
     * 
     * @returns Promise resolving to duplicate groups with counts
     * 
     * Requirements: 6.1, 6.2
     */
    context.actions.registerAction({
      id: 'tabs:findDuplicates',
      handler: async () => {
        try {
          // Query all tabs to get fresh data
          const chromeTabs = await tabs.query({});
          
          // Group tabs by URL
          const urlMap = new Map<string, Tab[]>();
          
          for (const tab of chromeTabs) {
            if (!tab.url) continue;
            
            const tabData: Tab = {
              id: tab.id!,
              title: tab.title || 'Untitled',
              url: tab.url,
              favIconUrl: tab.favIconUrl,
              active: tab.active,
              windowId: tab.windowId,
              groupId: tab.groupId !== -1 ? tab.groupId : undefined,
              lastAccessed: (tab as any).lastAccessed
            };
            
            if (!urlMap.has(tab.url)) {
              urlMap.set(tab.url, []);
            }
            urlMap.get(tab.url)!.push(tabData);
          }
          
          // Filter to only URLs with duplicates (more than 1 tab)
          const duplicateGroups: Array<{ url: string; tabs: Tab[]; count: number }> = [];
          
          for (const [url, tabList] of urlMap.entries()) {
            if (tabList.length > 1) {
              duplicateGroups.push({
                url,
                tabs: tabList,
                count: tabList.length
              });
            }
          }
          
          // Emit duplicates:found event
          context.events.emit('duplicates:found', {
            groups: duplicateGroups,
            totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.count, 0)
          });
          
          return {
            groups: duplicateGroups,
            totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.count, 0)
          };
        } catch (error: any) {
          throw new Error(`Failed to find duplicates: ${error.message}`);
        }
      }
    });

    /**
     * Action: tabs:closeDuplicates
     * 
     * Close duplicate tabs, keeping the most recently accessed tab for each URL
     * 
     * @returns Promise resolving to result with closed tab IDs
     * 
     * Requirements: 6.3, 6.4, 6.5
     */
    context.actions.registerAction({
      id: 'tabs:closeDuplicates',
      handler: async () => {
        try {
          // Query all tabs to get fresh data
          const chromeTabs = await tabs.query({});
          
          // Group tabs by URL
          const urlMap = new Map<string, Tab[]>();
          
          for (const tab of chromeTabs) {
            if (!tab.url) continue;
            
            const tabData: Tab = {
              id: tab.id!,
              title: tab.title || 'Untitled',
              url: tab.url,
              favIconUrl: tab.favIconUrl,
              active: tab.active,
              windowId: tab.windowId,
              groupId: tab.groupId !== -1 ? tab.groupId : undefined,
              lastAccessed: (tab as any).lastAccessed
            };
            
            if (!urlMap.has(tab.url)) {
              urlMap.set(tab.url, []);
            }
            urlMap.get(tab.url)!.push(tabData);
          }
          
          // For each URL with duplicates, keep the most recently accessed tab
          const tabsToClose: number[] = [];
          
          for (const [_url, tabList] of urlMap.entries()) {
            if (tabList.length > 1) {
              // Sort by lastAccessed (most recent first)
              // If lastAccessed is not available, use tab ID as fallback (higher ID = more recent)
              tabList.sort((a, b) => {
                const aTime = a.lastAccessed || a.id;
                const bTime = b.lastAccessed || b.id;
                return bTime - aTime;
              });
              
              // Keep the first tab (most recent), close the rest
              for (let i = 1; i < tabList.length; i++) {
                tabsToClose.push(tabList[i].id);
              }
            }
          }
          
          // Close all duplicate tabs
          if (tabsToClose.length > 0) {
            await tabs.remove(tabsToClose);
            
            // Update state
            state.tabs = state.tabs.filter(t => !tabsToClose.includes(t.id));
            if (state.activeTabId && tabsToClose.includes(state.activeTabId)) {
              state.activeTabId = null;
            }
          }
          
          // Emit duplicates:removed event
          context.events.emit('duplicates:removed', {
            closedTabIds: tabsToClose,
            count: tabsToClose.length
          });
          
          return {
            success: true,
            closedTabIds: tabsToClose,
            count: tabsToClose.length
          };
        } catch (error: any) {
          throw new Error(`Failed to close duplicates: ${error.message}`);
        }
      }
    });

    /**
     * Listen to browser tab events
     * 
     * Requirements: 1.5, 11.1
     */
    
    // Listen to tab created events
    browserAPI.tabs.onCreated.addListener((tab) => {
      const newTab: Tab = {
        id: tab.id!,
        title: tab.title || 'Untitled',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
        active: tab.active,
        windowId: tab.windowId,
        groupId: tab.groupId !== -1 ? tab.groupId : undefined,
        lastAccessed: (tab as any).lastAccessed
      };
      
      state.tabs.push(newTab);
      
      // Emit runtime event
      context.events.emit('tab:created', newTab);
    });
    
    // Listen to tab updated events
    browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      const updatedTab: Tab = {
        id: tab.id!,
        title: tab.title || 'Untitled',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
        active: tab.active,
        windowId: tab.windowId,
        groupId: tab.groupId !== -1 ? tab.groupId : undefined,
        lastAccessed: (tab as any).lastAccessed
      };
      
      // Update state
      const index = state.tabs.findIndex(t => t.id === tabId);
      if (index !== -1) {
        state.tabs[index] = updatedTab;
      }
      
      // Emit runtime event
      context.events.emit('tab:updated', { tabId, changeInfo, tab: updatedTab });
    });
    
    // Listen to tab removed events
    browserAPI.tabs.onRemoved.addListener((tabId, removeInfo) => {
      // Update state
      state.tabs = state.tabs.filter(t => t.id !== tabId);
      if (state.activeTabId === tabId) {
        state.activeTabId = null;
      }
      
      // Emit runtime event
      context.events.emit('tab:removed', { tabId, removeInfo });
    });
  },

  dispose(_context: RuntimeContext) {
    // Event listeners are automatically cleaned up by the runtime
    // Browser event listeners will be cleaned up when extension unloads
  }
};
