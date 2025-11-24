import { vi } from 'vitest';

// Mock tab data for testing
const mockTabs = [
  {
    id: 1,
    title: 'Tab 1',
    url: 'https://example.com',
    favIconUrl: 'https://example.com/favicon.ico',
    active: true,
    windowId: 1,
    groupId: -1,
    index: 0,
    pinned: false,
    highlighted: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true
  },
  {
    id: 2,
    title: 'Tab 2',
    url: 'https://example.org',
    favIconUrl: 'https://example.org/favicon.ico',
    active: false,
    windowId: 1,
    groupId: -1,
    index: 1,
    pinned: false,
    highlighted: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true
  }
];

// Mock Chrome APIs for testing
const mockChrome = {
  tabs: {
    query: vi.fn().mockImplementation((info, callback) => {
      if (callback) callback(mockTabs);
    }),
    update: vi.fn().mockImplementation((id, props, callback) => {
      const tab = mockTabs.find(t => t.id === id);
      if (tab && callback) {
        callback({ ...tab, ...props });
      }
    }),
    remove: vi.fn().mockImplementation((ids, callback) => {
      if (callback) callback();
    }),
    create: vi.fn().mockImplementation((props, callback) => {
      const newTab = {
        id: 3,
        title: props.url || 'New Tab',
        url: props.url || '',
        active: props.active || false,
        windowId: 1,
        groupId: -1,
        index: 2,
        pinned: false,
        highlighted: false,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true
      };
      if (callback) callback(newTab);
    }),
    get: vi.fn().mockImplementation((id, callback) => {
      const tab = mockTabs.find(t => t.id === id);
      if (tab && callback) {
        // Return tab with groupId for testing
        callback({ ...tab, groupId: 1 });
      }
    }),
    onCreated: {
      addListener: vi.fn()
    },
    onUpdated: {
      addListener: vi.fn()
    },
    onRemoved: {
      addListener: vi.fn()
    },
    // Tab Groups API methods (Chrome-specific)
    group: vi.fn().mockImplementation((options, callback) => {
      if (callback) callback(1); // Return mock group ID
    }),
    ungroup: vi.fn().mockImplementation((tabIds, callback) => {
      if (callback) callback();
    })
  },
  tabGroups: {
    group: vi.fn().mockImplementation((options, callback) => {
      if (callback) callback(1); // Return mock group ID
    }),
    update: vi.fn().mockImplementation((groupId, props, callback) => {
      const group = {
        id: groupId,
        title: props.title || 'Test Group',
        color: props.color || 'blue',
        collapsed: props.collapsed !== undefined ? props.collapsed : false
      };
      if (callback) callback(group);
    }),
    ungroup: vi.fn().mockImplementation((tabIds, callback) => {
      if (callback) callback();
    }),
    query: vi.fn().mockImplementation((info, callback) => {
      if (callback) callback([
        {
          id: 1,
          title: 'Test Group',
          color: 'blue',
          collapsed: false
        }
      ]);
    })
  },
  storage: {
    local: {
      get: vi.fn().mockImplementation((keys, callback) => {
        if (callback) callback({});
      }),
      set: vi.fn().mockImplementation((items, callback) => {
        if (callback) callback();
      }),
      remove: vi.fn().mockImplementation((keys, callback) => {
        if (callback) callback();
      }),
      clear: vi.fn().mockImplementation((callback) => {
        if (callback) callback();
      })
    }
  },
  runtime: {
    onMessage: {
      addListener: vi.fn()
    },
    sendMessage: vi.fn()
  }
};

// Set up global chrome object
global.chrome = mockChrome as any;
