import { cpSync, rmSync, mkdirSync, existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

export interface Sandbox {
  dir: string;
  cleanup: () => void;
}

/**
 * Copy an arm's `src/` (and tsconfig/package.json if present) into an isolated
 * sandbox dir. node_modules is symlinked when present (deps are identical and
 * copying is heavy). Returns the sandbox dir + a cleanup fn.
 */
export function createSandbox(armDir: string, sandboxDir: string): Sandbox {
  rmSync(sandboxDir, { recursive: true, force: true });
  mkdirSync(sandboxDir, { recursive: true });
  cpSync(join(armDir, 'src'), join(sandboxDir, 'src'), { recursive: true });
  for (const f of ['tsconfig.json', 'package.json']) {
    if (existsSync(join(armDir, f))) cpSync(join(armDir, f), join(sandboxDir, f));
  }
  const nm = join(armDir, 'node_modules');
  if (existsSync(nm)) {
    try {
      symlinkSync(nm, join(sandboxDir, 'node_modules'), 'junction');
    } catch (e) {
      // Best-effort: a failed junction means the sandbox can't resolve deps and
      // its build will fail. Surface it so an infra problem (antivirus, non-NTFS
      // volume) isn't silently misread as an agent build failure.
      console.warn(`[sandbox] node_modules junction failed for ${sandboxDir}: ${(e as Error).message}`);
    }
  }
  return { dir: sandboxDir, cleanup: () => rmSync(sandboxDir, { recursive: true, force: true }) };
}

/** Copy a sandbox's `src/` back over the arm — promotes a chosen run. */
export function landSandbox(sandboxDir: string, armDir: string): void {
  rmSync(join(armDir, 'src'), { recursive: true, force: true });
  cpSync(join(sandboxDir, 'src'), join(armDir, 'src'), { recursive: true });
}
