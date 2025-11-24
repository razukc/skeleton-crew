/**
 * Groups Plugin
 * 
 * Manages tab grouping operations using the browser's Tab Groups API.
 * Only registers actions if Tab Groups API is available (Chrome/Edge).
 * Provides graceful degradation for browsers without tab groups support.
 * 
 * Requirements: 3.3, 3.5, 9.1, 11.1, Cross-browser
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import { tabGroups, hasTabGroups } from '../utils/browser-adapter.js';
import type { TabGroup } from '../types/index.js';

/**
 * Groups Plugin State
 */
interface GroupsState {
  groups: TabGroup[];
}

/**
 * Groups Plugin Definition
 * 
 * Provides tab grouping actions and emits group events.
 * Skips registration if Tab Groups API is not available.
 */
export const groupsPlugin: PluginDefinition = {
  name: 'groups',
  version: '1.0.0',

  setup(context: RuntimeContext) {
    // Feature detection - skip if Tab Groups API not available
    if (!hasTabGroups()) {
      // Skip registration if Tab Groups API is not available (Firefox)
      return;
    }

    // Initialize groups state
    const state: GroupsState = {
      groups: []
    };

    /**
     * Action: groups:create
     * 
     * Create a new tab group with specified tabs
     * 
     * @param params.tabIds - Array of tab IDs to group
     * @param params.title - Optional group title
     * @param params.color - Optional group color
     * @returns Promise resolving to group ID and details
     * 
     * Requirements: 3.3, 3.5
     */
    context.actions.registerAction({
      id: 'groups:create',
      handler: async (params: { 
        tabIds: number[]; 
        title?: string; 
        color?: chrome.tabGroups.ColorEnum 
      }) => {
        try {
          const { tabIds, title, color } = params;
          
          if (!tabIds || tabIds.length === 0) {
            throw new Error('Tab IDs array is required and must not be empty');
          }

          // Create the group using chrome.tabGroups.group API
          const groupId = await tabGroups.group({ tabIds });
          
          // Update group properties if title or color provided
          const updateProperties: chrome.tabGroups.UpdateProperties = {};
          if (title) {
            updateProperties.title = title;
          }
          if (color) {
            updateProperties.color = color;
          }
          
          let group: chrome.tabGroups.TabGroup | undefined;
          if (Object.keys(updateProperties).length > 0) {
            group = await tabGroups.update(groupId, updateProperties);
          } else {
            // Query to get the group details
            const groups = await tabGroups.query({});
            group = groups.find(g => g.id === groupId);
          }
          
          // Convert to our TabGroup interface
          const tabGroup: TabGroup = {
            id: groupId,
            title: group?.title,
            color: group?.color || 'grey',
            collapsed: group?.collapsed || false
          };
          
          // Update state
          state.groups.push(tabGroup);
          
          // Emit group:created event
          context.events.emit('group:created', { 
            groupId, 
            tabIds,
            group: tabGroup 
          });
          
          return { success: true, groupId, group: tabGroup };
        } catch (error: any) {
          throw new Error(`Failed to create group: ${error.message}`);
        }
      }
    });

    /**
     * Action: groups:update
     * 
     * Update group properties (title, color, collapsed state)
     * 
     * @param params.groupId - Group ID to update
     * @param params.title - Optional new title
     * @param params.color - Optional new color
     * @param params.collapsed - Optional collapsed state
     * @returns Promise resolving to updated group details
     * 
     * Requirements: 11.1
     */
    context.actions.registerAction({
      id: 'groups:update',
      handler: async (params: { 
        groupId: number; 
        title?: string; 
        color?: chrome.tabGroups.ColorEnum;
        collapsed?: boolean;
      }) => {
        try {
          const { groupId, title, color, collapsed } = params;
          
          if (groupId === undefined || groupId === null) {
            throw new Error('Group ID is required');
          }

          // Build update properties
          const updateProperties: chrome.tabGroups.UpdateProperties = {};
          if (title !== undefined) {
            updateProperties.title = title;
          }
          if (color !== undefined) {
            updateProperties.color = color;
          }
          if (collapsed !== undefined) {
            updateProperties.collapsed = collapsed;
          }
          
          if (Object.keys(updateProperties).length === 0) {
            throw new Error('At least one property (title, color, or collapsed) must be provided');
          }
          
          // Update the group
          const group = await tabGroups.update(groupId, updateProperties);
          
          // Convert to our TabGroup interface
          const tabGroup: TabGroup = {
            id: groupId,
            title: group.title,
            color: group.color,
            collapsed: group.collapsed
          };
          
          // Update state
          const index = state.groups.findIndex(g => g.id === groupId);
          if (index !== -1) {
            state.groups[index] = tabGroup;
          } else {
            state.groups.push(tabGroup);
          }
          
          // Emit group:updated event
          context.events.emit('group:updated', { 
            groupId, 
            group: tabGroup 
          });
          
          return { success: true, groupId, group: tabGroup };
        } catch (error: any) {
          throw new Error(`Failed to update group: ${error.message}`);
        }
      }
    });

    /**
     * Action: groups:ungroup
     * 
     * Remove tabs from their group (ungroup them)
     * 
     * @param params.tabIds - Array of tab IDs to ungroup
     * @returns Promise resolving when tabs are ungrouped
     * 
     * Requirements: 11.1
     */
    context.actions.registerAction({
      id: 'groups:ungroup',
      handler: async (params: { tabIds: number[] }) => {
        try {
          const { tabIds } = params;
          
          if (!tabIds || tabIds.length === 0) {
            throw new Error('Tab IDs array is required and must not be empty');
          }

          // Get the group ID before ungrouping (for event emission)
          // Query tabs to find their group IDs
          const tabs = await Promise.all(
            tabIds.map(async (tabId) => {
              try {
                const tab = await (async () => {
                  return new Promise<chrome.tabs.Tab>((resolve, reject) => {
                    chrome.tabs.get(tabId, (tab) => {
                      if (tab) {
                        resolve(tab);
                      } else {
                        reject(new Error(`Tab ${tabId} not found`));
                      }
                    });
                  });
                })();
                return tab;
              } catch {
                return null;
              }
            })
          );
          
          // Get unique group IDs from the tabs
          const groupIds = new Set(
            tabs
              .filter(tab => tab && tab.groupId !== undefined && tab.groupId !== -1)
              .map(tab => tab!.groupId!)
          );
          
          // Ungroup the tabs
          await tabGroups.ungroup(tabIds);
          
          // Update state - remove groups that no longer have tabs
          for (const groupId of groupIds) {
            const index = state.groups.findIndex(g => g.id === groupId);
            if (index !== -1) {
              state.groups.splice(index, 1);
            }
          }
          
          // Emit group:removed event for each affected group
          for (const groupId of groupIds) {
            context.events.emit('group:removed', { 
              groupId, 
              tabIds: tabIds.filter(id => {
                const tab = tabs.find(t => t?.id === id);
                return tab && tab.groupId === groupId;
              })
            });
          }
          
          return { success: true, tabIds, groupIds: Array.from(groupIds) };
        } catch (error: any) {
          throw new Error(`Failed to ungroup tabs: ${error.message}`);
        }
      }
    });
  },

  dispose(_context: RuntimeContext) {
    // Event listeners are automatically cleaned up by the runtime
  }
};
