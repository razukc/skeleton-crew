import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew';
import { collidingRegistrationOutcome, throwingHotspotContained } from '../harness/faults.js';

describe('fault injection — SCR containment contract', () => {
  it('a colliding action registration is rejected loudly by SCR', async () => {
    const outcome = await collidingRegistrationOutcome();
    expect(outcome.rejected).toBe(true);
    expect(outcome.errorName).toBe('DuplicateRegistrationError');
  });

  it('a throwing hotspot write is contained to the caller, not the runtime', async () => {
    const contained = await throwingHotspotContained();
    expect(contained.callerThrew).toBe(true);     // the bad call failed
    expect(contained.runtimeAlive).toBe(true);     // other actions still work
  });
});
