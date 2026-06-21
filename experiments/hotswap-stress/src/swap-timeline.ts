import { performance } from 'node:perf_hooks';

export type SwapPhase = 'pre' | 'mid' | 'post';

export interface SwapMark {
  label: string;
  t: number; // performance.now() ms
}

/**
 * Records high-resolution timestamps around a swap so a sampled request can be
 * attributed to a phase: pre (before swap:start), mid (between swap:start and
 * commit), or post (at/after commit). 'commit' is the boundary that matters —
 * an in-flight request that started mid-window but the swap committed under it
 * is the adversarial case.
 */
export class SwapTimeline {
  private _marks: SwapMark[] = [];

  now(): number {
    return performance.now();
  }

  mark(label: string): void {
    this._marks.push({ label, t: performance.now() });
  }

  marks(): readonly SwapMark[] {
    return this._marks;
  }

  startedAt(): number {
    const start = this._marks.find((m) => m.label === 'swap:start');
    return start ? start.t : Infinity;
  }

  private committedAt(): number {
    const commit = this._marks.find((m) => m.label === 'commit');
    return commit ? commit.t : Infinity;
  }

  phaseAt(t: number): SwapPhase {
    if (t < this.startedAt()) return 'pre';
    if (t < this.committedAt()) return 'mid';
    return 'post';
  }
}
