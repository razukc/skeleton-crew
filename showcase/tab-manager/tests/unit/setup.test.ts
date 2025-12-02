import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should have chrome API mocked', () => {
    const chromeGlobal = (global as any).chrome;
    expect(chromeGlobal).toBeDefined();
    expect(chromeGlobal.tabs).toBeDefined();
    expect(chromeGlobal.storage).toBeDefined();
  });

  it('should have fast-check available', async () => {
    const fc = await import('fast-check');
    expect(fc).toBeDefined();
    expect(fc.assert).toBeDefined();
  });
});
