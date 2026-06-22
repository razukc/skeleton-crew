import { readFileSync, readdirSync, statSync, existsSync, cpSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
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

/** Default per-build wall-clock cap. The single-build probe took ~3.4 min; 10
 *  min leaves generous headroom while guaranteeing a hung build can't block the
 *  ~54-build batch indefinitely (the failure mode that lost the first run). */
export const DEFAULT_BUILD_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * A scrubbed environment for builder agents. The parent session injects a
 * SessionStart superpowers hook and MCP servers via CLAUDE_CODE / settings env
 * vars; a spawned builder that inherits them drags in unrelated machinery
 * (proven to spawn context7/runtime MCP servers and likely contributed to the
 * first run's hang) and pollutes the builder's instructions. Strip the
 * session-scoped vars but keep PATH, auth, and the gateway base URL so the
 * headless call still authenticates.
 */
export function builderEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of Object.keys(env)) {
    if (/^CLAUDE_CODE_|^CLAUDECODE$|^CLAUDE_EFFORT$|^AI_AGENT$|^CLAUDE_CODE_SESSION_ID$/.test(k)) {
      // Keep CLAUDE_CODE_EXECPATH (we need the binary) and the git-bash path.
      if (k === 'CLAUDE_CODE_EXECPATH' || k === 'CLAUDE_CODE_GIT_BASH_PATH') continue;
      delete env[k];
    }
  }
  return env;
}

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

/** Files the agent changed in the sandbox vs the arm's src, as clean relative
 *  paths (e.g. `features/comments.ts`). Uses a direct tree diff rather than
 *  `git diff --no-index`, which C-quotes absolute Windows paths into unusable
 *  `'"C:\\..."'` strings and breaks downstream "outside-target" matching. */
export function filesTouched(sandboxDir: string, arm: Arm): string[] {
  return changedFiles(join(armDir(arm), 'src'), join(sandboxDir, 'src'));
}

/** Recursively list files under `dir`, returned as paths relative to `dir`. */
function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(dir, full).split('\\').join('/'));
    }
  };
  walk(dir);
  return out;
}

/** Files that differ (content or presence) between two src trees, as relative
 *  paths. Used to detect whether two parallel builds collided on the same file. */
export function changedFiles(baseSrc: string, otherSrc: string): string[] {
  const names = new Set([...listFiles(baseSrc), ...listFiles(otherSrc)]);
  const changed: string[] = [];
  for (const n of names) {
    const a = join(baseSrc, n);
    const b = join(otherSrc, n);
    const aEx = existsSync(a);
    const bEx = existsSync(b);
    if (aEx !== bEx) { changed.push(n); continue; }
    if (aEx && bEx && readFileSync(a, 'utf8') !== readFileSync(b, 'utf8')) changed.push(n);
  }
  return changed.sort();
}

export interface ParallelOutcome {
  arm: Arm;
  changedA: string[];
  changedB: string[];
  overlap: string[];          // files BOTH builds edited — the contention surface
  preExistingOverlap: string[]; // overlap files that already existed at base (a real clobber risk)
  observation: ParallelObservation;
}

/**
 * Phase 3: build parallel-a and parallel-b independently off the SAME landed
 * arm (neither sees the other), then judge the contention structurally.
 *
 * The bet, made concrete: a *silent* clobber happens when both features had to
 * edit the SAME pre-existing source file (overlaying one loses the other's edits
 * with no error). A *loud-and-local* outcome happens when they land on separate
 * registered seams (disjoint files = clean compose) or a registration collision
 * throws an attributable error. We do NOT have frozen oracles for the parallel
 * features, so the signal is the file-collision surface plus any boot/registration
 * error — exactly the architectural property SCR forces, observed honestly.
 */
