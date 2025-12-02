import { Runtime } from '../../../src/runtime.js';
import { tasksPlugin } from './plugins/tasks.js';
import { terminalUI } from './ui/terminal-ui.js';

async function main() {
  console.log('[Tutorial 01] Initializing runtime...\n');
  
  // Create runtime instance
  const runtime = new Runtime();
  
  // Register plugin BEFORE initialization
  runtime.registerPlugin(tasksPlugin);
  
  // Initialize runtime (executes plugin setup)
  await runtime.initialize();
  
  // Get context for UI
  const context = runtime.getContext();
  
  // Start terminal UI
  await terminalUI.mount(null, context);
}

main().catch(console.error);
