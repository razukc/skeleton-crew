import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { renderResults, type ExperimentResults, type PerFeatureRow } from './report.js';
import { collidingRegistrationOutcome, throwingHotspotContained } from './faults.js';
import {
  measureRun, chooseLanding, bootSandboxArm, classifyParallel, parallelObserve,
} from './phases.js';
import { landSandbox } from './sandbox.js';
import { median, crossoverIndex } from './metrics.js';
import type { Arm, FeatureRunMetrics } from './types.js';

// Anchor on the package root: `npm run experiment` runs `node dist/harness/run.js`,
// so the compiled file lives in dist/ — a `..`-relative ROOT would write RESULTS.md
// into dist/ (wiped by the next build). process.cwd() is the package root under npm.
const ROOT = process.cwd();
const BACKLOG_DIR = join(ROOT, 'backlog');
const armRoot = (arm: Arm): string => join(ROOT, arm === 'scr' ? 'scr-app' : 'mono-app');

const BACKLOG = [
  { feature: 'f1', spec: 'f1-comments.md' },
  { feature: 'f2', spec: 'f2-mentions.md' },
  { feature: 'f3', spec: 'f3-assignment.md' },
  { feature: 'f4', spec: 'f4-notifications.md' },
  { feature: 'f5', spec: 'f5-tags.md' },
  { feature: 'f6', spec: 'f6-search.md' },
  { feature: 'f7', spec: 'f7-reactions.md' },
  { feature: 'f8', spec: 'f8-digest.md' },
];
const K = 3;

const ARMS: Arm[] = ['scr', 'mono'];

/** Count foreign-feature oracle failures restricted to features ALREADY built
 *  (a regression signal), not summarize()'s absolute (which is dominated by
 *  not-yet-built features and would swamp the metric in early features). */
function foreignRegressions(m: FeatureRunMetrics, builtFeatures: Set<string>): number {
  return m.oracleResults.filter(
    (o) => o.feature !== m.feature && builtFeatures.has(o.feature) && !o.pass,
  ).length;
}

interface ArmFeatureResult { tokens: number[]; surface: number[]; foreign: number[]; landed: boolean }

/** Build one feature in one arm: K sandboxed attempts, land the first that
 *  passes its own oracles onto the arm so the next feature builds atop it. */
async function buildFeatureInArm(
  feature: string, specPath: string, arm: Arm, builtFeatures: Set<string>,
): Promise<ArmFeatureResult> {
  const runs: FeatureRunMetrics[] = [];
  const sandboxes: (import('./sandbox.js').Sandbox | null)[] = [];
  for (let r = 0; r < K; r++) {
    const { metrics, sandbox } = await measureRun({
      feature, arm, repeat: r, specPath,
      bootArm: (srcDir) => bootSandboxArm(arm, srcDir),
    });
    runs.push(metrics);
    sandboxes.push(sandbox);
    console.log(`    [${arm}] ${feature} repeat ${r}: ok=${metrics.agent.ok} oraclePass=${metrics.featureOraclePass} tokens=${metrics.agent.inputTokens + metrics.agent.outputTokens} reads=${metrics.agent.readToolCalls}`);
  }

  const chosen = chooseLanding(runs);
  if (chosen) {
    // chooseLanding returns a run object; find its sandbox by identity, not by
    // assuming repeat === array index.
    const idx = runs.indexOf(chosen);
    const chosenSandbox = sandboxes[idx];
    if (chosenSandbox) landSandbox(chosenSandbox.dir, armRoot(arm));
  }
  sandboxes.forEach((s) => s?.cleanup());

  return {
    tokens: runs.map((x) => x.agent.inputTokens + x.agent.outputTokens),
    surface: runs.map((x) => x.agent.readToolCalls),
    foreign: runs.map((x) => foreignRegressions(x, builtFeatures)),
    landed: chosen !== null,
  };
}

