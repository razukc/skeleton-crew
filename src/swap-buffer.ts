/**
 * Swap buffer — the read/write surface a new plugin version sees while its
 * setup runs during a hot-swap.
 *
 * The buffer records every write v2 makes (action / screen / service
 * registrations, services.unregister calls, event subscriptions) without
 * touching the live registries. If v2.setup throws, the buffer is dropped
 * and v1 — which has been serving the whole time — keeps running, untouched.
 * If v2.setup succeeds, {@link PluginRegistry.commitSwapBuffer} flips the
 * buffer's contents into the live registries in one synchronous batch.
 *
 * The `explicitlyRemoved` flag distinguishes "v2 never touched this id"
 * (it should fall through to live on reads, and be retired on commit if v1
 * owned it) from "v2 deliberately unregistered this id" (it should be
 * absent from buffered reads, and unregistered from live on commit if v1
 * owned it).
 *
 * @since 0.6.0
 */
export interface SwapBufferEntry<T> {
  /** The new definition v2 registered for this id. `undefined` after an explicit removal. */
  def: T | undefined;
  /**
   * True if v2 called the unregister callback (or services.unregister) for
   * this id during its own setup. The id is treated as absent for buffered
   * reads, and retired from live at commit if v1 owned it.
   */
  explicitlyRemoved: boolean;
}

import type { ActionDefinition, ScreenDefinition } from './types.js';

export interface SwapBuffer<TConfig = Record<string, unknown>> {
  actions: Map<string, SwapBufferEntry<ActionDefinition<unknown, unknown, TConfig>>>;
  screens: Map<string, SwapBufferEntry<ScreenDefinition>>;
  services: Map<string, SwapBufferEntry<unknown>>;
  /**
   * Event subscriptions queued by v2. NOT wired to the live EventBus during
   * v2.setup — committed at commit time so subscriptions never leak on a
   * failed setup. Events emitted by v2 during setup are NOT received by
   * v2's own handlers; this is documented in swapPlugin's docblock.
   */
  eventSubscriptions: Array<{ event: string; handler: (data: unknown) => void }>;
}

export function createSwapBuffer<TConfig = Record<string, unknown>>(): SwapBuffer<TConfig> {
  return {
    actions: new Map(),
    screens: new Map(),
    services: new Map(),
    eventSubscriptions: [],
  };
}
