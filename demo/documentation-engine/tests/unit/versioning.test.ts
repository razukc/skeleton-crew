/**
 * Versioning Plugin Tests
 * 
 * Tests for the versioning plugin functionality.
 * 
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { createVersioningPlugin, type VersionConfig } from '../../src/plugins/versioning.js';
import { createRouterPlugin } from '../../src/plugins/router.js';

describe('Versioning Plugin', () => {
  describe('Plugin Initialization', () => {
    it('should initialize with default configuration', async () => {
      const runtime = new Runtime();
      const versioningPlugin = createVersioningPlugin();

      runtime.registerPlugin(versioningPlugin);
      await runtime.initialize();

      const context = runtime.getContext() as any;
      expect(context.versioning).toBeDefined();
      expect(context.versioning.getVersions()).toHaveLength(1);
      expect(context.versioning.getDefaultVersion()?.id).toBe('latest');
    });

    it('should initialize with custom configuration', async () => {
      const config: VersionConfig = {
        versions: [
          { id: 'v1.0', label: 'Version 1.0', path: '/v1.0' },
          { id: 'v2.0', label: 'Version 2.0', path: '/v2.0' },
          { id: 'latest', label: 'Latest', path: '/' }
        ],
        default: 'latest'
      };

      const runtime = new Runtime();
      const versioningPlugin = createVersioningPlugin(config);

      runtime.registerPlugin(versioningPlugin);
      await runtime.initialize();

      const context = runtime.getContext() as any;
      expect(context.versioning.getVersions()).toHaveLength(3);
      expect(context.versioning.getDefaultVersion()?.id).toBe('latest');
    });

    it('should throw error for invalid configuration', () => {
      const invalidConfig = {
        versions: [],
        default: 'latest'
      } as VersionConfig;

      expect(() => createVersioningPlugin(invalidConfig)).toThrow(
        'Version configuration must include at least one version'
      );
    });

    it('should throw error when default version does not exist', () => {
      const invalidConfig: VersionConfig = {
        versions: [
          { id: 'v1.0', label: 'Version 1.0', path: '/v1.0' }
        ],
        default: 'nonexistent'
      };

      expect(() => createVersioningPlugin(invalidConfig)).toThrow(
        "Default version 'nonexistent' not found in versions list"
      );
    });
  });

  describe('Version Management', () => {
    let runtime: Runtime;
    let context: any;

    beforeEach(async () => {
      const config: VersionConfig = {
        versions: [
          { id: 'v1.0', label: 'Version 1.0', path: '/v1.0' },
          { id: 'v2.0', label: 'Version 2.0', path: '/v2.0' },
          { id: 'latest', label: 'Latest', path: '/' }
        ],
        default: 'latest'
      };

      runtime = new Runtime();
      const versioningPlugin = createVersioningPlugin(config);
      runtime.registerPlugin(versioningPlugin);
      await runtime.initialize();
      context = runtime.getContext();
    });

    it('should get all versions', () => {
      const versions = context.versioning.getVersions();
      expect(versions).toHaveLength(3);
      expect(versions[0].id).toBe('v1.0');
      expect(versions[1].id).toBe('v2.0');
      expect(versions[2].id).toBe('latest');
    });

    it('should get default version', () => {
      const defaultVersion = context.versioning.getDefaultVersion();
      expect(defaultVersion).toBeDefined();
      expect(defaultVersion.id).toBe('latest');
      expect(defaultVersion.label).toBe('Latest');
      expect(defaultVersion.path).toBe('/');
    });

    it('should get specific version by ID', () => {
      const version = context.versioning.getVersion('v1.0');
      expect(version).toBeDefined();
      expect(version.id).toBe('v1.0');
      expect(version.label).toBe('Version 1.0');
      expect(version.path).toBe('/v1.0');
    });

    it('should return undefined for non-existent version', () => {
      const version = context.versioning.getVersion('nonexistent');
      expect(version).toBeUndefined();
    });

    it('should get current version (defaults to default version)', () => {
      const currentVersion = context.versioning.getCurrentVersion();
      expect(currentVersion).toBeDefined();
      expect(currentVersion.id).toBe('latest');
    });
  });

  describe('Version Switching Action', () => {
    let runtime: Runtime;
    let context: any;

    beforeEach(async () => {
      const config: VersionConfig = {
        versions: [
          { id: 'v1.0', label: 'Version 1.0', path: '/v1.0' },
          { id: 'v2.0', label: 'Version 2.0', path: '/v2.0' },
          { id: 'latest', label: 'Latest', path: '/' }
        ],
        default: 'latest'
      };

      runtime = new Runtime();
      
      // Register router plugin first (required for navigation)
      const routerPlugin = createRouterPlugin();
      runtime.registerPlugin(routerPlugin);
      
      // Register versioning plugin
      const versioningPlugin = createVersioningPlugin(config);
      runtime.registerPlugin(versioningPlugin);
      
      await runtime.initialize();
      context = runtime.getContext();

      // Register some test routes
      context.router.registerRoute('/', 'home');
      context.router.registerRoute('/getting-started', 'getting-started');
      context.router.registerRoute('/v1.0', 'v1-home');
      context.router.registerRoute('/v1.0/', 'v1-home');
      context.router.registerRoute('/v1.0/getting-started', 'v1-getting-started');
      context.router.registerRoute('/v2.0', 'v2-home');
      context.router.registerRoute('/v2.0/', 'v2-home');
      context.router.registerRoute('/v2.0/getting-started', 'v2-getting-started');
    });

    it('should register version:switch action', async () => {
      // Action should be registered
      const result = await context.actions.runAction('version:switch', {
        versionId: 'v1.0',
        currentPath: '/getting-started'
      });

      expect(result).toBeDefined();
      expect(result.path).toBeDefined();
    });

    it('should switch from latest to v1.0', async () => {
      const result = await context.actions.runAction('version:switch', {
        versionId: 'v1.0',
        currentPath: '/getting-started'
      });

      expect(result.path).toBe('/v1.0/getting-started');
    });

    it('should switch from v1.0 to v2.0', async () => {
      const result = await context.actions.runAction('version:switch', {
        versionId: 'v2.0',
        currentPath: '/v1.0/getting-started'
      });

      expect(result.path).toBe('/v2.0/getting-started');
    });

    it('should switch from v1.0 to latest', async () => {
      const result = await context.actions.runAction('version:switch', {
        versionId: 'latest',
        currentPath: '/v1.0/getting-started'
      });

      expect(result.path).toBe('/getting-started');
    });

    it('should navigate to version homepage when page does not exist', async () => {
      // Try to switch to a page that doesn't exist in v1.0
      const result = await context.actions.runAction('version:switch', {
        versionId: 'v1.0',
        currentPath: '/nonexistent-page'
      });

      // Should fall back to version homepage
      expect(result.path).toBe('/v1.0');
    });

    it('should throw error for invalid version ID', async () => {
      await expect(
        context.actions.runAction('version:switch', {
          versionId: 'nonexistent',
          currentPath: '/getting-started'
        })
      ).rejects.toThrow('Version not found: nonexistent');
    });

    it('should throw error when versionId is missing', async () => {
      await expect(
        context.actions.runAction('version:switch', {
          currentPath: '/getting-started'
        })
      ).rejects.toThrow('version:switch action requires a versionId parameter');
    });

    it('should throw error when currentPath is missing', async () => {
      await expect(
        context.actions.runAction('version:switch', {
          versionId: 'v1.0'
        })
      ).rejects.toThrow('version:switch action requires a currentPath parameter');
    });
  });

  describe('Version Configuration Validation', () => {
    it('should validate version IDs', () => {
      const invalidConfig = {
        versions: [
          { id: '', label: 'Empty ID', path: '/' }
        ],
        default: ''
      } as VersionConfig;

      expect(() => createVersioningPlugin(invalidConfig)).toThrow();
    });

    it('should validate version labels', () => {
      const invalidConfig = {
        versions: [
          { id: 'v1', label: '', path: '/' }
        ],
        default: 'v1'
      } as VersionConfig;

      expect(() => createVersioningPlugin(invalidConfig)).toThrow(
        'Each version must have a valid label'
      );
    });

    it('should validate version paths', () => {
      const invalidConfig = {
        versions: [
          { id: 'v1', label: 'Version 1', path: '' }
        ],
        default: 'v1'
      } as VersionConfig;

      expect(() => createVersioningPlugin(invalidConfig)).toThrow(
        'Each version must have a valid path'
      );
    });
  });
});
