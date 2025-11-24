/**
 * Background Service Worker
 * 
 * Hosts the Skeleton Crew Runtime and manages extension lifecycle.
 * Registers all plugins and handles message passing between UI and plugins.
 * 
 * Requirements: 9.1, 9.2, 10.4, 11.2, 14.2
 */

import { Runtime } from 'skeleton-crew-runtime';
import { storagePlugin } from '../plugins/storage.js';
import { tabsPlugin } from '../plugins/tabs.js';
import { searchPlugin } from '../plugins/search.js';
import { groupsPlugin } from '../plugins/groups.js';
import { sessionsPlugin } from '../plugins/sessions.js';
import { browserAPI } from '../utils/browser-adapter.js';
import type { Message } from '../types/index.js';

/**
 * Initialize the extension
 * 
 * Creates Runtime instance, registers plugins, and initializes the runtime.
 * 
 * Requirements: 9.1, 9.2, 14.2
 */
async function initializeExtension(): Promise<Runtime> {
  console.log('[Tab Manager] Initializing extension...');
  
  // Create Runtime instance
  const runtime = new Runtime();
  
  // Register all plugins in order
  // Storage plugin must be registered first as other plugins depend on it
  runtime.registerPlugin(storagePlugin);
  runtime.registerPlugin(tabsPlugin);
  runtime.registerPlugin(searchPlugin);
  runtime.registerPlugin(groupsPlugin);
  runtime.registerPlugin(sessionsPlugin);
  
  // Initialize runtime (executes plugin setup callbacks)
  await runtime.initialize();
  
  console.log('[Tab Manager] Extension initialized successfully');
  
  return runtime;
}

/**
 * Handle messages from popup/content scripts
 * 
 * Routes action messages to the runtime and returns results.
 * Handles errors gracefully and returns error messages.
 * 
 * Requirements: 10.4
 */
function setupMessageHandler(runtime: Runtime): void {
  const context = runtime.getContext();
  
  browserAPI.runtime.onMessage.addListener(
    (message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
      // Handle action messages
      if (message.type === 'action') {
        const { action, params } = message;
        
        if (!action) {
          sendResponse({
            success: false,
            error: 'Action name is required'
          });
          return false;
        }
        
        // Execute action via runtime
        context.actions.runAction(action, params)
          .then((result) => {
            sendResponse({
              success: true,
              result
            });
          })
          .catch((error: Error) => {
            console.error(`[Tab Manager] Action ${action} failed:`, error);
            sendResponse({
              success: false,
              error: error.message || 'Unknown error'
            });
          });
        
        // Return true to indicate async response
        return true;
      }
      
      // Unknown message type
      sendResponse({
        success: false,
        error: 'Unknown message type'
      });
      return false;
    }
  );
  
  console.log('[Tab Manager] Message handler registered');
}

/**
 * Broadcast events to all extension contexts
 * 
 * Listens to runtime events and broadcasts them to popup and other contexts.
 * 
 * Requirements: 11.2
 */
function setupEventBroadcaster(runtime: Runtime): void {
  const context = runtime.getContext();
  
  // List of events to broadcast
  const broadcastEvents = [
    // Tab events
    'tab:created',
    'tab:updated',
    'tab:removed',
    'tab:activated',
    'tab:closed',
    
    // Group events
    'group:created',
    'group:updated',
    'group:removed',
    
    // Session events
    'session:saved',
    'session:restored',
    'session:restore-partial',
    'session:deleted',
    
    // Search events
    'search:updated',
    'search:cleared',
    
    // Storage events
    'storage:loaded',
    'storage:saved',
    'storage:cleared',
    'storage:error',
    
    // Duplicate events
    'duplicates:found',
    'duplicates:removed'
  ];
  
  // Subscribe to all events and broadcast them
  broadcastEvents.forEach((eventName) => {
    context.events.on(eventName, (data) => {
      // Broadcast to all tabs (if needed)
      // Note: In most cases, we only need to send to popup
      // For now, we'll just log the event
      console.log(`[Tab Manager] Event: ${eventName}`, data);
      
      // Send to popup if it's open
      // We can use chrome.runtime.sendMessage to send to popup
      // The popup will need to listen for these events
      try {
        browserAPI.runtime.sendMessage({
          type: 'event',
          event: eventName,
          data
        }).catch(() => {
          // Popup might not be open, ignore error
        });
      } catch (error) {
        // Popup might not be open, ignore error
      }
    });
  });
  
  console.log('[Tab Manager] Event broadcaster registered');
}

/**
 * Main entry point
 * 
 * Initializes the extension and sets up message handling and event broadcasting.
 */
(async () => {
  try {
    // Initialize extension
    const runtime = await initializeExtension();
    
    // Set up message handler
    setupMessageHandler(runtime);
    
    // Set up event broadcaster
    setupEventBroadcaster(runtime);
    
    console.log('[Tab Manager] Background service worker ready');
  } catch (error) {
    console.error('[Tab Manager] Failed to initialize extension:', error);
  }
})();

/**
 * Handle extension shutdown
 * 
 * Clean up resources when extension is suspended or unloaded.
 */
if (browserAPI.runtime.onSuspend) {
  browserAPI.runtime.onSuspend.addListener(async () => {
    console.log('[Tab Manager] Extension suspending, cleaning up...');
    // Runtime cleanup is handled automatically by dispose callbacks
  });
}

