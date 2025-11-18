import { describe, it, expect, vi } from 'vitest';
import { PluginRegistry } from './plugin-registry.js';
import { PluginDefinition, RuntimeContext } from './types.js';

// Mock RuntimeContext for testing
const createMockContext = (): RuntimeContext => ({
  screens: {
    registerScreen: vi.fn(),
    getScreen: vi.fn(),
    getAllScreens: vi.fn(),
  },
  actions: {
    registerAction: vi.fn(),
    runAction: vi.fn(),
  },
  plugins: {
    registerPlugin: vi.fn(),
    getPlugin: vi.fn(),
    getAllPlugins: vi.fn(),
  },
  events: {
    emit: vi.fn(),
    on: vi.fn(),
  },
  getRuntime: vi.fn(),
});

describe('PluginRegistry', () => {
  describe('registerPlugin', () => {
    it('should register a valid plugin', () => {
      const registry = new PluginRegistry();
      const plugin: PluginDefinition = {
        name: 'test-plugin',
        version: '1.0.0',
        setup: vi.fn(),
      };

      registry.registerPlugin(plugin);

      expect(registry.getPlugin('test-plugin')).toBe(plugin);
    });

    it('should throw error for duplicate plugin name', () => {
      const registry = new PluginRegistry();
      const plugin1: PluginDefinition = {
        name: 'test-plugin',
        version: '1.0.0',
        setup: vi.fn(),
      };
      const plugin2: PluginDefinition = {
        name: 'test-plugin',
        version: '2.0.0',
        setup: vi.fn(),
      };

      registry.registerPlugin(plugin1);

      expect(() => registry.registerPlugin(plugin2)).toThrow(
        'Plugin with name "test-plugin" is already registered'
      );
    });

    it('should validate required fields', () => {
      const registry = new PluginRegistry();

      expect(() =>
        registry.registerPlugin({} as PluginDefinition)
      ).toThrow('Plugin must have a valid name');

      expect(() =>
        registry.registerPlugin({ name: 'test' } as PluginDefinition)
      ).toThrow('Plugin must have a valid version');

      expect(() =>
        registry.registerPlugin({
          name: 'test',
          version: '1.0.0',
        } as PluginDefinition)
      ).toThrow('Plugin must have a valid setup function');
    });
  });

  describe('executeSetup', () => {
    it('should execute plugin setup callbacks sequentially', async () => {
      const registry = new PluginRegistry();
      const context = createMockContext();
      const callOrder: number[] = [];

      const plugin1: PluginDefinition = {
        name: 'plugin-1',
        version: '1.0.0',
        setup: vi.fn(() => {
          callOrder.push(1);
        }),
      };
      const plugin2: PluginDefinition = {
        name: 'plugin-2',
        version: '1.0.0',
        setup: vi.fn(() => {
          callOrder.push(2);
        }),
      };
      const plugin3: PluginDefinition = {
        name: 'plugin-3',
        version: '1.0.0',
        setup: vi.fn(() => {
          callOrder.push(3);
        }),
      };

      registry.registerPlugin(plugin1);
      registry.registerPlugin(plugin2);
      registry.registerPlugin(plugin3);

      await registry.executeSetup(context);

      expect(callOrder).toEqual([1, 2, 3]);
      expect(plugin1.setup).toHaveBeenCalledWith(context);
      expect(plugin2.setup).toHaveBeenCalledWith(context);
      expect(plugin3.setup).toHaveBeenCalledWith(context);
    });

    it('should support async setup callbacks', async () => {
      const registry = new PluginRegistry();
      const context = createMockContext();
      const callOrder: number[] = [];

      const plugin1: PluginDefinition = {
        name: 'plugin-1',
        version: '1.0.0',
        setup: vi.fn(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          callOrder.push(1);
        }),
      };
      const plugin2: PluginDefinition = {
        name: 'plugin-2',
        version: '1.0.0',
        setup: vi.fn(() => {
          callOrder.push(2);
        }),
      };

      registry.registerPlugin(plugin1);
      registry.registerPlugin(plugin2);

      await registry.executeSetup(context);

      expect(callOrder).toEqual([1, 2]);
    });

    it('should track successfully initialized plugins', async () => {
      const registry = new PluginRegistry();
      const context = createMockContext();

      const plugin: PluginDefinition = {
        name: 'test-plugin',
        version: '1.0.0',
        setup: vi.fn(),
      };

      registry.registerPlugin(plugin);
      await registry.executeSetup(context);

      // Verify by checking that dispose will be called for this plugin
      const disposePlugin: PluginDefinition = {
        name: 'dispose-test',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(),
      };

      registry.registerPlugin(disposePlugin);
      await registry.executeSetup(context);
      await registry.executeDispose(context);

      expect(disposePlugin.dispose).toHaveBeenCalled();
    });

    it('should abort on first plugin setup failure', async () => {
      const registry = new PluginRegistry();
      const context = createMockContext();

      const plugin1: PluginDefinition = {
        name: 'plugin-1',
        version: '1.0.0',
        setup: vi.fn(),
      };
      const plugin2: PluginDefinition = {
        name: 'plugin-2',
        version: '1.0.0',
        setup: vi.fn(() => {
          throw new Error('Setup failed');
        }),
      };
      const plugin3: PluginDefinition = {
        name: 'plugin-3',
        version: '1.0.0',
        setup: vi.fn(),
      };

      registry.registerPlugin(plugin1);
      registry.registerPlugin(plugin2);
      registry.registerPlugin(plugin3);

      await expect(registry.executeSetup(context)).rejects.toThrow(
        'Plugin "plugin-2" setup failed: Setup failed'
      );

      expect(plugin1.setup).toHaveBeenCalled();
      expect(plugin2.setup).toHaveBeenCalled();
      expect(plugin3.setup).not.toHaveBeenCalled();
    });

    it('should include plugin name in error message', async () => {
      const registry = new PluginRegistry();
      const context = createMockContext();

      const plugin: PluginDefinition = {
        name: 'failing-plugin',
        version: '1.0.0',
        setup: vi.fn(() => {
          throw new Error('Custom error');
        }),
      };

      registry.registerPlugin(plugin);

      await expect(registry.executeSetup(context)).rejects.toThrow(
        'Plugin "failing-plugin" setup failed: Custom error'
      );
    });
  });

  describe('executeDispose', () => {
    it('should execute dispose only for initialized plugins', async () => {
      const registry = new PluginRegistry();
      const context = createMockContext();

      const plugin1: PluginDefinition = {
        name: 'plugin-1',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(),
      };
      const plugin2: PluginDefinition = {
        name: 'plugin-2',
        version: '1.0.0',
        setup: vi.fn(() => {
          throw new Error('Setup failed');
        }),
        dispose: vi.fn(),
      };
      const plugin3: PluginDefinition = {
        name: 'plugin-3',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(),
      };

      registry.registerPlugin(plugin1);
      registry.registerPlugin(plugin2);
      registry.registerPlugin(plugin3);

      // Setup will fail on plugin-2
      await expect(registry.executeSetup(context)).rejects.toThrow();

      // Only plugin-1 should have dispose called
      await registry.executeDispose(context);

      expect(plugin1.dispose).toHaveBeenCalledWith(context);
      expect(plugin2.dispose).not.toHaveBeenCalled();
      expect(plugin3.dispose).not.toHaveBeenCalled();
    });

    it('should execute dispose in same order as setup', async () => {
      const registry = new PluginRegistry();
      const context = createMockContext();
      const callOrder: number[] = [];

      const plugin1: PluginDefinition = {
        name: 'plugin-1',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(() => {
          callOrder.push(1);
        }),
      };
      const plugin2: PluginDefinition = {
        name: 'plugin-2',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(() => {
          callOrder.push(2);
        }),
      };
      const plugin3: PluginDefinition = {
        name: 'plugin-3',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(() => {
          callOrder.push(3);
        }),
      };

      registry.registerPlugin(plugin1);
      registry.registerPlugin(plugin2);
      registry.registerPlugin(plugin3);

      await registry.executeSetup(context);
      await registry.executeDispose(context);

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it('should log dispose errors but continue cleanup', async () => {
      const registry = new PluginRegistry();
      const context = createMockContext();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const plugin1: PluginDefinition = {
        name: 'plugin-1',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(() => {
          throw new Error('Dispose error 1');
        }),
      };
      const plugin2: PluginDefinition = {
        name: 'plugin-2',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(),
      };
      const plugin3: PluginDefinition = {
        name: 'plugin-3',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(() => {
          throw new Error('Dispose error 3');
        }),
      };

      registry.registerPlugin(plugin1);
      registry.registerPlugin(plugin2);
      registry.registerPlugin(plugin3);

      await registry.executeSetup(context);
      await registry.executeDispose(context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Plugin "plugin-1" dispose failed: Dispose error 1'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Plugin "plugin-3" dispose failed: Dispose error 3'
      );
      expect(plugin2.dispose).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should skip plugins without dispose callback', async () => {
      const registry = new PluginRegistry();
      const context = createMockContext();

      const plugin1: PluginDefinition = {
        name: 'plugin-1',
        version: '1.0.0',
        setup: vi.fn(),
      };
      const plugin2: PluginDefinition = {
        name: 'plugin-2',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(),
      };

      registry.registerPlugin(plugin1);
      registry.registerPlugin(plugin2);

      await registry.executeSetup(context);
      await registry.executeDispose(context);

      expect(plugin2.dispose).toHaveBeenCalled();
    });

    it('should support async dispose callbacks', async () => {
      const registry = new PluginRegistry();
      const context = createMockContext();
      const callOrder: number[] = [];

      const plugin1: PluginDefinition = {
        name: 'plugin-1',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          callOrder.push(1);
        }),
      };
      const plugin2: PluginDefinition = {
        name: 'plugin-2',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(() => {
          callOrder.push(2);
        }),
      };

      registry.registerPlugin(plugin1);
      registry.registerPlugin(plugin2);

      await registry.executeSetup(context);
      await registry.executeDispose(context);

      expect(callOrder).toEqual([1, 2]);
    });
  });

  describe('getPlugin', () => {
    it('should return plugin by name', () => {
      const registry = new PluginRegistry();
      const plugin: PluginDefinition = {
        name: 'test-plugin',
        version: '1.0.0',
        setup: vi.fn(),
      };

      registry.registerPlugin(plugin);

      expect(registry.getPlugin('test-plugin')).toBe(plugin);
    });

    it('should return null for non-existent plugin', () => {
      const registry = new PluginRegistry();

      expect(registry.getPlugin('non-existent')).toBeNull();
    });
  });

  describe('getAllPlugins', () => {
    it('should return all registered plugins', () => {
      const registry = new PluginRegistry();
      const plugin1: PluginDefinition = {
        name: 'plugin-1',
        version: '1.0.0',
        setup: vi.fn(),
      };
      const plugin2: PluginDefinition = {
        name: 'plugin-2',
        version: '1.0.0',
        setup: vi.fn(),
      };

      registry.registerPlugin(plugin1);
      registry.registerPlugin(plugin2);

      const allPlugins = registry.getAllPlugins();
      expect(allPlugins).toHaveLength(2);
      expect(allPlugins).toContain(plugin1);
      expect(allPlugins).toContain(plugin2);
    });

    it('should return empty array when no plugins registered', () => {
      const registry = new PluginRegistry();

      expect(registry.getAllPlugins()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all plugins and initialized state', async () => {
      const registry = new PluginRegistry();
      const context = createMockContext();

      const plugin: PluginDefinition = {
        name: 'test-plugin',
        version: '1.0.0',
        setup: vi.fn(),
        dispose: vi.fn(),
      };

      registry.registerPlugin(plugin);
      await registry.executeSetup(context);

      registry.clear();

      expect(registry.getPlugin('test-plugin')).toBeNull();
      expect(registry.getAllPlugins()).toEqual([]);

      // After clear, dispose should not be called since initialized state is cleared
      await registry.executeDispose(context);
      expect(plugin.dispose).not.toHaveBeenCalled();
    });
  });
});
