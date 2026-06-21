import { Runtime, type Logger } from 'skeleton-crew';
import { storePluginV1, storePluginV2 } from '../src/plugins/store-plugin.js';
import {
  postsPluginV1,
  postsPluginV2Clean,
  postsPluginV2Throwing,
  postsPluginV2Hijack,
  postsPluginV2Skew,
  skewProbe,
} from '../src/plugins/posts-plugin.js';
import { commentsPluginV1, commentsPluginV2 } from '../src/plugins/comments-plugin.js';
import { buildServer, type SwapFn } from '../src/server.js';
import { SwapTimeline } from '../src/swap-timeline.js';
import { verify, flood } from './load.js';
import {
  oracleNoServerErrors,
  oracleWholeShape,
  oracleConfigSnapshot,
  type Verdict,
} from './oracles.js';
import type { StressConfig } from '../src/types.js';

const silentLogger = (): Logger => ({
  debug: () => {}, info: () => {}, warn: () => {}, error: () => {},
});

export interface ScenarioResult {
  id: number;
  name: string;
  verdicts: Verdict[];
  totalSamples: number;
  serverErrors: number;
  p99LatencyMs: number;
}

export interface Scenario {
  id: number;
  name: string;
  verifyPath: string;
  run(baseConfig: ScenarioRunConfig): Promise<ScenarioResult>;
}

export interface ScenarioRunConfig {
  connections: number;
  durationSec: number;
  swapAtMs: number; // when, into the run, to fire the swap
}

// Boot a fresh runtime + server for a scenario. The swap function is provided
// per-scenario to map a plugin name to its v2 variant.
async function bootScenario(
  swap: SwapFn,
  config: StressConfig = { pageSize: 10 },
): Promise<{ runtime: Runtime<StressConfig>; app: ReturnType<typeof buildServer>; address: string }> {
  const runtime = new Runtime<StressConfig>({ logger: silentLogger(), config });
  runtime.registerPlugin(storePluginV1);
  runtime.registerPlugin(postsPluginV1);
  runtime.registerPlugin(commentsPluginV1);
  await runtime.initialize();
  const app = buildServer(runtime, swap);
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  return { runtime, app, address };
}

// Shared driver: start flood + verify, fire the swap mid-run via the timeline,
// then assemble a ScenarioResult. `extraOracles` lets a scenario add body-shape
// or probe oracles beyond the universal no-server-errors check.
async function driveScenario(opts: {
  id: number;
  name: string;
  verifyPath: string;
  cfg: ScenarioRunConfig;
  swap: SwapFn;
  initialConfig?: StressConfig;
  fireSwap: (runtime: Runtime<StressConfig>, address: string, timeline: SwapTimeline) => Promise<void>;
  extraOracles?: (samples: Awaited<ReturnType<typeof verify>>) => Verdict[];
}): Promise<ScenarioResult> {
  const timeline = new SwapTimeline();
  const { runtime, app, address } = await bootScenario(opts.swap, opts.initialConfig);

  const floodResult = flood(`${address}${opts.verifyPath}`, {
    connections: opts.cfg.connections,
    duration: opts.cfg.durationSec,
  });
  const verifyResult = verify(`${address}${opts.verifyPath}`, {
    durationMs: opts.cfg.durationSec * 1000,
    timeline,
  });

  // Fire the swap partway through the run.
  await new Promise((r) => setTimeout(r, opts.cfg.swapAtMs));
  await opts.fireSwap(runtime, address, timeline);

  const [samples, ac] = await Promise.all([verifyResult, floodResult]);

  const verdicts: Verdict[] = [oracleNoServerErrors(samples)];
  if (opts.extraOracles) verdicts.push(...opts.extraOracles(samples));

  await app.close();
  await runtime.shutdown();

  return {
    id: opts.id,
    name: opts.name,
    verdicts,
    totalSamples: samples.length,
    serverErrors: samples.filter((s) => (s.status >= 500 || s.status === 0) && s.phase !== 'pre').length,
    p99LatencyMs: ac.latency.p99,
  };
}

export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    name: 'Clean swap (posts v1 → v2 tagged)',
    verifyPath: '/posts',
    run: (cfg) =>
      driveScenario({
        id: 1, name: 'Clean swap', verifyPath: '/posts', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          await rt.swapPlugin(postsPluginV2Clean);
          tl.mark('commit');
        },
        extraOracles: (samples) => [oracleWholeShape(samples)],
      }),
  },
  {
    id: 2,
    name: 'Throwing swap (posts v2 setup throws)',
    verifyPath: '/posts',
    run: (cfg) =>
      driveScenario({
        id: 2, name: 'Throwing swap', verifyPath: '/posts', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          await rt.swapPlugin(postsPluginV2Throwing).catch(() => { /* expected reject */ });
          tl.mark('commit');
        },
      }),
  },
  {
    id: 3,
    name: 'Dispose-clobber (store v2 dispose unregisters store)',
    verifyPath: '/posts',
    run: (cfg) =>
      driveScenario({
        id: 3, name: 'Dispose-clobber', verifyPath: '/posts', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          await rt.swapPlugin(storePluginV2);
          tl.mark('commit');
        },
      }),
  },
  {
    id: 4,
    name: 'Cross-plugin hijack (posts v2 grabs comments:list)',
    verifyPath: '/comments',
    run: (cfg) =>
      driveScenario({
        id: 4, name: 'Cross-plugin hijack', verifyPath: '/comments', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          await rt.swapPlugin(postsPluginV2Hijack).catch(() => { /* expected reject */ });
          tl.mark('commit');
        },
      }),
  },
  {
    id: 5,
    name: 'Config skew (updateConfig during posts v2 await window)',
    verifyPath: '/posts',
    run: (cfg) =>
      driveScenario({
        id: 5, name: 'Config skew', verifyPath: '/posts', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          const swapDone = rt.swapPlugin(postsPluginV2Skew);
          // Mutate config during the setup await window.
          await new Promise((r) => setTimeout(r, 0));
          rt.updateConfig({ pageSize: 20 });
          await swapDone.catch(() => {});
          tl.mark('commit');
        },
        extraOracles: () => [oracleConfigSnapshot(skewProbe)],
      }),
  },
  {
    id: 6,
    name: 'Concurrent dual-swap (posts + comments same tick)',
    verifyPath: '/posts',
    run: (cfg) =>
      driveScenario({
        id: 6, name: 'Concurrent dual-swap', verifyPath: '/posts', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          // Both swaps fired without awaiting between them — they race through
          // buffered-setup → commit against the same live registries.
          const a = rt.swapPlugin(postsPluginV2Clean);
          const b = rt.swapPlugin(commentsPluginV2);
          await Promise.allSettled([a, b]);
          tl.mark('commit');
        },
        extraOracles: (samples) => [oracleWholeShape(samples)],
      }),
  },
];
