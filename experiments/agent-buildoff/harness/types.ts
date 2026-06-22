export type Arm = 'scr' | 'mono';

export interface AgentRunResult {
  ok: boolean;                 // process exited 0 AND a result envelope was seen
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  numTurns: number;
  filesRead: string[];         // deduped, from Read/Grep/Glob tool_use file_path
  readToolCalls: number;       // count of Read/Grep/Glob invocations (undercount-proof exploration volume)
  sessionId: string;
}

export interface OracleResult {
  feature: string;             // which feature this oracle belongs to (e.g. 'tasks', 'f1')
  name: string;
  pass: boolean;
  detail: string;
}

export interface FeatureRunMetrics {
  feature: string;
  arm: Arm;
  repeat: number;
  agent: AgentRunResult;
  filesTouched: string[];      // git/diff name-only in the sandbox
  oracleResults: OracleResult[];
  featureOraclePass: boolean;  // did THIS feature's own oracles all pass
  foreignBreakage: number;     // count of OTHER features' oracle failures
}