async function runSequential(): Promise<{ perFeature: PerFeatureRow[]; crossover: number; landedByArm: Record<Arm, Set<string>> }> {
  const perArm: Record<Arm, Map<string, ArmFeatureResult>> = { scr: new Map(), mono: new Map() };
  const builtByArm: Record<Arm, Set<string>> = { scr: new Set(['members', 'tasks', 'activity']), mono: new Set(['members', 'tasks', 'activity']) };

  for (const { feature, spec } of BACKLOG) {
    for (const arm of ARMS) {
      console.log(`  Phase 1 — ${arm}/${feature}`);
      const res = await buildFeatureInArm(feature, join(BACKLOG_DIR, spec), arm, builtByArm[arm]);
      perArm[arm].set(feature, res);
      if (res.landed) builtByArm[arm].add(feature);
    }
  }

  const perFeature: PerFeatureRow[] = BACKLOG.map(({ feature }) => {
    const s = perArm.scr.get(feature)!;
    const m = perArm.mono.get(feature)!;
    return {
      feature,
      scrTokensMedian: Math.round(median(s.tokens)),
      monoTokensMedian: Math.round(median(m.tokens)),
      scrSurface: Math.round(median(s.surface)),
      monoSurface: Math.round(median(m.surface)),
      scrForeignBreak: Math.max(...s.foreign, 0),
      monoForeignBreak: Math.max(...m.foreign, 0),
    };
  });

  const crossover = crossoverIndex(
    perFeature.map((f) => f.scrTokensMedian),
    perFeature.map((f) => f.monoTokensMedian),
  );
  return { perFeature, crossover, landedByArm: builtByArm };
}

/** Phase 2: apply modify.md once per arm against the full post-backlog app.
 *  Blast radius = files touched outside the target (tasks) feature + foreign
 *  oracle breaks among already-built features. */
async function runModification(landedByArm: Record<Arm, Set<string>>): Promise<ExperimentResults['modification']> {
  const out: ExperimentResults['modification'] = { scrFilesOutsideTarget: 0, monoFilesOutsideTarget: 0, scrForeignBreak: 0, monoForeignBreak: 0 };
  for (const arm of ARMS) {
    console.log(`  Phase 2 — ${arm}/modify`);
    const { metrics } = await measureRun({
      feature: 'tasks', arm, repeat: 0, specPath: join(BACKLOG_DIR, 'modify.md'),
      bootArm: (srcDir) => bootSandboxArm(arm, srcDir),
    });
    // files touched outside the target feature's own file(s)
    const targetMarker = arm === 'scr' ? 'tasks-plugin' : 'features/tasks';
    const outside = metrics.filesTouched.filter((f) => !f.includes(targetMarker)).length;
    const foreign = foreignRegressions(metrics, landedByArm[arm]);
    if (arm === 'scr') { out.scrFilesOutsideTarget = outside; out.scrForeignBreak = foreign; }
    else { out.monoFilesOutsideTarget = outside; out.monoForeignBreak = foreign; }
  }
  return out;
}

async function runParallel(): Promise<ExperimentResults['parallel']> {
  const out: ExperimentResults['parallel'] = { scrClass: '—', monoClass: '—', scrError: '', monoError: '' };
  for (const arm of ARMS) {
    console.log(`  Phase 3 — ${arm}/parallel`);
    const o = await parallelObserve({
      arm,
      specPathA: join(BACKLOG_DIR, 'parallel-a.md'),
      specPathB: join(BACKLOG_DIR, 'parallel-b.md'),
      bootArm: (srcDir) => bootSandboxArm(arm, srcDir),
    });
    const c = classifyParallel(o.observation);
    console.log(`    [${arm}] overlap=${JSON.stringify(o.overlap)} preExisting=${JSON.stringify(o.preExistingOverlap)} → ${c.cls}`);
    if (arm === 'scr') { out.scrClass = c.cls; out.scrError = c.error; }
    else { out.monoClass = c.cls; out.monoError = c.error; }
  }
  return out;
}

