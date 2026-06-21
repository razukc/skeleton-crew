import autocannon, { type Result } from 'autocannon';
import type { SwapTimeline, SwapPhase } from '../src/swap-timeline.js';

export interface FloodOptions {
  connections: number;
  duration: number; // seconds
}

/** Per-request timeout for the verify sampler. A stalled request becomes a
 *  status-0 sample instead of blocking a worker past the run duration. */
const REQUEST_TIMEOUT_MS = 2000;
/** Backoff after a failed request so a server-down window can't spin hot. */
const FAILURE_BACKOFF_MS = 5;

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
      let res: Response;
      try {
        // Per-request timeout: a request that stalls mid-swap (exactly the
        // window this harness provokes) must not block the worker past the
        // run. AbortSignal.timeout rejects the fetch, surfacing as a status-0
        // sample rather than a hang.
        res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      } catch {
        // Connection-level failure or timeout (e.g. mid-restart). Record as
        // status 0 so the oracle can see it; phase classified at failure time.
        const t = timeline.now();
        samples.push({ status: 0, body: null, t, phase: timeline.phaseAt(t) });
        // Brief pause so a sustained server-down window can't spin hot and
        // balloon the sample array; backs off without distorting the signal.
        await new Promise((resolve) => setTimeout(resolve, FAILURE_BACKOFF_MS));
        continue;
      }
      // Body parse is the only thing that may fail benignly; the push below is
      // deliberately OUTSIDE the catch above so a bug here surfaces rather than
      // being mis-recorded as a connection failure.
      const t = timeline.now();
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null; // non-JSON (e.g. error page) — recorded as null
      }
      samples.push({ status: res.status, body, t, phase: timeline.phaseAt(t) });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return samples;
}
