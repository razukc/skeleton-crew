/**
 * Sessions Plugin
 * 
 * Manages session save and restore functionality.
 * Provides actions for saving, restoring, listing, and deleting sessions.
 * Emits events for session operations.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 11.1
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import type { SavedSession, Tab, TabSnapshot, GroupSnapshot } from '../types/index.js';
import { tabs, tabGroups, hasTabGroups } from '../utils/browser-adapter.js';

/**
 * Sessions Plugin State
 */
interface SessionsState {
  sessions: SavedSession[];
}

/**
 * Sessions Plugin Definition
 * 
 * Provides session management actions and emits session events.
 * Integrates with storage plugin for persistence.
 */
export const sessionsPlugin: PluginDefinition = {
  name: 'sessions',
  version: '1.0.0',

  setup(context: RuntimeContext) {
    // Initialize sessions state
    const state: SessionsState = {
      sessions: []
    };

    // Load sessions from storage on startup
    context.actions.runAction('storage:load', {
      key: 'sessions',
      defaultValue: []
    }).then((result: any) => {
      if (result.success && Array.isArray(result.data)) {
        state.sessions = result.data;
      }
    }).catch((error) => {
      console.error('Failed to load sessions on startup:', error);
    });

    /**
     * Action: sessions:save
     * 
     * Save current tab session with all open tabs, URLs, titles, and groups
     * 
     * @param params.name - Session name
     * @returns Promise resolving to saved session
     * 
     * Requirements: 4.1, 4.3, 4.4, 4.5
     */
    context.actions.registerAction({
      id: 'sessions:save',
      handler: async (params: { name: string }) => {
        try {
          const { name } = params;
          
          if (!name || name.trim() === '') {
            throw new Error('Session name is required');
          }

          // Query all open tabs
          const tabs = await context.actions.runAction<any, Tab[]>('tabs:query', {});
          
          // Capture tab snapshots
          const tabSnapshots: TabSnapshot[] = tabs.map(tab => ({
            title: tab.title,
            url: tab.url,
            groupId: tab.groupId
          }));
          
          // Capture group snapshots (if any tabs have groups)
          const groupIds = new Set(tabs.filter(t => t.groupId !== undefined).map(t => t.groupId!));
          const groupSnapshots: GroupSnapshot[] = [];
          
          // Note: In a real implementation, we would query chrome.tabGroups.get()
          // For now, we'll create basic group snapshots from the groupIds
          for (const groupId of groupIds) {
            groupSnapshots.push({
              id: groupId,
              title: `Group ${groupId}`,
              color: 'grey'
            });
          }
          
          // Generate unique session ID
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          
          // Create session object
          const session: SavedSession = {
            id: sessionId,
            name: name.trim(),
            createdAt: Date.now(),
            tabs: tabSnapshots,
            groups: groupSnapshots
          };
          
          // Add to state
          state.sessions.push(session);
          
          // Save to storage via storage plugin
          await context.actions.runAction('storage:save', {
            key: 'sessions',
            data: state.sessions
          });
          
          // Emit session:saved event
          context.events.emit('session:saved', session);
          
          return session;
        } catch (error: any) {
          throw new Error(`Failed to save session: ${error.message}`);
        }
      }
    });

    /**
     * Action: sessions:restore
     * 
     * Restore a saved session by opening all tabs and recreating groups
     * 
     * @param params.sessionId - Session ID to restore
     * @returns Promise resolving when session is restored
     * 
     * Requirements: 5.2, 5.3, 5.4, 5.5
     */
    context.actions.registerAction({
      id: 'sessions:restore',
      handler: async (params: { sessionId: string }) => {
        try {
          const { sessionId } = params;
          
          if (!sessionId) {
            throw new Error('Session ID is required');
          }

          // Find the session
          const session = state.sessions.find(s => s.id === sessionId);
          if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
          }

          // Track failures for partial restore reporting
          const failures: Array<{ url: string; error: string }> = [];
          const createdTabs: chrome.tabs.Tab[] = [];
          
          // Create tabs for each saved tab
          for (const tabSnapshot of session.tabs) {
            try {
              const createdTab = await tabs.create({
                url: tabSnapshot.url,
                active: false
              });
              createdTabs.push(createdTab);
            } catch (error: any) {
              failures.push({
                url: tabSnapshot.url,
                error: error.message || 'Unknown error'
              });
            }
          }
          
          // Recreate groups if they existed and tab groups are supported
          if (session.groups.length > 0 && hasTabGroups()) {
            try {
              // Group tabs by their original groupId
              const tabsByGroup = new Map<number, number[]>();
              
              session.tabs.forEach((tabSnapshot, index) => {
                if (tabSnapshot.groupId !== undefined && createdTabs[index]) {
                  const tabIds = tabsByGroup.get(tabSnapshot.groupId) || [];
                  tabIds.push(createdTabs[index].id!);
                  tabsByGroup.set(tabSnapshot.groupId, tabIds);
                }
              });
              
              // Create groups and assign tabs
              for (const [originalGroupId, tabIds] of tabsByGroup.entries()) {
                if (tabIds.length > 0) {
                  try {
                    const newGroupId = await tabGroups.group({ tabIds });
                    
                    // Find the original group properties
                    const originalGroup = session.groups.find(g => g.id === originalGroupId);
                    if (originalGroup) {
                      await tabGroups.update(newGroupId, {
                        title: originalGroup.title,
                        color: originalGroup.color as chrome.tabGroups.ColorEnum
                      });
                    }
                  } catch (error: any) {
                    // Log group creation failure but continue
                    console.warn(`Failed to recreate group ${originalGroupId}:`, error);
                  }
                }
              }
            } catch (error: any) {
              // Log group restoration failure but continue
              console.warn('Failed to restore groups:', error);
            }
          }
          
          // Emit appropriate event
          if (failures.length > 0) {
            context.events.emit('session:restore-partial', {
              sessionId,
              session,
              failures,
              successCount: createdTabs.length
            });
          } else {
            context.events.emit('session:restored', {
              sessionId,
              session,
              tabCount: createdTabs.length
            });
          }
          
          return {
            success: true,
            sessionId,
            tabsRestored: createdTabs.length,
            failures: failures.length > 0 ? failures : undefined
          };
        } catch (error: any) {
          // On error, maintain current state (no tabs created)
          throw new Error(`Failed to restore session: ${error.message}`);
        }
      }
    });

    /**
     * Action: sessions:list
     * 
     * List all saved sessions with names and dates
     * 
     * @returns Promise resolving to array of sessions
     * 
     * Requirements: 5.1
     */
    context.actions.registerAction({
      id: 'sessions:list',
      handler: async () => {
        try {
          // Reload sessions from storage to ensure we have latest data
          const result = await context.actions.runAction<any, any>('storage:load', {
            key: 'sessions',
            defaultValue: []
          });
          
          if (result.success && Array.isArray(result.data)) {
            state.sessions = result.data;
          }
          
          // Return all sessions
          return state.sessions;
        } catch (error: any) {
          throw new Error(`Failed to list sessions: ${error.message}`);
        }
      }
    });

    /**
     * Action: sessions:delete
     * 
     * Delete a saved session from storage
     * 
     * @param params.sessionId - Session ID to delete
     * @returns Promise resolving when session is deleted
     * 
     * Requirements: 11.1
     */
    context.actions.registerAction({
      id: 'sessions:delete',
      handler: async (params: { sessionId: string }) => {
        try {
          const { sessionId } = params;
          
          if (!sessionId) {
            throw new Error('Session ID is required');
          }

          // Find the session
          const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
          if (sessionIndex === -1) {
            throw new Error(`Session not found: ${sessionId}`);
          }
          
          // Remove from state
          const deletedSession = state.sessions[sessionIndex];
          state.sessions.splice(sessionIndex, 1);
          
          // Save updated sessions to storage
          await context.actions.runAction('storage:save', {
            key: 'sessions',
            data: state.sessions
          });
          
          // Emit session:deleted event
          context.events.emit('session:deleted', {
            sessionId,
            session: deletedSession
          });
          
          return {
            success: true,
            sessionId,
            deletedSession
          };
        } catch (error: any) {
          throw new Error(`Failed to delete session: ${error.message}`);
        }
      }
    });
  },

  dispose(_context: RuntimeContext) {
    // Event listeners are automatically cleaned up by the runtime
  }
};
