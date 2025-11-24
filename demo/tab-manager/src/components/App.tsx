import { useState, useEffect } from 'react';
import { Tab, TabGroup, SavedSession } from '../types/index.js';
import { TabList } from './TabList.js';
import { SearchBar } from './SearchBar.js';
import { SessionManager } from './SessionManager.js';
import { ActionBar } from './ActionBar.js';
import { executeAction, subscribeToEvents } from '../popup/message-bridge.js';

export function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [groups] = useState<TabGroup[]>([]);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTabGroups, setHasTabGroups] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Check if tab groups are supported
        const hasGroups = typeof chrome.tabGroups !== 'undefined';
        setHasTabGroups(hasGroups);

        // Load tabs
        const tabsResult = await executeAction('tabs:query');
        setTabs(tabsResult || []);

        // Load sessions
        const sessionsResult = await executeAction('sessions:list');
        setSessions(sessionsResult || []);

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Failed to load initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Listen to events from background script
  useEffect(() => {
    const unsubscribe = subscribeToEvents((event, data) => {
      handleEvent(event, data);
    });

    return unsubscribe;
  }, []);

  // Handle events from background
  const handleEvent = (event: string, data: unknown) => {
    switch (event) {
      case 'tab:created':
      case 'tab:updated':
      case 'tab:removed':
      case 'tab:activated':
        // Refresh tab list
        refreshTabs();
        break;
      
      case 'session:saved':
      case 'session:deleted':
        // Refresh session list
        refreshSessions();
        break;

      case 'search:updated':
        // Update filtered tabs
        if (data && typeof data === 'object' && 'tabs' in data) {
          setTabs((data as any).tabs);
        }
        break;

      case 'search:cleared':
        // Refresh full tab list
        refreshTabs();
        break;

      case 'storage:error':
        setError('Storage error occurred');
        break;
    }
  };

  // Refresh tabs from background
  const refreshTabs = async () => {
    try {
      const result = await executeAction('tabs:query');
      setTabs(result || []);
    } catch (err) {
      console.error('Failed to refresh tabs:', err);
    }
  };

  // Refresh sessions from background
  const refreshSessions = async () => {
    try {
      const result = await executeAction('sessions:list');
      setSessions(result || []);
    } catch (err) {
      console.error('Failed to refresh sessions:', err);
    }
  };

  // Handle tab click (activate)
  const handleTabClick = async (tabId: number) => {
    try {
      await executeAction('tabs:activate', { tabId });
      // Close popup after activating tab
      window.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate tab');
    }
  };

  // Handle tab close
  const handleTabClose = async (tabId: number) => {
    try {
      await executeAction('tabs:close', { tabId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close tab');
    }
  };

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim()) {
      try {
        const result = await executeAction('search:filter', { query });
        setTabs(result || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      }
    } else {
      handleSearchClear();
    }
  };

  // Handle search clear
  const handleSearchClear = async () => {
    setSearchQuery('');
    try {
      await executeAction('search:clear');
      await refreshTabs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear search');
    }
  };

  // Handle create group
  const handleCreateGroup = async () => {
    // For now, create a group with all tabs (in a real implementation, you'd select tabs)
    try {
      setIsLoading(true);
      const tabIds = tabs.map(t => t.id);
      await executeAction('groups:create', { tabIds, title: 'New Group', color: 'blue' });
      await refreshTabs();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle find duplicates
  const handleFindDuplicates = async () => {
    try {
      setIsLoading(true);
      const result = await executeAction('tabs:findDuplicates');
      
      if (result && result.duplicates && result.duplicates.length > 0) {
        const count = result.duplicates.reduce((sum: number, group: any) => sum + group.count, 0);
        const shouldClose = window.confirm(
          `Found ${count} duplicate tabs. Close duplicates and keep the most recent?`
        );
        
        if (shouldClose) {
          await executeAction('tabs:closeDuplicates');
          await refreshTabs();
        }
      } else {
        alert('No duplicate tabs found!');
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find duplicates');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save session
  const handleSaveSession = async (name: string) => {
    try {
      setIsLoading(true);
      await executeAction('sessions:save', { name });
      await refreshSessions();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle restore session
  const handleRestoreSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      await executeAction('sessions:restore', { sessionId });
      setError(null);
      // Optionally close popup after restoring
      // window.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore session');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete session
  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session && window.confirm(`Delete session "${session.name}"?`)) {
      try {
        setIsLoading(true);
        await executeAction('sessions:delete', { sessionId });
        await refreshSessions();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete session');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tab Manager</h1>
      </header>

      {error && (
        <div className="app-error">
          <span className="app-error-icon">⚠️</span>
          <span className="app-error-message">{error}</span>
          <button
            className="app-error-close"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="app-content">
        <section className="app-section">
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            onClear={handleSearchClear}
          />
        </section>

        <section className="app-section">
          <ActionBar
            onCreateGroup={hasTabGroups ? handleCreateGroup : undefined}
            onFindDuplicates={handleFindDuplicates}
            onSaveSession={() => {}} // Handled by SessionManager
            hasTabGroups={hasTabGroups}
            isLoading={isLoading}
          />
        </section>

        <section className="app-section app-section-tabs">
          <h2 className="app-section-title">
            Tabs ({tabs.length})
          </h2>
          <TabList
            tabs={tabs}
            groups={groups}
            onTabClick={handleTabClick}
            onTabClose={handleTabClose}
          />
        </section>

        <section className="app-section app-section-sessions">
          <SessionManager
            sessions={sessions}
            onSave={handleSaveSession}
            onRestore={handleRestoreSession}
            onDelete={handleDeleteSession}
          />
        </section>
      </div>
    </div>
  );
}
