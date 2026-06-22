export interface PerFeatureRow {
  feature: string;
  scrTokensMedian: number; monoTokensMedian: number;
  scrSurface: number; monoSurface: number;
  scrForeignBreak: number; monoForeignBreak: number;
}

export interface ExperimentResults {
  model: string;
  repeats: number;
  perFeature: PerFeatureRow[];
  crossoverIndex: number; // -1 = none
  modification: { scrFilesOutsideTarget: number; monoFilesOutsideTarget: number; scrForeignBreak: number; monoForeignBreak: number };
  parallel: { scrClass: string; monoClass: string; scrError: string; monoError: string };
  faults: { collidingRejected: boolean; throwContained: boolean };
  predictions: Array<{ claim: string; predicted: string; observed: string; hit: boolean }>;
}

export function renderResults(r: ExperimentResults): string {
  const rows = r.perFeature.map((f) =>
    `| ${f.feature} | ${f.scrTokensMedian} | ${f.monoTokensMedian} | ${f.scrSurface} | ${f.monoSurface} | ${f.scrForeignBreak} | ${f.monoForeignBreak} |`
  ).join('\n');

  const crossover = r.crossoverIndex < 0
    ? `**no crossover** within ${r.perFeature.length} features — SCR's overhead did not amortize at this app size.`
    : `**Crossover at feature index ${r.crossoverIndex}** (\`${r.perFeature[r.crossoverIndex]?.feature}\`): SCR cumulative cost drops below the monolith here.`;

  const preds = r.predictions.map((p) =>
    `| ${p.claim} | ${p.predicted} | ${p.observed} | ${p.hit ? '✅' : '❌'} |`
  ).join('\n');

  return `# Agent Build-Off — Results

Model: \`${r.model}\` · repeats (Phase 1): ${r.repeats} · tokens are medians over repeats.

## Phase 1 — Sequential build-off (per feature)

| Feature | SCR tokens | Mono tokens | SCR read-surface | Mono read-surface | SCR foreign-break | Mono foreign-break |
|---|---|---|---|---|---|---|
${rows}

${crossover}

## Phase 2 — Modification blast radius

| Arm | Files touched outside target | Foreign oracle breaks |
|---|---|---|
| SCR | ${r.modification.scrFilesOutsideTarget} | ${r.modification.scrForeignBreak} |
| Mono | ${r.modification.monoFilesOutsideTarget} | ${r.modification.monoForeignBreak} |

## Phase 3 — Parallel contention on the hotspot

| Arm | Outcome class | Attributable error |
|---|---|---|
| SCR | ${r.parallel.scrClass} | ${r.parallel.scrError || '—'} |
| Mono | ${r.parallel.monoClass} | ${r.parallel.monoError || '—'} |

## Phase 4 — Fault containment (deterministic)

- Colliding registration rejected loudly by SCR: ${r.faults.collidingRejected ? '✅' : '❌'}
- Throwing hotspot write contained to caller: ${r.faults.throwContained ? '✅' : '❌'}

## Predictions (pre-registered)

| Claim | Predicted | Observed | Hit |
|---|---|---|---|
${preds}

> A null or pro-monolith result is a valid finding. Read this as a *trend* over
> a single K-repeated run, not a statistical proof. Phases 1–3 are
> non-deterministic; Phase 4 is deterministic.
`;
}
