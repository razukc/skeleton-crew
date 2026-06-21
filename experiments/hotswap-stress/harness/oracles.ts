import type { Sample } from './load.js';

export interface Verdict {
  pass: boolean;
  detail: string;
}

/** True server errors (5xx) or connection failures (status 0) are failures.
 *  404s are ordinary and ignored. Only mid/post-phase samples are judged —
 *  a pre-swap blip is harness noise. */
export function oracleNoServerErrors(samples: Sample[]): Verdict {
  const bad = samples.filter(
    (s) => (s.status >= 500 || s.status === 0) && s.phase !== 'pre',
  );
  return {
    pass: bad.length === 0,
    detail: bad.length === 0
      ? `0 server errors across ${samples.length} samples`
      : `${bad.length} server-error samples (e.g. status ${bad[0].status} in phase ${bad[0].phase})`,
  };
}

/** Every list response must be uniformly v1 (no tag) or v2 (all tagged) —
 *  never a mix within a single response body. */
export function oracleWholeShape(samples: Sample[]): Verdict {
  for (const s of samples) {
    if (!Array.isArray(s.body)) continue;
    const arr = s.body as Array<{ tag?: string }>;
    if (arr.length === 0) continue;
    const tagged = arr.filter((p) => p.tag === 'v2').length;
    if (tagged !== 0 && tagged !== arr.length) {
      return {
        pass: false,
        detail: `torn response: ${tagged}/${arr.length} posts tagged v2 in phase ${s.phase}`,
      };
    }
  }
  return { pass: true, detail: `all ${samples.length} responses whole (uniform v1 or v2)` };
}

/** validateConfig and setup must have observed the same pageSize snapshot. */
export function oracleConfigSnapshot(probe: { validated?: number; setup?: number }): Verdict {
  const pass = probe.validated !== undefined && probe.validated === probe.setup;
  return {
    pass,
    detail: pass
      ? `config snapshot stable: pageSize=${probe.validated} at both validate and setup`
      : `config skew: validate saw ${probe.validated}, setup saw ${probe.setup}`,
  };
}
