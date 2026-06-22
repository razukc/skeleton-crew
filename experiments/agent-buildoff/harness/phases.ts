import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runAgent } from './agent-invoke.js';
import { createSandbox, type Sandbox } from './sandbox.js';
import { runOracles, summarize } from './oracle-runner.js';
import { ALL_ORACLES } from './oracles/index.js';
import type { Arm, FeatureRunMetrics } from './types.js';

// Anchor on the package root, NOT the compiled file's location. `npm run
// experiment` runs `node dist/harness/run.js`, so dirname(import.meta.url) is
// `dist/harness/` — a `..`-relative ROOT would land in `dist/` (wiped by tsc),
// where builder-prompt.md is absent and the arms are compiled .js, not the .ts
// the agent must edit. process.cwd() is the package root under every npm script.
// (Same anchoring fix the sibling hotswap-stress harness needed.)
const ROOT = process.cwd(); // experiments/agent-buildoff

/** Land the first repeat whose own feature oracles passed; null if none did. */
export function chooseLanding(runs: FeatureRunMetrics[]): FeatureRunMetrics | null {
  return runs.find((r) => r.featureOraclePass) ?? null;
}

export interface ParallelObservation { bothApplied: boolean; errorName: string; behaviorLost: boolean }
/** Classify a parallel-contention outcome. The bet: conflicts become
 *  loud-and-local (an attributable error OR a clean compose) rather than
 *  silent (a behavior silently lost with no error). */
export function classifyParallel(o: ParallelObservation): { cls: 'silent' | 'loud-and-local'; error: string } {
  if (o.behaviorLost && !o.errorName) return { cls: 'silent', error: '' };
  return { cls: 'loud-and-local', error: o.errorName };
}

const armDir = (arm: Arm): string => join(ROOT, arm === 'scr' ? 'scr-app' : 'mono-app');

const ARM_CONVENTION: Record<Arm, string> = {
  scr: 'Features are SCR plugins. Add a plugin file under `src/plugins/`, register it in `src/host.ts`, and add Fastify route shim(s) in `src/host.ts` that call `runtime.runAction`. Reach other features only via `ctx.services`, `ctx.actions.runAction`, and `ctx.events`. Record activity by calling the `activity:record` action; react via the `activity:recorded` event.',
  mono: 'Features are Fastify route modules. Add a `src/features/<name>.ts` exporting `register<Name>(app)` and wire it in `src/server.ts`. Share state via `src/store.ts`. Record activity by calling `recordActivity(kind, data)` from `src/store.ts`.',
};

/** Build the per-feature builder prompt from the template + spec + convention. */
export function buildPrompt(specPath: string, arm: Arm): string {
  const tmpl = readFileSync(join(ROOT, 'builder-prompt.md'), 'utf8');
  const spec = readFileSync(specPath, 'utf8');
  return tmpl.replace('{{FEATURE_SPEC}}', spec).replace('{{ARM_CONVENTION}}', ARM_CONVENTION[arm]);
}

/** git name-only diff of a sandbox's src vs the arm's src — the files touched.
 *  Uses `git diff --no-index` which works outside a repo and prints names. */
export function filesTouched(sandboxDir: string, arm: Arm): string[] {
  try {
    execFileSync('git', ['diff', '--no-index', '--name-only', join(armDir(arm), 'src'), join(sandboxDir, 'src')], { encoding: 'utf8' });
    return [];
  } catch (e: any) {
    // --no-index exits 1 when differences exist; stdout holds the names.
    const out: string = e?.stdout ?? '';
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  }
}

/**
 * One measurement run for (feature, arm): sandbox → agent build → typecheck-or-
 * skip → boot server → run full frozen oracle suite → metrics. The caller boots
 * the server via `bootArm`. Returns metrics; never throws (records ok=false).
 */
export async function measureRun(opts: {
  feature: string; arm: Arm; repeat: number; specPath: string;
  bootArm: (srcDir: string) => Promise<{ baseUrl: string; close: () => Promise<void> }>;
  claudeCommand?: string; claudeBaseArgs?: string[]; claudeExtraArgs?: string[];
}): Promise<{ metrics: FeatureRunMetrics; sandbox: Sandbox | null }> {
  // Honor the "never throws" contract for the WHOLE run: a missing spec file,
  // a failed sandbox copy, or a rejected agent invocation must record a failed
  // cell — never abort the surrounding K-repeat batch (one throw mid-run would
  // waste every token spent so far on the live experiment).
  let sandbox: Sandbox | null = null;
  let agent: FeatureRunMetrics['agent'];
  let touched: string[] = [];
  try {
    sandbox = createSandbox(armDir(opts.arm), join(ROOT, '.sandboxes', `${opts.arm}-${opts.feature}-${opts.repeat}`));
    agent = await runAgent({
      prompt: buildPrompt(opts.specPath, opts.arm),
      cwd: sandbox.dir,
      command: opts.claudeCommand,
      baseArgs: opts.claudeBaseArgs,
      extraArgs: opts.claudeExtraArgs ?? ['--permission-mode', 'acceptEdits', '--allowedTools', 'Read,Grep,Glob,Edit,Write,Bash'],
    });
    touched = filesTouched(sandbox.dir, opts.arm);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const failedAgent: FeatureRunMetrics['agent'] = {
      ok: false, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0,
      costUsd: 0, numTurns: 0, filesRead: [], readToolCalls: 0, sessionId: '',
    };
    const oracleResults: FeatureRunMetrics['oracleResults'] = [{ feature: opts.feature, name: 'setup', pass: false, detail }];
    const s = summarize(oracleResults, opts.feature);
    return {
      metrics: {
        feature: opts.feature, arm: opts.arm, repeat: opts.repeat, agent: failedAgent,
        filesTouched: [], oracleResults,
        featureOraclePass: s.featureOraclePass, foreignBreakage: s.foreignBreakage,
      },
      sandbox,
    };
  }

  let oracleResults: FeatureRunMetrics['oracleResults'] = [];
  try {
    const server = await opts.bootArm(join(sandbox.dir, 'src'));
    oracleResults = await runOracles(server.baseUrl, ALL_ORACLES);
    await server.close();
  } catch (err) {
    oracleResults = [{ feature: opts.feature, name: 'boot', pass: false, detail: err instanceof Error ? err.message : String(err) }];
  }

  const s = summarize(oracleResults, opts.feature);
  const metrics: FeatureRunMetrics = {
    feature: opts.feature, arm: opts.arm, repeat: opts.repeat, agent,
    filesTouched: touched, oracleResults,
    featureOraclePass: s.featureOraclePass, foreignBreakage: s.foreignBreakage,
  };
  return { metrics, sandbox };
}
