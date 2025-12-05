import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import { settingsPlugin, getTheme, setTheme } from '../../examples/playground/plugins/settings.js';

describe('Settings Plugin', () => {
  let runtime: Runtime;

  beforeEach(async () => {
    // Reset theme to default
    setTheme('light');
    
    // Create fresh runtime instance
    runtime = new Runtime();
    runtime.registerPlugin(settingsPlugin);
    await runtime.initialize();
  });

  it('should register settings screen', () => {
    const context = runtime.getContext();
    const screen = context.screens.getScreen('settings');
    
    expect(screen).toBeDefined();
    expect(screen?.id).toBe('settings');
    expect(screen?.title).toBe('Settings');
    expect(screen?.component).toBe('SettingsScreen');
  });

  it('should register toggle-theme action', async () => {
    const context = runtime.getContext();
    
    // Verify action exists by running it
    const result = await context.actions.runAction('toggle-theme');
    expect(result).toBeDefined();
  });

  it('should toggle theme from light to dark', async () => {
    const context = runtime.getContext();
    
    expect(getTheme()).toBe('light');
    
    const result = await context.actions.runAction('toggle-theme');
    
    expect(result).toBe('dark');
    expect(getTheme()).toBe('dark');
  });

  it('should toggle theme from dark to light', async () => {
    const context = runtime.getContext();
    
    // Set to dark first
    setTheme('dark');
    expect(getTheme()).toBe('dark');
    
    const result = await context.actions.runAction('toggle-theme');
    
    expect(result).toBe('light');
    expect(getTheme()).toBe('light');
  });

  it('should emit settings:changed event when theme toggles', async () => {
    const context = runtime.getContext();
    const events: Array<{ setting: string; value: unknown }> = [];
    
    context.events.on('settings:changed', (data) => {
      events.push(data as { setting: string; value: unknown });
    });
    
    await context.actions.runAction('toggle-theme');
    
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ setting: 'theme', value: 'dark' });
  });

  it('should toggle theme twice and return to original value', async () => {
    const context = runtime.getContext();
    
    expect(getTheme()).toBe('light');
    
    await context.actions.runAction('toggle-theme');
    expect(getTheme()).toBe('dark');
    
    await context.actions.runAction('toggle-theme');
    expect(getTheme()).toBe('light');
  });
});
