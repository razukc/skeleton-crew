/**
 * Core type definitions for Tab Manager Extension
 * 
 * This file contains all TypeScript interfaces and types used throughout
 * the extension for type safety and documentation.
 */

/**
 * Tab Interface
 * 
 * Represents a browser tab with all its properties.
 * Used throughout the extension for tab management operations.
 * 
 * @property id - Unique tab identifier
 * @property title - Tab title (page title)
 * @property url - Tab URL
 * @property favIconUrl - Optional favicon URL
 * @property active - Whether this tab is currently active
 * @property windowId - ID of the window containing this tab
 * @property groupId - Optional ID of the tab group this tab belongs to
 * @property lastAccessed - Optional timestamp of last access (for duplicate detection)
 */
export interface Tab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active: boolean;
  windowId: number;
  groupId?: number;
  lastAccessed?: number;
}

/**
 * TabGroup Interface
 * 
 * Represents a tab group with its properties.
 * Only available in browsers that support the Tab Groups API (Chrome/Edge).
 * 
 * @property id - Unique group identifier
 * @property title - Optional group title
 * @property color - Group color (grey, blue, red, yellow, green, pink, purple, cyan, orange)
 * @property collapsed - Whether the group is collapsed
 */
export interface TabGroup {
  id: number;
  title?: string;
  color: string;
  collapsed: boolean;
}

/**
 * SavedSession Interface
 * 
 * Represents a saved tab session that can be restored later.
 * Contains snapshots of all tabs and groups at the time of saving.
 * 
 * @property id - Unique session identifier
 * @property name - User-provided session name
 * @property createdAt - Timestamp when session was created
 * @property tabs - Array of tab snapshots
 * @property groups - Array of group snapshots
 */
export interface SavedSession {
  id: string;
  name: string;
  createdAt: number;
  tabs: TabSnapshot[];
  groups: GroupSnapshot[];
}

/**
 * TabSnapshot Interface
 * 
 * Lightweight representation of a tab for session storage.
 * Contains only the essential information needed to restore a tab.
 * 
 * @property title - Tab title at time of saving
 * @property url - Tab URL to restore
 * @property groupId - Optional group ID if tab was in a group
 */
export interface TabSnapshot {
  title: string;
  url: string;
  groupId?: number;
}

/**
 * GroupSnapshot Interface
 * 
 * Lightweight representation of a tab group for session storage.
 * Contains only the essential information needed to recreate a group.
 * 
 * @property id - Original group ID (for reference)
 * @property title - Optional group title
 * @property color - Group color
 */
export interface GroupSnapshot {
  id: number;
  title?: string;
  color: string;
}

/**
 * Message Interface
 * 
 * Represents a message passed between popup UI and background service worker.
 * Used for both action execution requests and event broadcasts.
 * 
 * @property type - Message type: 'action' for action requests, 'event' for event broadcasts
 * @property action - Action ID to execute (for action messages)
 * @property event - Event name (for event messages)
 * @property params - Parameters for action execution
 * @property data - Event data payload
 */
export interface Message {
  type: 'action' | 'event';
  action?: string;
  event?: string;
  params?: unknown;
  data?: unknown;
}
