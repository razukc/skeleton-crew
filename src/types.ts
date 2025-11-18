// Core type definitions will be implemented in task 2

export interface PluginDefinition {
  name: string;
  version: string;
  setup: (context: RuntimeContext) => void | Promise<void>;
  dispose?: (context: RuntimeContext) => void | Promise<void>;
}

export interface ScreenDefinition {
  id: string;
  title: string;
  component: string;
}

export interface ActionDefinition {
  id: string;
  handler: (params: unknown, context: RuntimeContext) => Promise<unknown> | unknown;
}

export interface UIProvider {
  mount(target: unknown): void;
  render(screen: ScreenDefinition): unknown;
}

export interface RuntimeContext {
  screens: {
    registerScreen(screen: ScreenDefinition): void;
    getScreen(id: string): ScreenDefinition | null;
    getAllScreens(): ScreenDefinition[];
  };
  actions: {
    registerAction(action: ActionDefinition): void;
    runAction(id: string, params?: unknown): Promise<unknown>;
  };
  plugins: {
    registerPlugin(plugin: PluginDefinition): void;
    getPlugin(name: string): PluginDefinition | null;
    getAllPlugins(): PluginDefinition[];
  };
  events: {
    emit(event: string, data?: unknown): void;
    on(event: string, handler: (data: unknown) => void): () => void;
  };
  getRuntime(): Runtime;
}

export interface Runtime {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getContext(): RuntimeContext;
}
