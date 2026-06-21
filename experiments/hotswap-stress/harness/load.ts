import autocannon, { type Result } from 'autocannon';
import type { SwapTimeline, SwapPhase } from '../src/swap-timeline.js';

export interface FloodOptions {
  connections: number;
  duration: number; // seconds
}

/** Saturate the URL with autocannon; returns aggregate stats. */
export function flood(url: string, opts: FloodOptions): Promise<Result> {
  return autocannon({ url, connections: opts.connections, duration: opts.duration });
}

export interface Sample {
  status: number;
  body: unknown;
  t: number; // performance.now() at receipt
  phase: SwapPhase;
}

export interface VerifyOptions {
  durationMs: number;
  timeline: SwapTimeline;
  concurrency?: number; // default 8
}

/**
 * Concurrent fetch loop that records each response's body + receipt time +
 * swap phase. Unlike autocannon (aggregate only), this captures bodies so the
 * body-shape oracles (whole-v1-or-whole-v2, config-snapshot) can inspect them.
 */
export async function verify(url: string, opts: VerifyOptions): Promise<Sample[]> {
  const { durationMs, timeline, concurrency = 8 } = opts;
  const samples: Sample[] = [];
  const deadline = timeline.now() + durationMs;

  async function worker(): Promise<void> {
    while (timeline.now() < deadline) {
      try {
        const res = await fetch(url);
        const t = timeline.now();
        let body: unknown = null;
        try {
          body = await res.json();
        } catch {
          body = null; // non-JSON (e.g. error page) — recorded as null
        }
        samples.push({ status: res.status, body, t, phase: timeline.phaseAt(t) });
      } catch {
        // Connection-level failure (e.g. mid-restart). Record as status 0 so
        // the oracle can see it; phase classified at failure time.
        const t = timeline.now();
        samples.push({ status: 0, body: null, t, phase: timeline.phaseAt(t) });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return samples;
}
