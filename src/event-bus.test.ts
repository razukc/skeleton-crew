import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './event-bus.js';

describe('EventBus', () => {
  describe('emit and on', () => {
    it('should invoke registered handlers when event is emitted', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      
      bus.on('test-event', handler);
      bus.emit('test-event', { data: 'test' });
      
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should invoke multiple handlers in registration order', () => {
      const bus = new EventBus();
      const callOrder: number[] = [];
      
      const handler1 = vi.fn(() => callOrder.push(1));
      const handler2 = vi.fn(() => callOrder.push(2));
      const handler3 = vi.fn(() => callOrder.push(3));
      
      bus.on('test-event', handler1);
      bus.on('test-event', handler2);
      bus.on('test-event', handler3);
      
      bus.emit('test-event');
      
      expect(callOrder).toEqual([1, 2, 3]);
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
    });

    it('should not invoke handlers for different events', () => {
      const bus = new EventBus();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      bus.on('event-1', handler1);
      bus.on('event-2', handler2);
      
      bus.emit('event-1');
      
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should do nothing when emitting event with no handlers', () => {
      const bus = new EventBus();
      
      // Should not throw
      expect(() => bus.emit('non-existent-event')).not.toThrow();
    });
  });

  describe('unsubscribe', () => {
    it('should return unsubscribe function from on()', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      
      const unsubscribe = bus.on('test-event', handler);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('should remove handler when unsubscribe is called', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      
      const unsubscribe = bus.on('test-event', handler);
      bus.emit('test-event');
      
      expect(handler).toHaveBeenCalledOnce();
      
      unsubscribe();
      bus.emit('test-event');
      
      // Should still be called only once (not twice)
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should only remove the specific handler', () => {
      const bus = new EventBus();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      const unsubscribe1 = bus.on('test-event', handler1);
      bus.on('test-event', handler2);
      
      unsubscribe1();
      bus.emit('test-event');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('should be safe to call unsubscribe multiple times', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      
      const unsubscribe = bus.on('test-event', handler);
      
      unsubscribe();
      unsubscribe();
      
      bus.emit('test-event');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should remove all event handlers', () => {
      const bus = new EventBus();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      bus.on('event-1', handler1);
      bus.on('event-2', handler2);
      
      bus.clear();
      
      bus.emit('event-1');
      bus.emit('event-2');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('instance isolation', () => {
    it('should maintain separate handlers for different EventBus instances', () => {
      const bus1 = new EventBus();
      const bus2 = new EventBus();
      
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      bus1.on('test-event', handler1);
      bus2.on('test-event', handler2);
      
      bus1.emit('test-event');
      
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).not.toHaveBeenCalled();
    });
  });
});
