import * as readline from 'readline';
import { RuntimeContext } from '../../../../src/types.js';
import { getTasks } from '../plugins/tasks.js';

export const terminalUI = {
  async mount(_target: unknown, context: RuntimeContext): Promise<void> {
    console.log('=== Task Manager ===\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const showMenu = (): void => {
      console.log('\nCommands:');
      console.log('  a <text> - Add task');
      console.log('  l        - List tasks');
      console.log('  c <id>   - Complete task');
      console.log('  x        - Exit\n');
    };
    
    const listTasks = (): void => {
      const tasks = getTasks();
      if (tasks.length === 0) {
        console.log('No tasks yet!\n');
        return;
      }
      
      console.log('\nYour Tasks:');
      tasks.forEach(task => {
        const status = task.completed ? '✓' : ' ';
        console.log(`  [${status}] ${task.text} (${task.id.slice(0, 8)})`);
      });
      console.log('');
    };
    
    showMenu();
    
    rl.on('line', async (input) => {
      const [cmd, ...args] = input.trim().split(' ');
      
      switch (cmd) {
        case 'a':
          if (args.length === 0) {
            console.log('Usage: a <task text>');
            break;
          }
          await context.actions.runAction('add-task', { 
            text: args.join(' ') 
          });
          console.log('✓ Task added');
          break;
          
        case 'l':
          listTasks();
          break;
          
        case 'c':
          if (args.length === 0) {
            console.log('Usage: c <task id>');
            break;
          }
          await context.actions.runAction('complete-task', { 
            id: args[0] 
          });
          console.log('✓ Task completed');
          break;
          
        case 'x':
          console.log('Goodbye!');
          rl.close();
          process.exit(0);
          break;
          
        default:
          showMenu();
      }
    });
  }
};
