import { PluginDefinition, RuntimeContext } from '../../../../src/types.js';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

let tasks: Task[] = [];

export const tasksPlugin: PluginDefinition = {
  name: 'tasks',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // Register the tasks screen
    context.screens.registerScreen({
      id: 'tasks',
      title: 'Task Manager',
      component: 'TasksScreen'
    });
    
    // Register add-task action
    context.actions.registerAction({
      id: 'add-task',
      handler: (params: { text: string }) => {
        const task: Task = {
          id: crypto.randomUUID(),
          text: params.text,
          completed: false,
          createdAt: new Date()
        };
        tasks.push(task);
        return task;
      }
    });
    
    // Register complete-task action
    context.actions.registerAction({
      id: 'complete-task',
      handler: (params: { id: string }) => {
        const task = tasks.find(t => t.id === params.id);
        if (task) {
          task.completed = true;
        }
        return task;
      }
    });
    
    // Register list-tasks action
    context.actions.registerAction({
      id: 'list-tasks',
      handler: () => {
        return tasks;
      }
    });
  },
  
  dispose(): void {
    tasks = [];
  }
};

// Export for UI access
export function getTasks(): Task[] {
  return tasks;
}
