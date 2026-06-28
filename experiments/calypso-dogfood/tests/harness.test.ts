import { describe, it, expect } from 'vitest';
import { bootDogfood } from '../harness/run.js';

describe('offline harness driver', () => {
  it('dispatches uptime and randomcolor through one runtime', async () => {
    const driver = await bootDogfood();
    const up: any = await driver.dispatch('uptime', { invokerId: 'u1', guildId: 'g1' });
    expect(up.text).toMatch(/day|d /);
    const rc: any = await driver.dispatch('randomcolor', { invokerId: 'u1', guildId: 'g1' });
    expect(typeof rc.text).toBe('string');
  });
});
