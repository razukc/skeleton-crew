/** Median of a series. An empty series (e.g. every repeat of a feature failed
 *  to build) has no meaningful value and returns 0 — callers render that as a
 *  missing cell, and crossoverIndex() treats <=0 rows as non-builds. */
export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

export function spread(xs: number[]): number {
  if (xs.length === 0) return 0;
  return Math.max(...xs) - Math.min(...xs);
}

export function cumulative(xs: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const x of xs) {
    acc += x;
    out.push(acc);
  }
  return out;
}

/** First feature index (0-based) where SCR cumulative cost drops below mono's.
 *  -1 if SCR never overtakes within the series. Series must be equal length.
 *
 *  A feature whose per-feature value is <= 0 for either arm is a missing/failed
 *  build (no tokens recorded), NOT a free build. Such a feature is *excluded
 *  from the cumulative entirely* — for BOTH arms — so the running totals stay
 *  apples-to-apples. This matters more than just refusing to return at the
 *  sentinel index: folding a 0 into the cumulative would permanently understate
 *  SCR's cost for every later feature, merely shifting the false crossover one
 *  feature downstream (the f2 timeout would otherwise fabricate a crossover at
 *  f3). Skipping the unmeasurable feature on both sides avoids that. */
export function crossoverIndex(scrPerFeature: number[], monoPerFeature: number[]): number {
  const n = Math.min(scrPerFeature.length, monoPerFeature.length);
  let scrAcc = 0;
  let monoAcc = 0;
  for (let i = 0; i < n; i++) {
    const s = scrPerFeature[i];
    const m = monoPerFeature[i];
    if (s <= 0 || m <= 0) continue; // unmeasurable feature — exclude from both cumulatives
    scrAcc += s;
    monoAcc += m;
    if (scrAcc < monoAcc) return i;
  }
  return -1;
}
