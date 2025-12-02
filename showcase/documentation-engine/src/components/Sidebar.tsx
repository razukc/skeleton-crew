/**
 * Sidebar Component
 * 
 * Renders navigation tree with hierarchical structure.
 * Highlights active page and handles click navigation.
 * 
 * @see Requirements 3.3
 */

export interface NavigationItem {
  id: string;
  title: string;
  path: string;
  order: number;
  children: NavigationItem[];
}

export interface SidebarProps {
  items: NavigationItem[];
  activeId: string;
  onNavigate: (path: string) => void;
}

/**
 * Sidebar component for navigation
 * 
 * Renders a hierarchical navigation tree with active page highlighting.
 * 
 * @see Requirements 3.3
 */
export function Sidebar({ items, activeId, onNavigate }: SidebarProps): JSX.Element {
  const renderNavigationItem = (item: NavigationItem, level: number = 0): JSX.Element => {
    const isActive = item.id === activeId;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="nav-item-container">
        <button
          className={`nav-item ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: `${level * 1 + 0.75}rem` }}
          onClick={() => onNavigate(item.path)}
          aria-current={isActive ? 'page' : undefined}
        >
          <span className="nav-item-title">{item.title}</span>
        </button>
        
        {hasChildren && (
          <div className="nav-children">
            {item.children.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="sidebar-nav" aria-label="Documentation navigation">
      {items.length === 0 ? (
        <div className="nav-empty">No pages available</div>
      ) : (
        items.map(item => renderNavigationItem(item))
      )}

      <style>{`
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-item-container {
          display: flex;
          flex-direction: column;
        }

        .nav-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: none;
          border: none;
          border-radius: 0.375rem;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
          color: var(--text-color, #374151);
          font-size: 0.875rem;
          line-height: 1.25rem;
        }

        .nav-item:hover {
          background: var(--nav-hover-bg, #e5e7eb);
        }

        .nav-item.active {
          background: var(--nav-active-bg, #dbeafe);
          color: var(--nav-active-color, #1e40af);
          font-weight: 600;
        }

        .nav-item-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nav-children {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-empty {
          padding: 1rem;
          text-align: center;
          color: var(--text-muted, #6b7280);
          font-size: 0.875rem;
        }

        /* Focus styles for accessibility */
        .nav-item:focus {
          outline: 2px solid var(--focus-color, #3b82f6);
          outline-offset: 2px;
        }

        .nav-item:focus:not(:focus-visible) {
          outline: none;
        }

        /* Dark theme styles */
        [data-theme="dark"] .nav-item {
          color: var(--text-color, #d1d5db);
        }

        [data-theme="dark"] .nav-item:hover {
          background: var(--nav-hover-bg, #3d3d3d);
        }

        [data-theme="dark"] .nav-item.active {
          background: var(--nav-active-bg, #1e3a5f);
          color: var(--nav-active-color, #93c5fd);
        }

        [data-theme="dark"] .nav-item:focus {
          outline-color: var(--focus-color, #60a5fa);
        }

        [data-theme="dark"] .nav-empty {
          color: var(--text-muted, #9ca3af);
        }
      `}</style>
    </nav>
  );
}
