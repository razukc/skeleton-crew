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
 *  -1 if SCR never overtakes within the series. Series must be equal length. */
export function crossoverIndex(scrPerFeature: number[], monoPerFeature: number[]): number {
  const scr = cumulative(scrPerFeature);
  const mono = cumulative(monoPerFeature);
  const n = Math.min(scr.length, mono.length);
  for (let i = 0; i < n; i++) {
    if (scr[i] < mono[i]) return i;
  }
  return -1;
}
