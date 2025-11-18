import { describe, it, expect } from 'vitest';
import { UIBridge } from './ui-bridge.js';
import type { UIProvider, ScreenDefinition } from './types.js';

describe('UIBridge', () => {
  describe('setProvider', () => {
    it('should register a valid UI provider', () => {
      const bridge = new UIBridge();
      const provider: UIProvider = {
        mount: () => {},
        render: () => 'rendered'
      };
      
      expect(() => bridge.setProvider(provider)).not.toThrow();
      expect(bridge.getProvider()).toBe(provider);
    });

    it('should reject duplicate provider registration', () => {
      const bridge = new UIBridge();
      const provider1: UIProvider = {
        mount: () => {},
        render: () => 'rendered1'
      };
      const provider2: UIProvider = {
        mount: () => {},
        render: () => 'rendered2'
      };
      
      bridge.setProvider(provider1);
      
      expect(() => bridge.setProvider(provider2)).toThrow(
        'UI provider already registered'
      );
    });

    it('should validate provider has mount method', () => {
      const bridge = new UIBridge();
      const invalidProvider = {
        render: () => 'rendered'
      } as UIProvider;
      
      expect(() => bridge.setProvider(invalidProvider)).toThrow(
        'UI provider must implement mount method'
      );
    });

    it('should validate provider has render method', () => {
      const bridge = new UIBridge();
      const invalidProvider = {
        mount: () => {}
      } as UIProvider;
      
      expect(() => bridge.setProvider(invalidProvider)).toThrow(
        'UI provider must implement render method'
      );
    });

    it('should validate mount is a function', () => {
      const bridge = new UIBridge();
      const invalidProvider = {
        mount: 'not a function',
        render: () => 'rendered'
      } as unknown as UIProvider;
      
      expect(() => bridge.setProvider(invalidProvider)).toThrow(
        'UI provider must implement mount method'
      );
    });

    it('should validate render is a function', () => {
      const bridge = new UIBridge();
      const invalidProvider = {
        mount: () => {},
        render: 'not a function'
      } as unknown as UIProvider;
      
      expect(() => bridge.setProvider(invalidProvider)).toThrow(
        'UI provider must implement render method'
      );
    });
  });

  describe('getProvider', () => {
    it('should return null when no provider is registered', () => {
      const bridge = new UIBridge();
      
      expect(bridge.getProvider()).toBeNull();
    });

    it('should return the registered provider', () => {
      const bridge = new UIBridge();
      const provider: UIProvider = {
        mount: () => {},
        render: () => 'rendered'
      };
      
      bridge.setProvider(provider);
      
      expect(bridge.getProvider()).toBe(provider);
    });

    it('should return null after clear', () => {
      const bridge = new UIBridge();
      const provider: UIProvider = {
        mount: () => {},
        render: () => 'rendered'
      };
      
      bridge.setProvider(provider);
      bridge.clear();
      
      expect(bridge.getProvider()).toBeNull();
    });
  });

  describe('renderScreen', () => {
    it('should delegate rendering to the provider', () => {
      const bridge = new UIBridge();
      const screen: ScreenDefinition = {
        id: 'home',
        title: 'Home Screen',
        component: 'HomeComponent'
      };
      const expectedResult = { rendered: true };
      
      const provider: UIProvider = {
        mount: () => {},
        render: (s) => {
          expect(s).toBe(screen);
          return expectedResult;
        }
      };
      
      bridge.setProvider(provider);
      const result = bridge.renderScreen(screen);
      
      expect(result).toBe(expectedResult);
    });

    it('should throw error when no provider is registered', () => {
      const bridge = new UIBridge();
      const screen: ScreenDefinition = {
        id: 'home',
        title: 'Home Screen',
        component: 'HomeComponent'
      };
      
      expect(() => bridge.renderScreen(screen)).toThrow(
        'No UI provider registered'
      );
    });

    it('should pass screen definition to provider render method', () => {
      const bridge = new UIBridge();
      const screen: ScreenDefinition = {
        id: 'settings',
        title: 'Settings Screen',
        component: 'SettingsComponent'
      };
      
      let receivedScreen: ScreenDefinition | null = null;
      const provider: UIProvider = {
        mount: () => {},
        render: (s) => {
          receivedScreen = s;
          return 'rendered';
        }
      };
      
      bridge.setProvider(provider);
      bridge.renderScreen(screen);
      
      expect(receivedScreen).toEqual(screen);
    });

    it('should return the result from provider render method', () => {
      const bridge = new UIBridge();
      const screen: ScreenDefinition = {
        id: 'home',
        title: 'Home Screen',
        component: 'HomeComponent'
      };
      const renderResult = { element: 'div', children: [] };
      
      const provider: UIProvider = {
        mount: () => {},
        render: () => renderResult
      };
      
      bridge.setProvider(provider);
      const result = bridge.renderScreen(screen);
      
      expect(result).toBe(renderResult);
    });
  });

  describe('clear', () => {
    it('should remove the registered provider', () => {
      const bridge = new UIBridge();
      const provider: UIProvider = {
        mount: () => {},
        render: () => 'rendered'
      };
      
      bridge.setProvider(provider);
      bridge.clear();
      
      expect(bridge.getProvider()).toBeNull();
    });

    it('should allow registering a new provider after clear', () => {
      const bridge = new UIBridge();
      const provider1: UIProvider = {
        mount: () => {},
        render: () => 'rendered1'
      };
      const provider2: UIProvider = {
        mount: () => {},
        render: () => 'rendered2'
      };
      
      bridge.setProvider(provider1);
      bridge.clear();
      
      // Should not throw since previous provider was cleared
      expect(() => bridge.setProvider(provider2)).not.toThrow();
      expect(bridge.getProvider()).toBe(provider2);
    });

    it('should make renderScreen throw after clear', () => {
      const bridge = new UIBridge();
      const provider: UIProvider = {
        mount: () => {},
        render: () => 'rendered'
      };
      const screen: ScreenDefinition = {
        id: 'home',
        title: 'Home Screen',
        component: 'HomeComponent'
      };
      
      bridge.setProvider(provider);
      bridge.clear();
      
      expect(() => bridge.renderScreen(screen)).toThrow(
        'No UI provider registered'
      );
    });
  });

  describe('instance isolation', () => {
    it('should maintain separate providers for different UIBridge instances', () => {
      const bridge1 = new UIBridge();
      const bridge2 = new UIBridge();
      
      const provider1: UIProvider = {
        mount: () => {},
        render: () => 'rendered1'
      };
      const provider2: UIProvider = {
        mount: () => {},
        render: () => 'rendered2'
      };
      
      bridge1.setProvider(provider1);
      bridge2.setProvider(provider2);
      
      expect(bridge1.getProvider()).toBe(provider1);
      expect(bridge2.getProvider()).toBe(provider2);
    });

    it('should not affect other instances when clearing', () => {
      const bridge1 = new UIBridge();
      const bridge2 = new UIBridge();
      
      const provider1: UIProvider = {
        mount: () => {},
        render: () => 'rendered1'
      };
      const provider2: UIProvider = {
        mount: () => {},
        render: () => 'rendered2'
      };
      
      bridge1.setProvider(provider1);
      bridge2.setProvider(provider2);
      
      bridge1.clear();
      
      expect(bridge1.getProvider()).toBeNull();
      expect(bridge2.getProvider()).toBe(provider2);
    });
  });
});
