/**
 * Browser API Adapter
 * 
 * Provides cross-browser compatibility by:
 * 1. Detecting the correct browser API (chrome vs browser)
 * 2. Promisifying callback-based APIs
 * 3. Providing feature detection utilities
 * 
 * Requirements: Cross-browser compatibility
 */

// Type guard for browser API
declare const browser: typeof chrome | undefined;

// Detect browser API namespace
export const browserAPI = (() => {
  // Firefox uses 'browser', Chrome uses 'chrome'
  if (typeof chrome !== 'undefined') {
    return chrome;
  }
  if (typeof browser !== 'undefined') {
    return browser;
  }
  throw new Error('Browser API not available');
})();

/**
 * Promisified Storage API
 * Wraps chrome.storage.local with Promise-based interface
 */
export const storage = {
  /**
   * Get items from storage
   * @param keys - Key(s) to retrieve
   * @returns Promise resolving to stored items
   */
  get: (keys: string | string[] | null): Promise<Record<string, any>> => {
    return new Promise((resolve) => {
      browserAPI.storage.local.get(keys, resolve);
    });
  },

  /**
   * Set items in storage
   * @param items - Items to store
   * @returns Promise resolving when complete
   */
  set: (items: Record<string, any>): Promise<void> => {
    return new Promise((resolve) => {
      browserAPI.storage.local.set(items, resolve);
    });
  },

  /**
   * Remove items from storage
   * @param keys - Key(s) to remove
   * @returns Promise resolving when complete
   */
  remove: (keys: string | string[]): Promise<void> => {
    return new Promise((resolve) => {
      browserAPI.storage.local.remove(keys, resolve);
    });
  },

  /**
   * Clear all items from storage
   * @returns Promise resolving when complete
   */
  clear: (): Promise<void> => {
    return new Promise((resolve) => {
      browserAPI.storage.local.clear(resolve);
    });
  }
};

/**
 * Promisified Tabs API
 * Wraps chrome.tabs with Promise-based interface
 */
export const tabs = {
  /**
   * Query tabs matching criteria
   * @param queryInfo - Query criteria
   * @returns Promise resolving to matching tabs
   */
  query: (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
    return new Promise((resolve) => {
      browserAPI.tabs.query(queryInfo, resolve);
    });
  },

  /**
   * Update tab properties
   * @param tabId - Tab ID to update
   * @param updateProperties - Properties to update
   * @returns Promise resolving to updated tab
   */
  update: (
    tabId: number,
    updateProperties: chrome.tabs.UpdateProperties
  ): Promise<chrome.tabs.Tab> => {
    return new Promise((resolve, reject) => {
      browserAPI.tabs.update(tabId, updateProperties, (tab?: chrome.tabs.Tab) => {
        if (tab) {
          resolve(tab);
        } else {
          reject(new Error(`Failed to update tab ${tabId}`));
        }
      });
    });
  },

  /**
   * Remove (close) tabs
   * @param tabIds - Tab ID(s) to remove
   * @returns Promise resolving when complete
   */
  remove: (tabIds: number | number[]): Promise<void> => {
    return new Promise((resolve) => {
      if (Array.isArray(tabIds)) {
        browserAPI.tabs.remove(tabIds, resolve);
      } else {
        browserAPI.tabs.remove(tabIds, resolve);
      }
    });
  },

  /**
   * Create a new tab
   * @param createProperties - Properties for new tab
   * @returns Promise resolving to created tab
   */
  create: (
    createProperties: chrome.tabs.CreateProperties
  ): Promise<chrome.tabs.Tab> => {
    return new Promise((resolve) => {
      browserAPI.tabs.create(createProperties, resolve);
    });
  },

  /**
   * Get a specific tab by ID
   * @param tabId - Tab ID to retrieve
   * @returns Promise resolving to tab
   */
  get: (tabId: number): Promise<chrome.tabs.Tab> => {
    return new Promise((resolve, reject) => {
      browserAPI.tabs.get(tabId, (tab?: chrome.tabs.Tab) => {
        if (tab) {
          resolve(tab);
        } else {
          reject(new Error(`Tab ${tabId} not found`));
        }
      });
    });
  }
};

/**
 * Promisified Tab Groups API
 * Wraps chrome.tabGroups with Promise-based interface
 * Note: Only available in Chrome/Edge, not Firefox
 */
export const tabGroups = {
  /**
   * Query tab groups matching criteria
   * @param queryInfo - Query criteria
   * @returns Promise resolving to matching groups
   */
  query: (queryInfo: chrome.tabGroups.QueryInfo): Promise<chrome.tabGroups.TabGroup[]> => {
    return new Promise((resolve) => {
      if (typeof browserAPI.tabGroups === 'undefined') {
        resolve([]);
        return;
      }
      browserAPI.tabGroups.query(queryInfo, resolve);
    });
  },

  /**
   * Group tabs together
   * @param options - Grouping options (tabIds array)
   * @returns Promise resolving to group ID
   */
  group: (options: { tabIds: number[] }): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (typeof browserAPI.tabGroups === 'undefined') {
        reject(new Error('Tab Groups API not available'));
        return;
      }
      // Use tabs.group which returns the group ID
      (browserAPI.tabs as any).group(options, resolve);
    });
  },

  /**
   * Update group properties
   * @param groupId - Group ID to update
   * @param updateProperties - Properties to update
   * @returns Promise resolving to updated group
   */
  update: (
    groupId: number,
    updateProperties: chrome.tabGroups.UpdateProperties
  ): Promise<chrome.tabGroups.TabGroup> => {
    return new Promise((resolve, reject) => {
      if (typeof browserAPI.tabGroups === 'undefined') {
        reject(new Error('Tab Groups API not available'));
        return;
      }
      browserAPI.tabGroups.update(groupId, updateProperties, resolve);
    });
  },

  /**
   * Ungroup tabs (remove from group)
   * @param tabIds - Tab ID(s) to ungroup
   * @returns Promise resolving when complete
   */
  ungroup: (tabIds: number | number[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof browserAPI.tabGroups === 'undefined') {
        reject(new Error('Tab Groups API not available'));
        return;
      }
      // Use tabs.ungroup which removes tabs from their group
      (browserAPI.tabs as any).ungroup(tabIds, resolve);
    });
  }
};

/**
 * Feature Detection Utilities
 * Detect browser capabilities for graceful degradation
 */

/**
 * Check if Tab Groups API is available
 * @returns true if tab groups are supported
 */
export const hasTabGroups = (): boolean => {
  return typeof browserAPI.tabGroups !== 'undefined';
};

/**
 * Check if Sessions API is available
 * @returns true if sessions are supported
 */
export const hasSessions = (): boolean => {
  return typeof browserAPI.sessions !== 'undefined';
};

/**
 * Check if Alarms API is available
 * @returns true if alarms are supported
 */
export const hasAlarms = (): boolean => {
  return typeof browserAPI.alarms !== 'undefined';
};

/**
 * Feature flags object
 * Contains boolean flags for all optional browser features
 */
export const features = {
  /**
   * Tab Groups API support (Chrome/Edge only)
   */
  tabGroups: hasTabGroups(),

  /**
   * Sessions API support
   */
  sessions: hasSessions(),

  /**
   * Alarms API support
   */
  alarms: hasAlarms(),

  /**
   * Browser type detection
   */
  isChrome: typeof chrome !== 'undefined' && typeof browser === 'undefined',
  isFirefox: typeof browser !== 'undefined',
  isEdge: typeof chrome !== 'undefined' && navigator.userAgent.includes('Edg')
};
