import { PluginDefinition, RuntimeContext } from '../types.js';

export interface ConfigPluginOptions {
    validate?: (config: any) => boolean | Promise<boolean>;
}

export const ConfigPlugin: PluginDefinition = {
    name: 'config',
    version: '1.0.0',
    async setup(ctx: RuntimeContext) {
        // Seed an INTERNAL, owned copy from the host config. We must not mutate
        // ctx.host.config: the shallow freeze only copies the reference, so the
        // host's own object is reachable and writable through it. config:set
        // previously did Object.assign(host.config, …), silently corrupting the
        // caller's config (and throwing if the host had frozen it). The plugin
        // now owns its state and leaves the host's object untouched. See Finding 6.
        const host = (ctx as any).host;
        const internalConfig: Record<string, any> = { ...(host.config ?? {}) };

        // Core Config Actions

        ctx.actions.registerAction({
            id: 'config:get',
            handler: async (key?: string) => {
                if (key) {
                    return internalConfig[key];
                }
                // Return a copy so callers can't mutate internal state directly.
                return { ...internalConfig };
            }
        });

        ctx.actions.registerAction({
            id: 'config:set',
            handler: async (payload: Record<string, any>) => {
                Object.assign(internalConfig, payload);
                return { ...internalConfig };
            }
        });

        ctx.actions.registerAction({
            id: 'config:validate',
            handler: async () => {
                // If a validation function was injected into hostContext by the generic bootstrap, run it.
                const validator = (ctx as any).host._configValidator;
                if (typeof validator === 'function') {
                    return await validator((ctx as any).host.config);
                }
                return true; // No validator means valid
            }
        });
    }
};
