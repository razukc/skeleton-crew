import { PluginDefinition, RuntimeContext } from '../../src/types.js';

/**
 * Settings Plugin
 * 
 * This plugin demonstrates configuration management in Skeleton Crew:
 * - Managing application settings (theme in this case)
 * - Providing actions to modify settings
 * - Emitting events when settings change
 * - Exposing settings state for UI rendering
 * 
 * @see Requirements 2.3, 5.1, 5.2, 5.3, 5.5
 */

// Plugin State
// Settings are stored as simple variables within the plugin
let theme: 'light' | 'dark' = 'light';

/**
 * Settings plugin definition
 * Provides theme toggle functionality and settings screen
 */
export const settingsPlugin: PluginDefinition = {
  name: 'settings',
  version: '1.0.0',
  
  /**
   * Setup function registers the settings screen and toggle action
   */
  setup(context: RuntimeContext): void {
    // Register settings screen
    // This screen will display all current settings
    // @see Requirements 2.3, 5.1
    context.screens.registerScreen({
      id: 'settings',
      title: 'Settings',
      component: 'SettingsScreen'
    });

    // Register toggle-theme action
    // This action switches between light and dark themes
    // @see Requirements 5.2, 5.3
    context.actions.registerAction({
      id: 'toggle-theme',
      handler: () => {
        // Toggle between light and dark
        theme = theme === 'light' ? 'dark' : 'light';
        
        // Emit settings:changed event
        // Other plugins can subscribe to this event to react to theme changes
        context.events.emit('settings:changed', { 
          setting: 'theme', 
          value: theme 
        });
        
        return theme;
      }
    });
  },

  /**
   * Dispose function resets settings to defaults
   */
  dispose(): void {
    // Reset settings state on disposal
    theme = 'light';
  }
};

/**
 * Get current theme value (for testing and UI rendering)
 * @see Requirements 5.1, 5.5
 */
export function getTheme(): 'light' | 'dark' {
  return theme;
}

/**
 * Set theme value (for testing purposes)
 */
export function setTheme(value: 'light' | 'dark'): void {
  theme = value;
}

/**
 * Get all settings (for testing and UI rendering)
 * @see Requirements 5.5
 */
export function getAllSettings(): Record<string, unknown> {
  return {
    theme
  };
}
