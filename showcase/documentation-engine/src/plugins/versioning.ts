/**
 * Versioning Plugin
 * 
 * Manages multiple documentation versions with version switching and navigation.
 * Loads version configuration and provides version selector functionality.
 * 
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

/**
 * Version definition
 */
export interface Version {
  id: string;      // Unique version identifier (e.g., 'v1.0', 'v2.0')
  label: string;   // Display label (e.g., 'Version 1.0', 'Latest')
  path: string;    // Base path for this version (e.g., '/v1.0', '/latest')
}

/**
 * Version configuration
 */
export interface VersionConfig {
  versions: Version[];
  default: string;  // Default version ID
}

/**
 * Versioning plugin interface
 */
export interface VersioningPlugin {
  /**
   * Get all available versions
   * @returns Array of version definitions
   */
  getVersions(): Version[];

  /**
   * Get the default version
   * @returns Default version definition
   */
  getDefaultVersion(): Version | undefined;

  /**
   * Get a specific version by ID
   * @param versionId - Version identifier
   * @returns Version definition or undefined if not found
   */
  getVersion(versionId: string): Version | undefined;

  /**
   * Get the current version from URL or default
   * @returns Current version definition
   */
  getCurrentVersion(): Version | undefined;
}

/**
 * Extended RuntimeContext with versioning plugin
 */
export interface RuntimeContextWithVersioning extends RuntimeContext {
  versioning: VersioningPlugin;
}

/**
 * Load version configuration from a config object
 * 
 * In a real implementation, this would load from a file or API.
 * For now, we'll accept a config object passed during plugin creation.
 * 
 * @param config - Version configuration
 * @returns Validated version configuration
 * @see Requirements 9.1
 */
function loadVersionConfig(config?: VersionConfig): VersionConfig {
  // Default configuration if none provided
  if (!config) {
    return {
      versions: [
        {
          id: 'latest',
          label: 'Latest',
          path: '/'
        }
      ],
      default: 'latest'
    };
  }

  // Validate configuration
  if (!Array.isArray(config.versions) || config.versions.length === 0) {
    throw new Error('Version configuration must include at least one version');
  }

  if (!config.default || typeof config.default !== 'string') {
    throw new Error('Version configuration must specify a default version');
  }

  // Validate that default version exists
  const defaultExists = config.versions.some(v => v.id === config.default);
  if (!defaultExists) {
    throw new Error(`Default version '${config.default}' not found in versions list`);
  }

  // Validate each version
  for (const version of config.versions) {
    if (!version.id || typeof version.id !== 'string') {
      throw new Error('Each version must have a valid id');
    }
    if (!version.label || typeof version.label !== 'string') {
      throw new Error('Each version must have a valid label');
    }
    if (!version.path || typeof version.path !== 'string') {
      throw new Error('Each version must have a valid path');
    }
  }

  return config;
}

/**
 * Extract version from current URL path
 * 
 * @param versions - Available versions
 * @returns Version ID if found in path, undefined otherwise
 */
function extractVersionFromPath(versions: Version[]): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const currentPath = window.location.pathname;

  // Check if current path starts with any version path
  for (const version of versions) {
    if (version.path !== '/' && currentPath.startsWith(version.path)) {
      return version.id;
    }
  }

  return undefined;
}

