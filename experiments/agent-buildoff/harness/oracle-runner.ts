import type { OracleResult } from './types.js';

export interface Oracle {
  feature: string;
  name: string;
  run: (baseUrl: string) => Promise<{ pass: boolean; detail: string }>;
}

/** Run every oracle against a base URL; a throw becomes a failure result. */
export async function runOracles(baseUrl: string, oracles: Oracle[]): Promise<OracleResult[]> {
  const out: OracleResult[] = [];
  for (const o of oracles) {
    try {
      const r = await o.run(baseUrl);
      out.push({ feature: o.feature, name: o.name, pass: r.pass, detail: r.detail });
    } catch (err) {
      out.push({ feature: o.feature, name: o.name, pass: false, detail: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}

/** For a target feature: did its own oracles pass, and how many OTHER
 *  features' oracles broke (the blast-radius signal). */
export function summarize(results: OracleResult[], targetFeature: string): { featureOraclePass: boolean; foreignBreakage: number } {
  const own = results.filter((r) => r.feature === targetFeature);
  const foreign = results.filter((r) => r.feature !== targetFeature);
  return {
    featureOraclePass: own.length > 0 && own.every((r) => r.pass),
    foreignBreakage: foreign.filter((r) => !r.pass).length,
  };
}
