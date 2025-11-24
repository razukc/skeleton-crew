/**
 * Message Bridge
 * 
 * Provides utilities for communication between popup UI and background service worker.
 * Handles action execution requests and event subscriptions.
 * 
 * This module abstracts the chrome.runtime.sendMessage API and provides
 * a cleaner, Promise-based interface for the UI components.
 */

import { Message } from '../types/index.js';

/**
 * Execute an action in the background script
 * 
 * @param action - The action ID to execute
 * @param params - Optional parameters for the action
 * @returns Promise resolving to the action result
 * @throws Error if the action fails or communication fails
 */
export async function executeAction<T = any>(
  action: string,
  params?: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    const message: Message = {
      type: 'action',
      action,
      params
    };

    chrome.runtime.sendMessage(message, (response) => {
      // Check for Chrome runtime errors
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      // Check for action execution errors
      if (response?.success === false) {
        reject(new Error(response.error || 'Action failed'));
        return;
      }

      // Return the result
      resolve(response?.result);
    });
  });
}

/**
 * Type for event handler functions
 */
export type EventHandler = (event: string, data: unknown) => void;

/**
 * Subscribe to events from the background script
 * 
 * @param handler - Function to call when events are received
 * @returns Cleanup function to remove the listener
 */
export function subscribeToEvents(handler: EventHandler): () => void {
  const listener = (message: Message) => {
    if (message.type === 'event' && message.event) {
      handler(message.event, message.data);
    }
  };

  chrome.runtime.onMessage.addListener(listener);

  // Return cleanup function
  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}

/**
 * Send a message to the background script without expecting a response
 * 
 * @param message - The message to send
 */
export function sendMessage(message: Message): void {
  chrome.runtime.sendMessage(message);
}

/**
 * Check if the background script is available
 * 
 * @returns Promise resolving to true if background is available
 */
export async function isBackgroundAvailable(): Promise<boolean> {
  try {
    await executeAction('ping');
    return true;
  } catch {
    return false;
  }
}
