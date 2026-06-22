import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { StressConfig, Store } from '../types.js';
import { createStore } from '../types.js';

// The store service is the single source of truth for posts/comments.
// Registered under the name 'store' so posts/comments plugins can resolve it.

export const storePluginV1: PluginDefinition<StressConfig> = {
  name: 'store',
  version: '1.0.0',
  setup(ctx: RuntimeContext<StressConfig>) {
    ctx.services.register<Store>('store', createStore());
  },
  dispose(ctx: RuntimeContext<StressConfig>) {
    ctx.services.unregister('store');
  },
};

// v2 re-registers 'store' (carrying the existing data forward) and ALSO
// unregisters it in dispose. Because v1.dispose runs after commit, a naive
// by-name unregister would delete v2's freshly-registered store. The runtime's
// post-swap dispose guard (Finding 1) must prevent that.
export const storePluginV2: PluginDefinition<StressConfig> = {
  name: 'store',
  version: '1.0.1',
  setup(ctx: RuntimeContext<StressConfig>) {
    // Carry forward existing data if present, else seed fresh.
    const existing = ctx.services.has('store') ? ctx.services.get<Store>('store') : createStore();
    ctx.services.register<Store>('store', existing);
  },
  dispose(ctx: RuntimeContext<StressConfig>) {
    ctx.services.unregister('store');
  },
};
