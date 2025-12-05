import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Runtime } from '../../src/runtime.js';
import { counterPlugin, setCounterValue } from '../../examples/playground/plugins/counter.js';

/**
 * Property 6: Counter change events
 * 
 * Feature: example-app, Property 6: Counter change events
 * 
 * For any counter state change (increment, decrement, or reset), the counter
 * plugin should emit a counter:changed event with the new value
 * 
 * Validates: Requirements 4.4
 */
describe('Property 6: Counter change events', () => {
  it('should emit counter:changed event with correct value for increment', async () => {
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
          
          // Track emitted events
          let eventEmitted = false;
          let eventValue: number | undefined;
          
          // Subscribe to counter:changed event
          context.events.on('counter:changed', (data: any) => {
            eventEmitted = true;
            eventValue = data.value;
          });
          
          // Execute increment action
          await context.actions.runAction('increment');
          
          // Verify event was emitted with correct value
          expect(eventEmitted).toBe(true);
          expect(eventValue).toBe(startValue + 1);
          
          // Cleanup
          await runtime.shutdown();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should emit counter:changed event with correct value for decrement', async () => {
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
          
          // Track emitted events
          let eventEmitted = false;
          let eventValue: number | undefined;
          
          // Subscribe to counter:changed event
          context.events.on('counter:changed', (data: any) => {
            eventEmitted = true;
            eventValue = data.value;
          });
          
          // Execute decrement action
          await context.actions.runAction('decrement');
          
          // Verify event was emitted with correct value
          expect(eventEmitted).toBe(true);
          expect(eventValue).toBe(startValue - 1);
          
          // Cleanup
          await runtime.shutdown();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should emit counter:changed event with correct value for reset', async () => {
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
          
          // Set counter to the random starting value (non-zero)
          setCounterValue(startValue);
          
          // Track emitted events
          let eventEmitted = false;
          let eventValue: number | undefined;
          
          // Subscribe to counter:changed event
          context.events.on('counter:changed', (data: any) => {
            eventEmitted = true;
            eventValue = data.value;
          });
          
          // Execute reset action
          await context.actions.runAction('reset');
          
          // Verify event was emitted with value 0
          expect(eventEmitted).toBe(true);
          expect(eventValue).toBe(0);
          
          // Cleanup
          await runtime.shutdown();
        }
      ),
      { numRuns: 100 }
    );
  });
});
