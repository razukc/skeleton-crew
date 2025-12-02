/**
 * Theme Plugin
 * 
 * Manages light/dark theme state with localStorage persistence.
 * Provides theme toggle and set actions, emits theme change events.
 * 
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 11.4
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

/**
 * Theme type
 */
export type Theme = 'light' | 'dark';

/**
 * Theme plugin interface
 */
export interface ThemePlugin {
  /**
   * Get the current theme
   * @returns Current theme ('light' or 'dark')
   */
  getCurrentTheme(): Theme;

  /**
   * Set the theme
   * @param theme - Theme to set ('light' or 'dark')
   */
  setTheme(theme: Theme): void;

  /**
   * Toggle between light and dark themes
   * @returns New theme after toggle
   */
  toggleTheme(): Theme;
}

/**
 * Extended RuntimeContext with theme plugin
 */
export interface RuntimeContextWithTheme extends RuntimeContext {
  theme: ThemePlugin;
}

/**
 * LocalStorage key for theme persistence
 */
const THEME_STORAGE_KEY = 'docs-theme';

/**
 * Detect system theme preference
 * 
 * @returns System theme preference or 'light' as fallback
 * @see Requirements 6.5
 */
function detectSystemTheme(): Theme {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }

  // Check system preference for dark mode
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Load theme from localStorage or system preference
 * 
 * @returns Stored theme, system preference, or 'light' as fallback
 * @see Requirements 6.3, 6.5
 */
function loadTheme(): Theme {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'light';
  }

  try {
    // Try to load from localStorage
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    // Fall back to system preference
    return detectSystemTheme();
  } catch (error) {
    console.warn('[theme] Failed to load theme from localStorage:', error);
    return detectSystemTheme();
  }
}

/**
 * Save theme to localStorage
 * 
 * @param theme - Theme to save
 * @see Requirements 6.2, 6.3
 */
function saveTheme(theme: Theme): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('[theme] Failed to save theme to localStorage:', error);
  }
}

/**
 * Apply theme to document
 * 
 * @param theme - Theme to apply
 */
function applyTheme(theme: Theme): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !document.documentElement) {
    return;
  }

  // Set data attribute on document root for CSS theming
  document.documentElement.setAttribute('data-theme', theme);
  
  // Also set a class for compatibility
  document.documentElement.classList.remove('theme-light', 'theme-dark');
  document.documentElement.classList.add(`theme-${theme}`);
}

/**
 * Create the theme plugin
 * 
 * This plugin manages theme state, provides toggle/set actions,
 * persists theme to localStorage, and emits theme change events.
 * 
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 11.4
 */
export function createThemePlugin(): PluginDefinition {
  // Initialize theme from localStorage or system preference
  // @see Requirements 6.3, 6.5
  let currentTheme: Theme = loadTheme();
  
  // Store unregister functions for cleanup
  const unregisterFunctions: Array<() => void> = [];

  // Theme plugin implementation
  const themePlugin: ThemePlugin = {
    getCurrentTheme(): Theme {
      return currentTheme;
    },

    setTheme(theme: Theme): void {
      if (theme !== 'light' && theme !== 'dark') {
        console.warn(`[theme] Invalid theme: ${theme}, must be 'light' or 'dark'`);
        return;
      }

      currentTheme = theme;
      
      // Apply theme to document
      applyTheme(theme);
      
      // Persist to localStorage
      // @see Requirements 6.2, 6.3
      saveTheme(theme);
    },

    toggleTheme(): Theme {
      const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
      this.setTheme(newTheme);
      return newTheme;
    }
  };

  return {
    name: 'theme',
    version: '1.0.0',
    setup(context: RuntimeContext): void {
      // Extend the runtime context with theme plugin
      (context as RuntimeContextWithTheme).theme = themePlugin;

      // Apply initial theme
      applyTheme(currentTheme);
      console.log(`[theme] Initialized with theme: ${currentTheme}`);

      // Register theme:toggle action
      // @see Requirements 6.1
      const unregisterToggle = context.actions.registerAction({
        id: 'theme:toggle',
        timeout: 5000,
        handler: async () => {
          const newTheme = themePlugin.toggleTheme();
          
          // Emit theme:changed event
          // @see Requirements 6.4, 11.4
          context.events.emit('theme:changed', { theme: newTheme });
          
          console.log(`[theme] Toggled to ${newTheme}`);
          
          return { theme: newTheme };
        }
      });
      unregisterFunctions.push(unregisterToggle);

      // Register theme:set action
      // @see Requirements 6.1
      const unregisterSet = context.actions.registerAction({
        id: 'theme:set',
        timeout: 5000,
        handler: async (params: { theme: Theme }) => {
          if (!params || !params.theme) {
            throw new Error('theme:set action requires a theme parameter');
          }

          const { theme } = params;
          
          if (theme !== 'light' && theme !== 'dark') {
            throw new Error(`Invalid theme: ${theme}, must be 'light' or 'dark'`);
          }

          themePlugin.setTheme(theme);
          
          // Emit theme:changed event
          // @see Requirements 6.4, 11.4
          context.events.emit('theme:changed', { theme });
          
          console.log(`[theme] Set to ${theme}`);
          
          return { theme };
        }
      });
      unregisterFunctions.push(unregisterSet);

      console.log('[theme] Actions registered: theme:toggle, theme:set');
    },
    dispose(): void {
      // Unregister all actions
      unregisterFunctions.forEach(fn => fn());
      unregisterFunctions.length = 0;
      
      console.log('[theme] Plugin disposed');
    }
  };
}
