import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  DuplicateRegistrationError,
  ActionTimeoutError,
  ActionExecutionError,
  ContractViolationError,
} from '../../src/types.js';

describe('Error Classes', () => {
  describe('ValidationError', () => {
    it('should construct with resourceType and field', () => {
      const error = new ValidationError('Plugin', 'name');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.resourceType).toBe('Plugin');
      expect(error.field).toBe('name');
      expect(error.resourceId).toBeUndefined();
    });

    it('should construct with resourceType, field, and resourceId', () => {
      const error = new ValidationError('Action', 'handler', 'my-action');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.resourceType).toBe('Action');
      expect(error.field).toBe('handler');
      expect(error.resourceId).toBe('my-action');
    });

    it('should include resourceType and field in error message without resourceId', () => {
      const error = new ValidationError('Screen', 'title');
      
      expect(error.message).toBe('Validation failed for Screen: missing or invalid field "title"');
    });

    it('should include resourceType, field, and resourceId in error message', () => {
      const error = new ValidationError('Action', 'id', 'test-action');
      
      expect(error.message).toBe('Validation failed for Action "test-action": missing or invalid field "id"');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new ValidationError('Plugin', 'version');
      }).toThrow(ValidationError);
      
      expect(() => {
        throw new ValidationError('Plugin', 'version');
      }).toThrow('Validation failed for Plugin: missing or invalid field "version"');
    });

    it('should preserve all properties when caught', () => {
      try {
        throw new ValidationError('Screen', 'component', 'home-screen');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.resourceType).toBe('Screen');
          expect(error.field).toBe('component');
          expect(error.resourceId).toBe('home-screen');
        }
      }
    });
  });

  describe('DuplicateRegistrationError', () => {
    it('should construct with resourceType and identifier', () => {
      const error = new DuplicateRegistrationError('Plugin', 'my-plugin');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DuplicateRegistrationError);
      expect(error.name).toBe('DuplicateRegistrationError');
      expect(error.resourceType).toBe('Plugin');
      expect(error.identifier).toBe('my-plugin');
    });

    it('should include resourceType and identifier in error message', () => {
      const error = new DuplicateRegistrationError('Action', 'duplicate-action');
      
      expect(error.message).toBe('Action with identifier "duplicate-action" is already registered');
    });

    it('should work with different resource types', () => {
      const pluginError = new DuplicateRegistrationError('Plugin', 'plugin-1');
      const screenError = new DuplicateRegistrationError('Screen', 'screen-1');
      const actionError = new DuplicateRegistrationError('Action', 'action-1');
      
      expect(pluginError.message).toContain('Plugin');
      expect(pluginError.message).toContain('plugin-1');
      
      expect(screenError.message).toContain('Screen');
      expect(screenError.message).toContain('screen-1');
      
      expect(actionError.message).toContain('Action');
      expect(actionError.message).toContain('action-1');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new DuplicateRegistrationError('Screen', 'home');
      }).toThrow(DuplicateRegistrationError);
      
      expect(() => {
        throw new DuplicateRegistrationError('Screen', 'home');
      }).toThrow('Screen with identifier "home" is already registered');
    });

    it('should preserve all properties when caught', () => {
      try {
        throw new DuplicateRegistrationError('Action', 'test-action');
      } catch (error) {
        expect(error).toBeInstanceOf(DuplicateRegistrationError);
        if (error instanceof DuplicateRegistrationError) {
          expect(error.resourceType).toBe('Action');
          expect(error.identifier).toBe('test-action');
        }
      }
    });
  });

  describe('ActionTimeoutError', () => {
    it('should construct with actionId and timeoutMs', () => {
      const error = new ActionTimeoutError('slow-action', 5000);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ActionTimeoutError);
      expect(error.name).toBe('ActionTimeoutError');
      expect(error.actionId).toBe('slow-action');
      expect(error.timeoutMs).toBe(5000);
    });

    it('should include actionId and timeout in error message', () => {
      const error = new ActionTimeoutError('my-action', 3000);
      
      expect(error.message).toBe('Action "my-action" timed out after 3000ms');
    });

    it('should work with different timeout values', () => {
      const error1 = new ActionTimeoutError('action-1', 1000);
      const error2 = new ActionTimeoutError('action-2', 10000);
      const error3 = new ActionTimeoutError('action-3', 500);
      
      expect(error1.message).toContain('1000ms');
      expect(error2.message).toContain('10000ms');
      expect(error3.message).toContain('500ms');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new ActionTimeoutError('timeout-action', 2000);
      }).toThrow(ActionTimeoutError);
      
      expect(() => {
        throw new ActionTimeoutError('timeout-action', 2000);
      }).toThrow('Action "timeout-action" timed out after 2000ms');
    });

    it('should preserve all properties when caught', () => {
      try {
        throw new ActionTimeoutError('test-action', 1500);
      } catch (error) {
        expect(error).toBeInstanceOf(ActionTimeoutError);
        if (error instanceof ActionTimeoutError) {
          expect(error.actionId).toBe('test-action');
          expect(error.timeoutMs).toBe(1500);
        }
      }
    });
  });

  describe('ActionExecutionError', () => {
    it('should construct with actionId and cause', () => {
      const cause = new Error('Original error');
      const error = new ActionExecutionError('my-action', cause);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ActionExecutionError);
      expect(error.name).toBe('ActionExecutionError');
      expect(error.actionId).toBe('my-action');
      expect(error.cause).toBe(cause);
    });

    it('should include actionId and cause message in error message', () => {
      const cause = new Error('Database connection failed');
      const error = new ActionExecutionError('fetch-data', cause);
      
      expect(error.message).toBe('Action "fetch-data" execution failed: Database connection failed');
    });

    it('should preserve the cause error chain', () => {
      const originalError = new Error('Network timeout');
      const executionError = new ActionExecutionError('api-call', originalError);
      
      expect(executionError.cause).toBe(originalError);
      expect(executionError.cause).toBeInstanceOf(Error);
      if (executionError.cause instanceof Error) {
        expect(executionError.cause.message).toBe('Network timeout');
      }
    });

    it('should work with different cause error types', () => {
      const typeError = new TypeError('Invalid type');
      const rangeError = new RangeError('Out of range');
      const customError = new Error('Custom error');
      
      const error1 = new ActionExecutionError('action-1', typeError);
      const error2 = new ActionExecutionError('action-2', rangeError);
      const error3 = new ActionExecutionError('action-3', customError);
      
      expect(error1.cause).toBe(typeError);
      expect(error2.cause).toBe(rangeError);
      expect(error3.cause).toBe(customError);
      
      expect(error1.message).toContain('Invalid type');
      expect(error2.message).toContain('Out of range');
      expect(error3.message).toContain('Custom error');
    });

    it('should be throwable and catchable', () => {
      const cause = new Error('Handler failed');
      
      expect(() => {
        throw new ActionExecutionError('test-action', cause);
      }).toThrow(ActionExecutionError);
      
      expect(() => {
        throw new ActionExecutionError('test-action', cause);
      }).toThrow('Action "test-action" execution failed: Handler failed');
    });

    it('should preserve all properties when caught', () => {
      const cause = new Error('Test error');
      
      try {
        throw new ActionExecutionError('my-action', cause);
      } catch (error) {
        expect(error).toBeInstanceOf(ActionExecutionError);
        if (error instanceof ActionExecutionError) {
          expect(error.actionId).toBe('my-action');
          expect(error.cause).toBe(cause);
          expect(error.cause).toBeInstanceOf(Error);
        }
      }
    });

    it('should maintain error chain for nested errors', () => {
      const rootCause = new Error('Root cause');
      const wrappedError = new ActionExecutionError('inner-action', rootCause);
      const outerError = new ActionExecutionError('outer-action', wrappedError);
      
      expect(outerError.cause).toBe(wrappedError);
      expect(outerError.cause).toBeInstanceOf(ActionExecutionError);
      
      if (outerError.cause instanceof ActionExecutionError) {
        expect(outerError.cause.cause).toBe(rootCause);
        expect(outerError.cause.cause).toBeInstanceOf(Error);
      }
    });
  });

  describe('Error class relationships', () => {
    it('should all extend Error', () => {
      const validationError = new ValidationError('Test', 'field');
      const duplicateError = new DuplicateRegistrationError('Test', 'id');
      const timeoutError = new ActionTimeoutError('action', 1000);
      const executionError = new ActionExecutionError('action', new Error('cause'));

      expect(validationError).toBeInstanceOf(Error);
      expect(duplicateError).toBeInstanceOf(Error);
      expect(timeoutError).toBeInstanceOf(Error);
      expect(executionError).toBeInstanceOf(Error);
    });

    it('should have unique names for each error type', () => {
      const validationError = new ValidationError('Test', 'field');
      const duplicateError = new DuplicateRegistrationError('Test', 'id');
      const timeoutError = new ActionTimeoutError('action', 1000);
      const executionError = new ActionExecutionError('action', new Error('cause'));

      expect(validationError.name).toBe('ValidationError');
      expect(duplicateError.name).toBe('DuplicateRegistrationError');
      expect(timeoutError.name).toBe('ActionTimeoutError');
      expect(executionError.name).toBe('ActionExecutionError');

      // All names should be unique
      const names = [
        validationError.name,
        duplicateError.name,
        timeoutError.name,
        executionError.name,
      ];
      expect(new Set(names).size).toBe(4);
    });

    it('should be distinguishable via instanceof', () => {
      const validationError = new ValidationError('Test', 'field');
      const duplicateError = new DuplicateRegistrationError('Test', 'id');
      const timeoutError = new ActionTimeoutError('action', 1000);
      const executionError = new ActionExecutionError('action', new Error('cause'));

      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError).not.toBeInstanceOf(DuplicateRegistrationError);
      expect(validationError).not.toBeInstanceOf(ActionTimeoutError);
      expect(validationError).not.toBeInstanceOf(ActionExecutionError);

      expect(duplicateError).toBeInstanceOf(DuplicateRegistrationError);
      expect(duplicateError).not.toBeInstanceOf(ValidationError);

      expect(timeoutError).toBeInstanceOf(ActionTimeoutError);
      expect(timeoutError).not.toBeInstanceOf(ValidationError);

      expect(executionError).toBeInstanceOf(ActionExecutionError);
      expect(executionError).not.toBeInstanceOf(ValidationError);
    });
  });

  describe('ContractViolationError', () => {
    it('carries code, actionId, and batched violations with a loud message', () => {
      const err = new ContractViolationError('tasks:create', [
        { path: '/title', expected: 'string', actual: 'undefined', schema: { type: 'string' } },
        { path: '/priority', expected: 'one of [1,2,3]', actual: '9', schema: { enum: [1, 2, 3] } },
      ]);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('ContractViolationError');
      expect(err.code).toBe('CONTRACT_INPUT_VIOLATION');
      expect(err.actionId).toBe('tasks:create');
      expect(err.violations).toHaveLength(2);
      expect(err.message).toContain('tasks:create');
      expect(err.message).toContain('/title');
      expect(err.message).toContain('/priority');
    });
  });
});
