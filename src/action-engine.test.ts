import { describe, it, expect } from 'vitest';
import { ActionEngine } from './action-engine.js';
import type { ActionDefinition, RuntimeContext } from './types.js';

// Create a minimal mock RuntimeContext for testing
function createMockContext(): RuntimeContext {
  return {
    screens: {
      registerScreen: () => {},
      getScreen: () => null,
      getAllScreens: () => []
    },
    actions: {
      registerAction: () => {},
      runAction: async () => undefined
    },
    plugins: {
      registerPlugin: () => {},
      getPlugin: () => null,
      getAllPlugins: () => []
    },
    events: {
      emit: () => {},
      on: () => () => {}
    },
    getRuntime: () => ({
      initialize: async () => {},
      shutdown: async () => {},
      getContext: () => createMockContext()
    })
  };
}

describe('ActionEngine', () => {
  describe('registerAction', () => {
    it('should register a valid action definition', () => {
      const engine = new ActionEngine();
      const action: ActionDefinition = {
        id: 'test-action',
        handler: () => 'result'
      };
      
      expect(() => engine.registerAction(action)).not.toThrow();
      
      const retrieved = engine.getAction('test-action');
      expect(retrieved).toEqual(action);
    });

    it('should reject duplicate action IDs', () => {
      const engine = new ActionEngine();
      const action1: ActionDefinition = {
        id: 'test-action',
        handler: () => 'result1'
      };
      const action2: ActionDefinition = {
        id: 'test-action',
        handler: () => 'result2'
      };
      
      engine.registerAction(action1);
      
      expect(() => engine.registerAction(action2)).toThrow(
        'Action with id "test-action" is already registered'
      );
    });

    it('should validate required id field', () => {
      const engine = new ActionEngine();
      const actionWithoutId = {
        handler: () => 'result'
      } as unknown as ActionDefinition;
      
      expect(() => engine.registerAction(actionWithoutId)).toThrow(
        'Action definition must have a valid id field'
      );
    });

    it('should validate required handler field', () => {
      const engine = new ActionEngine();
      const actionWithoutHandler = {
        id: 'test-action'
      } as unknown as ActionDefinition;
      
      expect(() => engine.registerAction(actionWithoutHandler)).toThrow(
        'Action definition must have a valid handler function'
      );
    });

    it('should reject action with empty id', () => {
      const engine = new ActionEngine();
      const action: ActionDefinition = {
        id: '',
        handler: () => 'result'
      };
      
      expect(() => engine.registerAction(action)).toThrow(
        'Action definition must have a valid id field'
      );
    });

    it('should reject action with non-string id', () => {
      const engine = new ActionEngine();
      const action = {
        id: 123,
        handler: () => 'result'
      } as unknown as ActionDefinition;
      
      expect(() => engine.registerAction(action)).toThrow(
        'Action definition must have a valid id field'
      );
    });

    it('should reject action with non-function handler', () => {
      const engine = new ActionEngine();
      const action = {
        id: 'test-action',
        handler: 'not-a-function'
      } as unknown as ActionDefinition;
      
      expect(() => engine.registerAction(action)).toThrow(
        'Action definition must have a valid handler function'
      );
    });
  });

  describe('runAction', () => {
    it('should execute handler with params and context', async () => {
      const engine = new ActionEngine();
      const mockContext = createMockContext();
      engine.setContext(mockContext);
      
      let receivedParams: unknown;
      let receivedContext: RuntimeContext | undefined;
      
      const action: ActionDefinition = {
        id: 'test-action',
        handler: (params, context) => {
          receivedParams = params;
          receivedContext = context;
          return 'success';
        }
      };
      
      engine.registerAction(action);
      
      const params = { key: 'value' };
      const result = await engine.runAction('test-action', params);
      
      expect(result).toBe('success');
      expect(receivedParams).toEqual(params);
      expect(receivedContext).toBe(mockContext);
    });

    it('should throw error for non-existent action', async () => {
      const engine = new ActionEngine();
      const mockContext = createMockContext();
      engine.setContext(mockContext);
      
      await expect(engine.runAction('non-existent')).rejects.toThrow(
        'Action with id "non-existent" not found'
      );
    });

    it('should handle synchronous handlers', async () => {
      const engine = new ActionEngine();
      const mockContext = createMockContext();
      engine.setContext(mockContext);
      
      const action: ActionDefinition = {
        id: 'sync-action',
        handler: () => 'sync-result'
      };
      
      engine.registerAction(action);
      
      const result = await engine.runAction('sync-action');
      
      expect(result).toBe('sync-result');
    });

    it('should handle asynchronous handlers', async () => {
      const engine = new ActionEngine();
      const mockContext = createMockContext();
      engine.setContext(mockContext);
      
      const action: ActionDefinition = {
        id: 'async-action',
        handler: async () => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'async-result';
        }
      };
      
      engine.registerAction(action);
      
      const result = await engine.runAction('async-action');
      
      expect(result).toBe('async-result');
    });

    it('should handle actions without params', async () => {
      const engine = new ActionEngine();
      const mockContext = createMockContext();
      engine.setContext(mockContext);
      
      let receivedParams: unknown;
      
      const action: ActionDefinition = {
        id: 'no-params-action',
        handler: (params) => {
          receivedParams = params;
          return 'result';
        }
      };
      
      engine.registerAction(action);
      
      const result = await engine.runAction('no-params-action');
      
      expect(result).toBe('result');
      expect(receivedParams).toBeUndefined();
    });

    it('should throw error if context is not set', async () => {
      const engine = new ActionEngine();
      
      const action: ActionDefinition = {
        id: 'test-action',
        handler: () => 'result'
      };
      
      engine.registerAction(action);
      
      await expect(engine.runAction('test-action')).rejects.toThrow(
        'RuntimeContext not set in ActionEngine'
      );
    });

    it('should return handler result', async () => {
      const engine = new ActionEngine();
      const mockContext = createMockContext();
      engine.setContext(mockContext);
      
      const expectedResult = { data: 'test', count: 42 };
      
      const action: ActionDefinition = {
        id: 'result-action',
        handler: () => expectedResult
      };
      
      engine.registerAction(action);
      
      const result = await engine.runAction('result-action');
      
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAction', () => {
    it('should return action definition for existing ID', () => {
      const engine = new ActionEngine();
      const action: ActionDefinition = {
        id: 'test-action',
        handler: () => 'result'
      };
      
      engine.registerAction(action);
      const retrieved = engine.getAction('test-action');
      
      expect(retrieved).toEqual(action);
    });

    it('should return null for non-existing ID', () => {
      const engine = new ActionEngine();
      
      const retrieved = engine.getAction('non-existent');
      
      expect(retrieved).toBeNull();
    });
  });

  describe('getAllActions', () => {
    it('should return all registered actions', () => {
      const engine = new ActionEngine();
      const action1: ActionDefinition = {
        id: 'action1',
        handler: () => 'result1'
      };
      const action2: ActionDefinition = {
        id: 'action2',
        handler: () => 'result2'
      };
      const action3: ActionDefinition = {
        id: 'action3',
        handler: () => 'result3'
      };
      
      engine.registerAction(action1);
      engine.registerAction(action2);
      engine.registerAction(action3);
      
      const allActions = engine.getAllActions();
      
      expect(allActions).toHaveLength(3);
      expect(allActions).toContainEqual(action1);
      expect(allActions).toContainEqual(action2);
      expect(allActions).toContainEqual(action3);
    });

    it('should return empty array when no actions are registered', () => {
      const engine = new ActionEngine();
      
      const allActions = engine.getAllActions();
      
      expect(allActions).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all registered actions', () => {
      const engine = new ActionEngine();
      const action1: ActionDefinition = {
        id: 'action1',
        handler: () => 'result1'
      };
      const action2: ActionDefinition = {
        id: 'action2',
        handler: () => 'result2'
      };
      
      engine.registerAction(action1);
      engine.registerAction(action2);
      
      engine.clear();
      
      expect(engine.getAction('action1')).toBeNull();
      expect(engine.getAction('action2')).toBeNull();
      expect(engine.getAllActions()).toEqual([]);
    });

    it('should allow registering actions after clear', () => {
      const engine = new ActionEngine();
      const action1: ActionDefinition = {
        id: 'action1',
        handler: () => 'result1'
      };
      const action2: ActionDefinition = {
        id: 'action1',
        handler: () => 'result2'
      };
      
      engine.registerAction(action1);
      engine.clear();
      
      // Should not throw since previous action was cleared
      expect(() => engine.registerAction(action2)).not.toThrow();
      expect(engine.getAction('action1')).toEqual(action2);
    });
  });

  describe('instance isolation', () => {
    it('should maintain separate registries for different ActionEngine instances', () => {
      const engine1 = new ActionEngine();
      const engine2 = new ActionEngine();
      
      const action1: ActionDefinition = {
        id: 'action1',
        handler: () => 'result1'
      };
      const action2: ActionDefinition = {
        id: 'action1',
        handler: () => 'result2'
      };
      
      engine1.registerAction(action1);
      engine2.registerAction(action2);
      
      expect(engine1.getAction('action1')).toEqual(action1);
      expect(engine2.getAction('action1')).toEqual(action2);
      expect(engine1.getAllActions()).toHaveLength(1);
      expect(engine2.getAllActions()).toHaveLength(1);
    });
  });
});
