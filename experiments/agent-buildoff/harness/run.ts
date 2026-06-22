import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { renderResults, type ExperimentResults } from './report.js';
import { collidingRegistrationOutcome, throwingHotspotContained } from './faults.js';

// Anchor on the package root: `npm run experiment` runs `node dist/harness/run.js`,
// so the compiled file lives in dist/ — a `..`-relative ROOT would write RESULTS.md
// into dist/ (wiped by the next build). process.cwd() is the package root under npm.
const ROOT = process.cwd();

/**
 * Live experiment entry. Phases 1–3 invoke the real `claude` CLI and are
 * token-expensive; Phase 4 is deterministic. This shell runs Phase 4 always and
 * gates the live phases behind --live so `npm run experiment` is safe to smoke
 * without spending tokens. The full live wiring is finalized in Task 14.
 */
export async function main(argv: string[]): Promise<number> {
  const live = argv.includes('--live');

  // Phase 4 (deterministic) — always run.
  const colliding = await collidingRegistrationOutcome();
  const thrown = await throwingHotspotContained();

  // Live phases populate these; smoke mode leaves them empty/zero.
  const results: ExperimentResults = {
    model: process.env.BUILDOFF_MODEL ?? 'claude-opus-4-8',
    repeats: 3,
    perFeature: [],
    crossoverIndex: -1,
    modification: { scrFilesOutsideTarget: 0, monoFilesOutsideTarget: 0, scrForeignBreak: 0, monoForeignBreak: 0 },
    parallel: { scrClass: '—', monoClass: '—', scrError: '', monoError: '' },
    faults: { collidingRejected: colliding.rejected && colliding.errorName === 'DuplicateRegistrationError', throwContained: thrown.callerThrew && thrown.runtimeAlive },
    predictions: [],
  };

  if (live) {
    // Task 14 fills in: sequential build-off, modification, parallel phases.
    console.log('Live phases run in Task 14 wiring.');
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
