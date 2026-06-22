import { describe, it, expect, afterEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createSandbox, landSandbox } from '../harness/sandbox.js';

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.forEach((c) => c()); cleanups.length = 0; });

function makeFakeArm(): string {
  const arm = mkdtempSync(join(tmpdir(), 'arm-'));
  mkdirSync(join(arm, 'src'));
  writeFileSync(join(arm, 'src', 'a.ts'), 'export const a = 1;\n');
  cleanups.push(() => rmSync(arm, { recursive: true, force: true }));
  return arm;
}

describe('sandbox', () => {
  it('copies arm src into an isolated dir; edits there do not touch the arm', () => {
    const arm = makeFakeArm();
    const sb = createSandbox(arm, join(arm, '.sb'));
    cleanups.push(sb.cleanup);
    writeFileSync(join(sb.dir, 'src', 'a.ts'), 'export const a = 2;\n');
    expect(readFileSync(join(arm, 'src', 'a.ts'), 'utf8')).toContain('= 1'); // arm untouched
    expect(readFileSync(join(sb.dir, 'src', 'a.ts'), 'utf8')).toContain('= 2');
  });

  it('lands a sandbox back onto the arm', () => {
    const arm = makeFakeArm();
    const sb = createSandbox(arm, join(arm, '.sb'));
    cleanups.push(sb.cleanup);
    writeFileSync(join(sb.dir, 'src', 'a.ts'), 'export const a = 99;\n');
    landSandbox(sb.dir, arm);
    expect(readFileSync(join(arm, 'src', 'a.ts'), 'utf8')).toContain('= 99');
  });

  it('cleanup removes the sandbox dir', () => {
    const arm = makeFakeArm();
    const sb = createSandbox(arm, join(arm, '.sb'));
    sb.cleanup();
    expect(existsSync(sb.dir)).toBe(false);
  });
});
