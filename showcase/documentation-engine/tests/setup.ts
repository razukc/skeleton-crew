import { beforeEach } from 'vitest';

console.log('=== SETUP FILE LOADED ===');

// Mock localStorage for jsdom environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

// Set up localStorage on global and window
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Reset localStorage before each test
beforeEach(() => {
  localStorageMock.clear();
});
