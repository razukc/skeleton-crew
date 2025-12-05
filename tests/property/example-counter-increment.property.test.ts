import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Runtime } from '../../src/runtime.js';
import { counterPlugin, getCounterValue, setCounterValue } from '../../examples/playground/plugins/counter.js';

/**
 * Property 4: Counter increment behavior
 * 
 * Feature: example-app, Property 4: Counter increment behavior
 * 
 * For any counter value, executing the increment action should increase
 * the counter by exactly 1
 * 
 * Validates: Requirements 4.2
 */
describe('Property 4: Counter increment behavior', () => {
  it('should increase counter by exactly 1 for any starting value', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random counter values from -1000 to 1000
        fc.integer({ min: -1000, max: 1000 }),
        async (startValue) => {
          // Create fresh runtime instance
          const runtime = new Runtime();
          runtime.registerPlugin(counterPlugin);
          await runtime.initialize();
          
          const context = runtime.getContext();
          
          // Set counter to the random starting value
          setCounterValue(startValue);
          
          // Verify starting value
          const valueBefore = getCounterValue();
          expect(valueBefore).toBe(startValue);
          
          // Execute increment action
          const result = await context.actions.runAction('increment');
          
          // Verify counter increased by exactly 1
          const valueAfter = getCounterValue();
          expect(valueAfter).toBe(startValue + 1);
          expect(result).toBe(startValue + 1);
          
          // Cleanup
          await runtime.shutdown();
        }
      ),
      { numRuns: 100 }
    );
  });
});
