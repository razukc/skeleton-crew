/**
 * Layout Component
 * 
 * Main responsive layout with sidebar, header, and content areas.
 * Handles mobile/desktop layouts with hamburger menu for mobile.
 * Integrates with Skeleton Crew Runtime for navigation and state management.
 * 
 * @see Requirements 12.1, 12.2, 12.5, 2.1
 */

import { useState, useEffect } from 'react';
import type { Runtime } from 'skeleton-crew-runtime';
import { Sidebar } from './Sidebar.js';
import { SearchBar } from './SearchBar.js';
import { ThemeToggle } from './ThemeToggle.js';
import { VersionSelector } from './VersionSelector.js';
import { MarkdownPage } from './MarkdownPage.js';

export interface LayoutProps {
  runtime: Runtime;
}

/**
 * Layout component with responsive design
 * 
 * Desktop: Persistent sidebar alongside content
 * Mobile: Hamburger menu with overlay sidebar
 * 
 * @see Requirements 12.1, 12.2, 12.5, 2.1
 */
export function Layout({ runtime }: LayoutProps): JSX.Element {
  // Get initial theme from theme plugin
  const themeContext = runtime.getContext() as any;
  const initialTheme = themeContext.theme?.getCurrentTheme() || 'light';
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentScreenId, setCurrentScreenId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);
  const [navigationItems, setNavigationItems] = useState<any[]>([]);
  const [pageContent, setPageContent] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Update navigation tree and page content
  const updateContent = (screenId?: string) => {
    const context = runtime.getContext() as any;
    
    // Get navigation tree from sidebar plugin
    if (context.sidebar) {
      const navTree = context.sidebar.getNavigationTree();
      setNavigationItems(navTree.root);
    }
    
    // Get current page content from markdown plugin
    const idToUse = screenId || currentScreenId;
    if (idToUse && context.markdown) {
      const metadata = context.markdown.getMetadata(idToUse);
      if (metadata) {
        setPageContent(metadata);
      }
    }
  };

  useEffect(() => {
    // Listen for navigation events
    const handleNavigation = (data: any) => {
      setCurrentScreenId(data.screenId);
      updateContent(data.screenId);
      closeMobileMenu();
    };

    const unsubscribeNav = runtime.getContext().events.on('router:navigated', handleNavigation);

    // Listen for theme changes
    const handleThemeChange = (data: any) => {
      setTheme(data.theme);
    };

    const unsubscribeTheme = runtime.getContext().events.on('theme:changed', handleThemeChange);

    // Listen for markdown pages loaded
    const handlePagesLoaded = () => {
      updateContent();
    };

    const unsubscribePages = runtime.getContext().events.on('markdown:all-pages-loaded', handlePagesLoaded);

    // Listen for search results
    const handleSearchResults = (data: any) => {
      if (data && data.results) {
        setSearchResults(data.results);
      }
    };

    const unsubscribeSearch = runtime.getContext().events.on('search:results', handleSearchResults);

    // Initial content update - check if we already have a current screen
    const routerContext = runtime.getContext() as any;
    const initialPath = window.location.pathname;
    if (routerContext.router) {
      const screenId = routerContext.router.getScreenForPath(initialPath);
      if (screenId) {
        setCurrentScreenId(screenId);
        updateContent(screenId);
      }
    }

    return () => {
      unsubscribeNav();
      unsubscribeTheme();
      unsubscribePages();
      unsubscribeSearch();
    };
  }, [runtime]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavigate = async (path: string) => {
    try {
      await runtime.getContext().actions.runAction('router:navigate', { path });
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  const handleSearch = async (term: string) => {
    try {
      // Clear results if search term is empty
      if (!term || term.trim().length === 0) {
        setSearchResults([]);
        return;
      }
      
      await runtime.getContext().actions.runAction('search:query', { term });
    } catch (error) {
      console.error('[Layout] Search failed:', error);
      setSearchResults([]);
    }
  };

  const handleThemeToggle = async () => {
    try {
      await runtime.getContext().actions.runAction('theme:toggle', {});
    } catch (error) {
      console.error('Theme toggle failed:', error);
    }
  };

  return (
    <div className="layout" data-theme={theme}>
      {/* Header */}
      <header className="layout-header">
        {/* Mobile hamburger menu button */}
        <button
          className="hamburger-menu"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span className="hamburger-icon">
            {isMobileMenuOpen ? '✕' : '☰'}
          </span>
        </button>
        
        <div className="header-content">
          <h1 className="site-title">Documentation</h1>
          <div className="header-actions">
            <SearchBar 
              onSearch={handleSearch} 
              results={searchResults} 
              onResultSelect={handleNavigate}
            />
            <VersionSelector runtime={runtime} />
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="layout-main">
        {/* Sidebar - Desktop: persistent, Mobile: overlay */}
        <aside
          className={`layout-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}
          onClick={closeMobileMenu}
        >
          <div className="sidebar-content" onClick={(e) => e.stopPropagation()}>
            <Sidebar 
              items={navigationItems} 
              activeId={currentScreenId || ''}
              onNavigate={handleNavigate}
            />
          </div>
        </aside>

        {/* Mobile overlay backdrop */}
        {isMobileMenuOpen && (
          <div
            className="mobile-overlay"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
        )}

        {/* Content area */}
        <main className="layout-content">
          {pageContent ? (
            <MarkdownPage 
              content={pageContent.content}
              frontmatter={pageContent.frontmatter}
              headings={pageContent.headings}
              componentRegistry={(runtime.getContext() as any).componentRegistry}
              codeBlockPlugin={(runtime.getContext() as any).codeBlock}
            />
          ) : (
            <div>Loading...</div>
          )}
        </main>
      </div>

      <style>{`
        .layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          font-family: system-ui, -apple-system, sans-serif;
          background: var(--bg-color, #ffffff);
          color: var(--text-color, #1f2937);
        }

        .layout[data-theme="dark"] {
          --bg-color: #1a1a1a;
          --text-color: #e5e7eb;
          --header-bg: #2d2d2d;
          --sidebar-bg: #252525;
          --border-color: #404040;
        }

        .layout[data-theme="light"] {
          --bg-color: #ffffff;
          --text-color: #1f2937;
          --header-bg: #ffffff;
          --sidebar-bg: #f9fafb;
          --border-color: #e5e7eb;
        }

        .layout-header {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--header-bg);
          border-bottom: 1px solid var(--border-color);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
          gap: 1rem;
        }

        .site-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .hamburger-menu {
          display: none;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          color: var(--text-color, #1f2937);
        }

        .hamburger-icon {
          display: block;
          width: 24px;
          height: 24px;
          line-height: 24px;
          text-align: center;
        }

        .layout-main {
          display: flex;
          flex: 1;
          position: relative;
        }

        .layout-sidebar {
          width: 280px;
          flex-shrink: 0; /* Prevent sidebar from shrinking */
          background: var(--sidebar-bg);
          border-right: 1px solid var(--border-color);
          overflow-y: auto;
          position: sticky;
          top: 73px;
          height: calc(100vh - 73px);
        }

        .sidebar-content {
          padding: 1rem;
        }

        .layout-content {
          flex: 1;
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          min-width: 0; /* Prevent flex item from overflowing */
          overflow-x: auto; /* Handle wide content */
        }

        .mobile-overlay {
          display: none;
        }

        /* Mobile styles */
        @media (max-width: 768px) {
          .hamburger-menu {
            display: block;
          }

          .layout-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 280px;
            height: 100vh;
            z-index: 200;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
          }

          .layout-sidebar.mobile-open {
            transform: translateX(0);
          }

          .mobile-overlay {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 150;
          }

          .layout-content {
            padding: 1rem;
          }
        }

        /* Tablet styles */
        @media (min-width: 769px) and (max-width: 1024px) {
          .layout-sidebar {
            width: 240px;
          }

          .layout-content {
            padding: 1.5rem;
          }
        }

        /* Desktop styles */
        @media (min-width: 1025px) {
          .layout-sidebar {
            width: 280px;
          }

          .layout-content {
            padding: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
