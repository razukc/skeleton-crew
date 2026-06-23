// A fake `claude --print --output-format stream-json` for deterministic tests.
// Reads a scenario name from argv[2] and emits canned ndjson to stdout.
// Spends zero tokens. Consumes (and ignores) stdin so the parent can write a prompt.
import process from 'node:process';

const scenario = process.argv[2] ?? 'happy';
process.stdin.resume();
process.stdin.on('data', () => {});

// "hang": emit a partial stream then never exit — models a builder that writes
// files then wedges (the failure that blocked the first live run). The parent's
// timeoutMs must kill it. Keep the event loop alive with a long timer.
if (scenario === 'hang') {
  process.stdout.write(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'a.ts' } }] } }) + '\n');
  setTimeout(() => {}, 60_000);
}

function line(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }

function toolUse(name, input) {
  return { type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } };
}

const result = {
  type: 'result',
  usage: { input_tokens: 1000, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  total_cost_usd: 0.25,
  num_turns: 2,
  session_id: 'sess-123',
};

process.stdin.on('end', () => {
  if (scenario === 'crash') { process.exit(3); }
  if (scenario === 'happy' || scenario === 'noisy') {
    if (scenario === 'noisy') process.stdout.write('not json at all\n');
    line(toolUse('Read', { file_path: 'a.ts' }));
    line(toolUse('Read', { file_path: 'a.ts' }));         // duplicate → deduped
    line(toolUse('Grep', { pattern: 'x', path: 'b.ts' })); // Grep: path, not file_path
    line(toolUse('Glob', { pattern: '*.ts', path: 'c.ts' })); // Glob: path
    line(toolUse('Grep', { pattern: 'y' }));               // path-less: counted as a call, no file
    line(toolUse('Edit', { file_path: 'd.ts' }));          // writes NOT counted as reads
    line(result);
  } else if (scenario === 'noresult') {
    line(toolUse('Read', { file_path: 'a.ts' }));      // no result envelope
  }
  process.exit(0);
});