export async function parallelObserve(opts: {
  arm: Arm; specPathA: string; specPathB: string;
  bootArm: (srcDir: string) => Promise<{ baseUrl: string; close: () => Promise<void> }>;
  claudeCommand?: string; claudeBaseArgs?: string[]; claudeExtraArgs?: string[];
}): Promise<ParallelOutcome> {
  const baseSrc = join(armDir(opts.arm), 'src');
  const common = { arm: opts.arm, bootArm: opts.bootArm, claudeCommand: opts.claudeCommand, claudeBaseArgs: opts.claudeBaseArgs, claudeExtraArgs: opts.claudeExtraArgs };

  const a = await measureRun({ ...common, feature: 'parallel-a', repeat: 0, specPath: opts.specPathA });
  const b = await measureRun({ ...common, feature: 'parallel-b', repeat: 0, specPath: opts.specPathB });

  const srcA = a.sandbox ? join(a.sandbox.dir, 'src') : baseSrc;
  const srcB = b.sandbox ? join(b.sandbox.dir, 'src') : baseSrc;
  const changedA = changedFiles(baseSrc, srcA);
  const changedB = changedFiles(baseSrc, srcB);
  const overlap = changedA.filter((f) => changedB.includes(f));
  const baseFiles = new Set(listFiles(baseSrc));
  const preExistingOverlap = overlap.filter((f) => baseFiles.has(f));

  // Attempt to compose: copy A's changed files then B's changed files onto a
  // fresh copy of the base, build + boot, capture any attributable error.
  let errorName = '';
  const composed = createSandbox(armDir(opts.arm), join(ROOT, '.sandboxes', `${opts.arm}-parallel-composed`));
  try {
    for (const f of changedA) cpSync(join(srcA, f), join(composed.dir, 'src', f));
    for (const f of changedB) cpSync(join(srcB, f), join(composed.dir, 'src', f));
    const server = await opts.bootArm(join(composed.dir, 'src'));
    await server.close();
  } catch (err) {
    errorName = err instanceof Error ? err.name : 'BootError';
    if (/duplicate/i.test(err instanceof Error ? err.message : '')) errorName = 'DuplicateRegistrationError';
  } finally {
    composed.cleanup();
    a.sandbox?.cleanup();
    b.sandbox?.cleanup();
  }

  // behaviorLost: both rewrote a shared pre-existing file and nothing threw —
  // the later overlay silently won, the earlier feature's edits are gone.
  const behaviorLost = preExistingOverlap.length > 0 && !errorName;
  return {
    arm: opts.arm, changedA, changedB, overlap, preExistingOverlap,
    observation: { bothApplied: !errorName, errorName, behaviorLost },
  };
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
  timeoutMs?: number;
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
      timeoutMs: opts.timeoutMs ?? DEFAULT_BUILD_TIMEOUT_MS,
      env: builderEnv(),
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

/**
 * Compile a sandbox's src with the arm's tsconfig and dynamic-import the built
 * server, returning a listening base URL + close fn. Throws if the agent's code
 * does not compile (the caller records that as a failed run). The cache-busting
 * `?t=` query forces a fresh module each boot so a re-landed arm isn't stale.
 *
 * Note: imports build a proper file URL via pathToFileURL — a bare
 * `file://${winPath}` is malformed on Windows (drive-letter + backslashes).
 */
export async function bootSandboxArm(arm: Arm, sandboxSrcDir: string): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const sandboxRoot = dirname(sandboxSrcDir);
  const distDir = join(sandboxRoot, 'dist');
  const tsc = spawnSync('npx', ['tsc', '-p', join(sandboxRoot, 'tsconfig.json')], { encoding: 'utf8', shell: true });
  if (tsc.status !== 0) throw new Error(`sandbox tsc failed: ${tsc.stdout}\n${tsc.stderr}`);

  // performance.now() (not Date.now) — monotonic, unique per call, cache-busts import.
  const bust = `?t=${globalThis.performance.now()}`;
  if (arm === 'mono') {
    const serverUrl = pathToFileURL(join(distDir, 'server.js')).href + bust;
    const storeUrl = pathToFileURL(join(distDir, 'store.js')).href + bust;
    const mod = await import(serverUrl);
    const store = await import(storeUrl);
    store.resetStore?.();
    const app = mod.buildMonoServer();
    const baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
    return { baseUrl, close: () => app.close() };
  }
  const hostUrl = pathToFileURL(join(distDir, 'host.js')).href + bust;
  const mod = await import(hostUrl);
  const { app, runtime } = await mod.buildScrServer();
  const baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
  return { baseUrl, close: async () => { await app.close(); await runtime.shutdown(); } };
}