/**
 * Create the versioning plugin
 * 
 * This plugin manages multiple documentation versions, provides version
 * switching functionality, and handles navigation between versions.
 * 
 * @param config - Optional version configuration
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
export function createVersioningPlugin(config?: VersionConfig): PluginDefinition {
  // Load and validate version configuration
  // @see Requirements 9.1
  const versionConfig = loadVersionConfig(config);

  // Versioning plugin implementation
  const versioningPlugin: VersioningPlugin = {
    getVersions(): Version[] {
      return [...versionConfig.versions];
    },

    getDefaultVersion(): Version | undefined {
      return versionConfig.versions.find(v => v.id === versionConfig.default);
    },

    getVersion(versionId: string): Version | undefined {
      return versionConfig.versions.find(v => v.id === versionId);
    },

    getCurrentVersion(): Version | undefined {
      // Try to extract version from URL
      const versionIdFromPath = extractVersionFromPath(versionConfig.versions);
      
      if (versionIdFromPath) {
        return this.getVersion(versionIdFromPath);
      }

      // Fall back to default version
      // @see Requirements 9.5
      return this.getDefaultVersion();
    }
  };

  return {
    name: 'versioning',
    version: '1.0.0',
    setup(context: RuntimeContext): void {
      // Extend the runtime context with versioning plugin
      (context as RuntimeContextWithVersioning).versioning = versioningPlugin;

      console.log(`[versioning] Initialized with ${versionConfig.versions.length} versions`);
      console.log(`[versioning] Default version: ${versionConfig.default}`);

      // Register version:switch action
      // @see Requirements 9.3, 9.4
      context.actions.registerAction({
        id: 'version:switch',
        handler: async (params: { versionId: string; currentPath: string }): Promise<{ path: string }> => {
          const { versionId, currentPath } = params;

          if (!versionId || typeof versionId !== 'string') {
            throw new Error('version:switch action requires a versionId parameter');
          }

          if (!currentPath || typeof currentPath !== 'string') {
            throw new Error('version:switch action requires a currentPath parameter');
          }

          // Get the target version
          const targetVersion = versioningPlugin.getVersion(versionId);
          if (!targetVersion) {
            throw new Error(`Version not found: ${versionId}`);
          }

          // Detect current version from the currentPath
          let currentVersion: Version | undefined;
          for (const version of versionConfig.versions) {
            if (version.path !== '/' && currentPath.startsWith(version.path)) {
              currentVersion = version;
              break;
            }
          }

          // If no version detected from path, assume default version
          if (!currentVersion) {
            currentVersion = versioningPlugin.getDefaultVersion();
          }

          // Remove current version prefix from path if present
          let relativePath = currentPath;
          if (currentVersion && currentVersion.path !== '/') {
            if (currentPath.startsWith(currentVersion.path)) {
              relativePath = currentPath.substring(currentVersion.path.length);
            }
          }

          // Ensure relative path starts with /
          if (!relativePath.startsWith('/')) {
            relativePath = '/' + relativePath;
          }

          // Build new path with target version prefix
          let newPath: string;
          if (targetVersion.path === '/') {
            newPath = relativePath;
          } else {
            newPath = targetVersion.path + relativePath;
          }

          // Check if the page exists in the target version
          // We'll try to navigate to it, and if it fails, navigate to version homepage
          try {
            // Get router from context
            const routerContext = context as any;
            if (routerContext.router) {
              const screenId = routerContext.router.getScreenForPath(newPath);
              
              if (!screenId) {
                // Page doesn't exist in target version, navigate to version homepage
                // @see Requirements 9.4
                console.log(`[versioning] Page ${newPath} not found in version ${versionId}, navigating to homepage`);
                newPath = targetVersion.path === '/' ? '/' : targetVersion.path;
              }
            }
          } catch (error) {
            // If we can't check, just try the path anyway
            console.warn('[versioning] Could not verify page existence:', error);
          }

          // Navigate to the new path
          try {
            await context.actions.runAction('router:navigate', { path: newPath });
          } catch (error) {
            // If navigation fails, try version homepage
            // @see Requirements 9.4
            console.log(`[versioning] Navigation to ${newPath} failed, trying version homepage`);
            const homePath = targetVersion.path === '/' ? '/' : targetVersion.path;
            await context.actions.runAction('router:navigate', { path: homePath });
            newPath = homePath;
          }

          console.log(`[versioning] Switched to version ${versionId}, path: ${newPath}`);

          return { path: newPath };
        }
      });

      console.log('[versioning] Actions registered: version:switch');
    }
  };
}
