/**
 * ThemeToggle Component
 * 
 * Toggle button for switching between light and dark themes.
 * Displays current theme and triggers theme actions.
 * 
 * @see Requirements 6.1
 */

export type Theme = 'light' | 'dark';

export interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

/**
 * ThemeToggle component
 * 
 * Provides a button to toggle between light and dark themes.
 * 
 * @see Requirements 6.1
 */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps): JSX.Element {
  const isDark = theme === 'dark';
  const icon = isDark ? '☀️' : '🌙';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      <span className="theme-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="theme-label">
        {theme === 'dark' ? 'Dark' : 'Light'}
      </span>

      <style>{`
        .theme-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: var(--button-bg, #f3f4f6);
          border: 1px solid var(--border-color, #d1d5db);
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-color, #1f2937);
          transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }

        .theme-toggle:hover {
          background: var(--button-hover-bg, #e5e7eb);
          border-color: var(--border-hover-color, #9ca3af);
        }

        .theme-toggle:focus {
          outline: 2px solid var(--focus-color, #3b82f6);
          outline-offset: 2px;
        }

        .theme-toggle:focus:not(:focus-visible) {
          outline: none;
        }

        .theme-toggle:active {
          transform: scale(0.98);
        }

        .theme-icon {
          font-size: 1.125rem;
          line-height: 1;
        }

        .theme-label {
          font-weight: 500;
        }

        /* Dark theme styles */
        [data-theme="dark"] .theme-toggle {
          background: var(--button-bg, #3d3d3d);
          border-color: var(--border-color, #525252);
          color: var(--text-color, #e5e7eb);
        }

        [data-theme="dark"] .theme-toggle:hover {
          background: var(--button-hover-bg, #4d4d4d);
          border-color: var(--border-hover-color, #6b7280);
        }

        [data-theme="dark"] .theme-toggle:focus {
          outline-color: var(--focus-color, #60a5fa);
        }

        /* Hide label on very small screens */
        @media (max-width: 480px) {
          .theme-label {
            display: none;
          }
        }
      `}</style>
    </button>
  );
}
