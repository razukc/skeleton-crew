import { spawn } from 'node:child_process';
import type { AgentRunResult } from './types.js';

const READ_TOOLS = new Set(['Read', 'Grep', 'Glob']);

export interface RunAgentOptions {
  prompt: string;
  cwd: string;
  /** The executable to run. Defaults to 'claude'. Tests inject node + fake CLI. */
  command?: string;
  /** Args before the standard flags. Tests pass [fakeCliPath, scenario]. */
  baseArgs?: string[];
  /** Extra claude flags (model, allowedTools, max-budget). Ignored by the fake. */
  extraArgs?: string[];
  /** Hard wall-clock cap (ms). On expiry the child tree is killed and the run
   *  resolves ok=false. 0/undefined = no timeout. Essential for an unattended
   *  batch: one hung build must not block the whole experiment. */
  timeoutMs?: number;
  /** Environment for the child. Defaults to process.env. Pass a scrubbed env to
   *  stop a builder from inheriting the parent session's hooks/MCP servers. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Invoke a headless agent and parse its stream-json. Token usage + cost come
 * from the final `result` envelope; files read come from Read/Grep/Glob
 * `tool_use` entries. Never throws on a bad stream — returns ok=false instead,
 * so one failed build can't abort the whole experiment.
 */
export function runAgent(opts: RunAgentOptions): Promise<AgentRunResult> {
  // Default to the actual Claude Code binary this session runs on
  // (CLAUDE_CODE_EXECPATH) before a bare 'claude' on PATH: in a wrapped setup
  // (e.g. the bonsai gateway) the PATH 'claude' can resolve to a DIFFERENT,
  // non-wrapped build the gateway rejects as "outdated". The exec-path env var
  // points at the binary that is already authenticated for this session.
  const command = opts.command ?? process.env.CLAUDE_CODE_EXECPATH ?? 'claude';
  const args = [
    ...(opts.baseArgs ?? ['--print', '--output-format', 'stream-json', '--verbose']),
    ...(opts.extraArgs ?? []),
  ];

  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd: opts.cwd, env: opts.env ?? process.env });
    const filesRead = new Set<string>();
    const res: AgentRunResult = {
      ok: false, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0,
      cacheCreationTokens: 0, costUsd: 0, numTurns: 0, filesRead: [], readToolCalls: 0, sessionId: '',
    };
    let buffer = '';
    let sawResult = false;
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      res.filesRead = [...filesRead];
      resolve(res);
    };

    // Wall-clock guard: kill the child tree and resolve ok=false on expiry.
    const timer = opts.timeoutMs && opts.timeoutMs > 0
      ? setTimeout(() => {
          if (proc.pid) {
            // Tree-kill on Windows (taskkill /T); plain kill elsewhere.
            try {
              if (process.platform === 'win32') spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F']);
              else proc.kill('SIGKILL');
            } catch { /* best-effort */ }
          }
          finish(); // ok stays false; sawResult false → recorded as a failed build
        }, opts.timeoutMs)
      : null;

    const handleLine = (line: string): void => {
      if (!line.trim()) return;
      let obj: unknown;
      try { obj = JSON.parse(line); } catch { return; } // tolerate noise
      const o = obj as Record<string, any>;
      if (o.type === 'result') {
        sawResult = true;
        const u = o.usage ?? {};
        res.inputTokens = u.input_tokens ?? 0;
        res.outputTokens = u.output_tokens ?? 0;
        res.cacheReadTokens = u.cache_read_input_tokens ?? 0;
        res.cacheCreationTokens = u.cache_creation_input_tokens ?? 0;
        res.costUsd = o.total_cost_usd ?? 0;
        res.numTurns = o.num_turns ?? 0;
        res.sessionId = o.session_id ?? '';
      } else if (o.type === 'assistant' && Array.isArray(o.message?.content)) {
        for (const c of o.message.content) {
          if (c?.type === 'tool_use' && READ_TOOLS.has(c.name)) {
            res.readToolCalls++;
            // Read uses file_path; Grep/Glob use an optional `path` (may be a
            // directory or absent → then only the invocation is counted).
            const target = c.input?.file_path ?? c.input?.path;
            if (typeof target === 'string') filesRead.add(target);
          }
        }
      }
    };

    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const l of lines) handleLine(l);
    });
    proc.stderr.on('data', () => { /* CLI diagnostics; ignored */ });
    proc.on('error', () => finish()); // spawn failed (e.g. claude not found)
    proc.on('close', (code) => {
      if (buffer) handleLine(buffer);
      res.ok = code === 0 && sawResult;
      finish();
    });

    proc.stdin.on('error', () => { /* child exited before prompt flush */ });
    proc.stdin.write(opts.prompt);
    proc.stdin.end();
  });
}
