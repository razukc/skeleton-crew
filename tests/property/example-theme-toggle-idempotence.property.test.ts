import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Runtime } from '../../src/runtime.js';
import { settingsPlugin, getTheme, setTheme } from '../../examples/playground/plugins/settings.js';

/**
 * Property 7: Theme toggle idempotence
 * 
 * Feature: example-app, Property 7: Theme toggle idempotence
 * 
 * For any theme value, toggling the theme twice should return to the
 * original theme value
 * 
 * Validates: Requirements 5.2
 */
describe('Property 7: Theme toggle idempotence', () => {
  it('should return to original theme after toggling twice', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random theme values ('light' or 'dark')
        fc.constantFrom('light' as const, 'dark' as const),
        async (startTheme) => {
          // Create fresh runtime instance
          const runtime = new Runtime();
          runtime.registerPlugin(settingsPlugin);
          await runtime.initialize();
          
          const context = runtime.getContext();
          
          // Set theme to the random starting value
          setTheme(startTheme);
          
          // Verify starting value
          const themeBefore = getTheme();
          expect(themeBefore).toBe(startTheme);
          
          // Execute toggle-theme action twice
          await context.actions.runAction('toggle-theme');
          await context.actions.runAction('toggle-theme');
          
          // Verify theme returned to original value
          const themeAfter = getTheme();
          expect(themeAfter).toBe(startTheme);
          
          // Cleanup
          await runtime.shutdown();
        }
      ),
      { numRuns: 100 }
    );
  });
});