/** Hand-map each pre-registered prediction to the observed metric. */
function scorePredictions(r: Omit<ExperimentResults, 'predictions'>): ExperimentResults['predictions'] {
  const first = r.perFeature[0];
  const last = r.perFeature[r.perFeature.length - 1];
  const scrSurfaceFlat = r.perFeature.length > 1
    ? Math.abs(r.perFeature[0].scrSurface - last.scrSurface) <= 2 : true;
  const monoSurfaceGrows = r.perFeature.length > 1
    ? last.monoSurface > r.perFeature[0].monoSurface : false;
  return [
    { claim: 'SCR tokens/feature at f1 HIGHER than mono', predicted: 'yes',
      observed: first ? (first.scrTokensMedian > first.monoTokensMedian ? 'yes' : 'no') : 'n/a',
      hit: !!first && first.scrTokensMedian > first.monoTokensMedian },
    { claim: 'SCR tokens/feature by f8 LOWER than mono', predicted: 'yes',
      observed: last ? (last.scrTokensMedian < last.monoTokensMedian ? 'yes' : 'no') : 'n/a',
      hit: !!last && last.scrTokensMedian < last.monoTokensMedian },
    { claim: 'Cost crossover index exists (f3–f6)', predicted: 'yes',
      observed: r.crossoverIndex >= 0 ? `index ${r.crossoverIndex}` : 'none',
      hit: r.crossoverIndex >= 0 },
    { claim: 'SCR read-surface roughly FLAT in N', predicted: 'yes',
      observed: scrSurfaceFlat ? 'flat' : 'grows', hit: scrSurfaceFlat },
    { claim: 'Mono read-surface GROWS in N', predicted: 'yes',
      observed: monoSurfaceGrows ? 'grows' : 'flat', hit: monoSurfaceGrows },
    { claim: 'Modification files-outside-target: SCR < mono', predicted: 'yes',
      observed: `scr ${r.modification.scrFilesOutsideTarget} / mono ${r.modification.monoFilesOutsideTarget}`,
      hit: r.modification.scrFilesOutsideTarget < r.modification.monoFilesOutsideTarget },
    { claim: 'Modification foreign breaks: SCR 0, mono > 0', predicted: 'yes',
      observed: `scr ${r.modification.scrForeignBreak} / mono ${r.modification.monoForeignBreak}`,
      hit: r.modification.scrForeignBreak === 0 && r.modification.monoForeignBreak > 0 },
    { claim: 'Parallel: SCR loud-and-local, mono silent', predicted: 'yes',
      observed: `scr ${r.parallel.scrClass} / mono ${r.parallel.monoClass}`,
      hit: r.parallel.scrClass === 'loud-and-local' && r.parallel.monoClass === 'silent' },
    { claim: 'Fault containment: SCR contains both', predicted: 'yes',
      observed: r.faults.collidingRejected && r.faults.throwContained ? 'yes' : 'no',
      hit: r.faults.collidingRejected && r.faults.throwContained },
  ];
}

/**
 * Live experiment entry. Phases 1–3 invoke the real `claude` CLI and are
 * token-expensive; Phase 4 is deterministic. This shell runs Phase 4 always and
 * gates the live phases behind --live so `npm run experiment` is safe to smoke
 * without spending tokens.
 */
export async function main(argv: string[]): Promise<number> {
  const live = argv.includes('--live');

  // Phase 4 (deterministic) — always run.
  const colliding = await collidingRegistrationOutcome();
  const thrown = await throwingHotspotContained();

  const results: ExperimentResults = {
    model: process.env.BUILDOFF_MODEL ?? 'claude-opus-4-8',
    repeats: K,
    perFeature: [],
    crossoverIndex: -1,
    modification: { scrFilesOutsideTarget: 0, monoFilesOutsideTarget: 0, scrForeignBreak: 0, monoForeignBreak: 0 },
    parallel: { scrClass: '—', monoClass: '—', scrError: '', monoError: '' },
    faults: { collidingRejected: colliding.rejected && colliding.errorName === 'DuplicateRegistrationError', throwContained: thrown.callerThrew && thrown.runtimeAlive },
    predictions: [],
  };

  if (live) {
    console.log('Phase 1 — sequential build-off (live, token-expensive)…');
    const seq = await runSequential();
    results.perFeature = seq.perFeature;
    results.crossoverIndex = seq.crossover;

    console.log('Phase 2 — modification blast radius…');
    results.modification = await runModification(seq.landedByArm);

    console.log('Phase 3 — parallel contention…');
    results.parallel = await runParallel();

    results.predictions = scorePredictions(results);
  } else {
    // Smoke mode: still score predictions (Phase 4 + empty phases) so the
    // scorecard renders without spending tokens.
    results.predictions = scorePredictions(results);
  }

  const md = renderResults(results);
  const out = join(ROOT, 'RESULTS.md');
  writeFileSync(out, md, 'utf8');
  console.log(`Wrote ${out}`);
  return 0;
}

const isDirect = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirect) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
}
