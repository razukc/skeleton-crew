import type { Sample } from './load.js';

export interface Verdict {
  pass: boolean;
  detail: string;
}

/** A sample is a server error if it's a 5xx or a connection failure (status 0),
 *  and it landed in the swap window (not the pre-swap warmup). Shared by the
 *  oracle and the per-scenario serverErrors tally so the two can't diverge. */
export function isServerError(s: Sample): boolean {
  return (s.status >= 500 || s.status === 0) && s.phase !== 'pre';
}

/** True server errors (5xx) or connection failures (status 0) are failures.
 *  404s are ordinary and ignored. Only mid/post-phase samples are judged —
 *  a pre-swap blip is harness noise. */
export function oracleNoServerErrors(samples: Sample[]): Verdict {
  const bad = samples.filter(isServerError);
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

/** Every successful (200) list response must be a JSON array. A cross-plugin
 *  hijack that committed would return a scalar (e.g. the string 'HIJACK') with
 *  status 200 — invisible to the 5xx check, caught here. Non-200 samples (404
 *  error objects, status-0 failures) are out of scope and ignored. */
export function oracleListIsArray(samples: Sample[]): Verdict {
  const bad = samples.find((s) => s.status === 200 && !Array.isArray(s.body));
  return {
    pass: !bad,
    detail: bad
      ? `non-array 200 body in phase ${bad.phase}: ${JSON.stringify(bad.body)}`
      : `all ${samples.length} successful responses are arrays`,
  };
}

/** No response body may contain a v2-tagged post. The invariant for a swap that
 *  must NOT take effect (a throwing swap that rolls back): the live response set
 *  stays uniformly v1. Distinct from oracleWholeShape, which also passes when
 *  every response is v2 — wrong for a swap expected to be rejected. */
export function oracleAllV1(samples: Sample[]): Verdict {
  for (const s of samples) {
    if (!Array.isArray(s.body)) continue;
    const arr = s.body as Array<{ tag?: string }>;
    const taggedV2 = arr.find((p) => p.tag === 'v2');
    if (taggedV2) {
      return {
        pass: false,
        detail: `v2-tagged post leaked into a live response in phase ${s.phase} (swap should have rolled back)`,
      };
    }
  }
  return { pass: true, detail: `all ${samples.length} responses uniformly v1 (no v2 tags)` };
}
