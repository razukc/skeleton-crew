/**
 * Storage Plugin
 * 
 * Handles data persistence using chrome.storage.local API.
 * Provides actions for saving, loading, and clearing stored data.
 * Emits events for storage operations.
 * 
 * Requirements: 9.1, 11.1, 12.1, 12.2, 12.3, 12.4
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import { storage } from '../utils/browser-adapter.js';

/**
 * Storage Plugin Definition
 * 
 * Provides storage actions and emits storage events.
 * Handles errors gracefully and continues with default values on failure.
 */
export const storagePlugin: PluginDefinition = {
  name: 'storage',
  version: '1.0.0',

  setup(context: RuntimeContext) {
    /**
     * Action: storage:save
     * 
     * Saves data to chrome.storage.local
     * 
     * @param params.key - Storage key
     * @param params.data - Data to save
     * @returns Promise resolving when save is complete
     * 
     * Requirements: 12.1, 12.4
     */
    context.actions.registerAction({
      id: 'storage:save',
      handler: async (params: { key: string; data: any }) => {
        try {
          const { key, data } = params;
          
          if (!key) {
            throw new Error('Storage key is required');
          }

          // Save to chrome.storage.local
          await storage.set({ [key]: data });
          
          // Emit success event
          context.events.emit('storage:saved', { key, data });
          
          return { success: true, key };
        } catch (error: any) {
          // Check for quota exceeded error
          if (error.message && error.message.includes('QUOTA_BYTES')) {
            context.events.emit('storage:error', {
              operation: 'save',
              error: 'Storage quota exceeded',
              key: params.key
            });
            throw new Error('Storage quota exceeded. Please clear some data.');
          }
          
          // Emit error event
          context.events.emit('storage:error', {
            operation: 'save',
            error: error.message,
            key: params.key
          });
          
          throw error;
        }
      }
    });

    /**
     * Action: storage:load
     * 
     * Loads data from chrome.storage.local
     * 
     * @param params.key - Storage key to load
     * @param params.defaultValue - Default value if key doesn't exist
     * @returns Promise resolving to stored data or default value
     * 
     * Requirements: 12.2, 12.3
     */
    context.actions.registerAction({
      id: 'storage:load',
      handler: async (params: { key: string; defaultValue?: any }) => {
        try {
          const { key, defaultValue = null } = params;
          
          if (!key) {
            throw new Error('Storage key is required');
          }

          // Load from chrome.storage.local
          const result = await storage.get(key);
          const data = result[key] !== undefined ? result[key] : defaultValue;
          
          // Emit success event
          context.events.emit('storage:loaded', { key, data });
          
          return { success: true, key, data };
        } catch (error: any) {
          // Emit error event
          context.events.emit('storage:error', {
            operation: 'load',
            error: error.message,
            key: params.key
          });
          
          // Return default value on error (graceful degradation)
          const defaultValue = params.defaultValue !== undefined ? params.defaultValue : null;
          
          return { success: false, key: params.key, data: defaultValue };
        }
      }
    });

    /**
     * Action: storage:clear
     * 
     * Clears all data from chrome.storage.local
     * 
     * @returns Promise resolving when clear is complete
     * 
     * Requirements: 12.1
     */
    context.actions.registerAction({
      id: 'storage:clear',
      handler: async () => {
        try {
          // Clear all storage
          await storage.clear();
          
          // Emit success event
          context.events.emit('storage:cleared', {});
          
          return { success: true };
        } catch (error: any) {
          // Emit error event
          context.events.emit('storage:error', {
            operation: 'clear',
            error: error.message
          });
          
          throw error;
        }
      }
    });
  },

  dispose(_context: RuntimeContext) {
    // Event listeners are automatically cleaned up by the runtime
  }
};
