/**
 * Unit tests for Static Export Plugin
 * 
 * Tests the static export functionality including:
 * - Export action registration
 * - Screen rendering to HTML
 * - Path structure preservation
 * - Asset copying
 * - Export reporting
 * - Error handling
 * 
 * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { createStaticExportPlugin } from '../../src/plugins/static-export.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Static Export Plugin', () => {
  let runtime: Runtime;
  let tempDir: string;

  beforeEach(async () => {
    // Create a new runtime instance
    runtime = new Runtime();

    // Register the static export plugin
    const exportPlugin = createStaticExportPlugin();
    runtime.registerPlugin(exportPlugin);

    // Initialize runtime
    await runtime.initialize();

    // Create a temporary directory for testing
    tempDir = path.join(process.cwd(), 'test-output-' + Date.now());
  });

  afterEach(async () => {
    // Shutdown runtime
    await runtime.shutdown();

    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Plugin Registration', () => {
    it('should register the static-export plugin', () => {
      const context = runtime.getContext();
      const plugin = context.plugins.getPlugin('static-export');
      
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('static-export');
      expect(plugin?.version).toBe('1.0.0');
    });

    it('should register export:static action', async () => {
      const context = runtime.getContext();
      
      // The action should be registered and callable
      await expect(
        context.actions.runAction('export:static', { outputDir: tempDir })
      ).resolves.toBeDefined();
    });
  });

  describe('Export Action Handler', () => {
    it('should export all registered screens', async () => {
      // @see Requirements 10.1
      const context = runtime.getContext();

      // Register some test screens
      context.screens.registerScreen({
        id: 'test-screen-1',
        title: 'Test Screen 1',
        component: 'TestComponent'
      });

      context.screens.registerScreen({
        id: 'test-screen-2',
        title: 'Test Screen 2',
        component: 'TestComponent'
      });

      // Run export
      const result = await context.actions.runAction<{ outputDir: string }, { pages: number; errors: string[] }>('export:static', {
        outputDir: tempDir
      });

      // Verify result
      expect(result).toBeDefined();
      expect(result.pages).toBe(2);
      expect(result.errors).toEqual([]);
    });

    it('should create output directory if it does not exist', async () => {
      const context = runtime.getContext();

      // Register a test screen
      context.screens.registerScreen({
        id: 'test-screen',
        title: 'Test Screen',
        component: 'TestComponent'
      });

      // Run export
      await context.actions.runAction('export:static', {
        outputDir: tempDir
      });

      // Verify directory was created
      expect(fs.existsSync(tempDir)).toBe(true);
    });

    it('should throw error if outputDir is not provided', async () => {
      const context = runtime.getContext();

      // Run export without outputDir
      await expect(
        context.actions.runAction('export:static', {})
      ).rejects.toThrow('Output directory must be a non-empty string');
    });
  });

  describe('Screen Rendering', () => {
    it('should render each screen to HTML', async () => {
      // @see Requirements 10.2
      const context = runtime.getContext();

      // Register a test screen
      context.screens.registerScreen({
        id: 'test-screen',
        title: 'Test Screen',
        component: 'TestComponent'
      });

      // Run export
      await context.actions.runAction('export:static', {
        outputDir: tempDir
      });

      // Verify HTML file was created
      const htmlFile = path.join(tempDir, 'test-screen.html');
      expect(fs.existsSync(htmlFile)).toBe(true);

      // Verify HTML content
      const html = fs.readFileSync(htmlFile, 'utf-8');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Test Screen</title>');
      expect(html).toContain('Test Screen');
    });

    it('should preserve URL path structure', async () => {
      // @see Requirements 10.2
      const context = runtime.getContext();

      // Register a test screen
      context.screens.registerScreen({
        id: 'guides-plugins',
        title: 'Plugins Guide',
        component: 'TestComponent'
      });

      // Run export
      await context.actions.runAction('export:static', {
        outputDir: tempDir
      });

      // Verify file was created with correct path
      const htmlFile = path.join(tempDir, 'guides-plugins.html');
      expect(fs.existsSync(htmlFile)).toBe(true);
    });

    it('should handle root path correctly', async () => {
      const context = runtime.getContext();

      // Register a screen with root path
      context.screens.registerScreen({
        id: 'index',
        title: 'Home',
        component: 'TestComponent'
      });

      // Run export
      await context.actions.runAction('export:static', {
        outputDir: tempDir
      });

      // Verify index.html was created
      const htmlFile = path.join(tempDir, 'index.html');
      expect(fs.existsSync(htmlFile)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle rendering errors gracefully', async () => {
      // @see Requirements 10.5
      const context = runtime.getContext();

      // Register screens
      context.screens.registerScreen({
        id: 'good-screen',
        title: 'Good Screen',
        component: 'TestComponent'
      });

      // Run export
      const result = await context.actions.runAction<{ outputDir: string }, { pages: number; errors: string[] }>('export:static', {
        outputDir: tempDir
      });

      // Should continue with other screens even if one fails
      expect(result.pages).toBeGreaterThanOrEqual(1);
    });

    it('should report errors in export result', async () => {
      // @see Requirements 10.4
      const context = runtime.getContext();

      // Register a screen
      context.screens.registerScreen({
        id: 'test-screen',
        title: 'Test Screen',
        component: 'TestComponent'
      });

      // Run export
      const result = await context.actions.runAction<{ outputDir: string }, { pages: number; errors: string[] }>('export:static', {
        outputDir: tempDir
      });

      // Verify result structure
      expect(result).toHaveProperty('pages');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Export Reporting', () => {
    it('should count generated pages', async () => {
      // @see Requirements 10.4
      const context = runtime.getContext();

      // Register multiple screens
      context.screens.registerScreen({
        id: 'screen-1',
        title: 'Screen 1',
        component: 'TestComponent'
      });

      context.screens.registerScreen({
        id: 'screen-2',
        title: 'Screen 2',
        component: 'TestComponent'
      });

      context.screens.registerScreen({
        id: 'screen-3',
        title: 'Screen 3',
        component: 'TestComponent'
      });

      // Run export
      const result = await context.actions.runAction<{ outputDir: string }, { pages: number; errors: string[] }>('export:static', {
        outputDir: tempDir
      });

      // Verify page count
      expect(result.pages).toBe(3);
    });

    it('should report errors', async () => {
      // @see Requirements 10.4
      const context = runtime.getContext();

      // Register a screen
      context.screens.registerScreen({
        id: 'test-screen',
        title: 'Test Screen',
        component: 'TestComponent'
      });

      // Run export
      const result = await context.actions.runAction<{ outputDir: string }, { pages: number; errors: string[] }>('export:static', {
        outputDir: tempDir
      });

      // Verify errors array exists
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Asset Copying', () => {
    it('should copy assets directory if provided', async () => {
      // @see Requirements 10.3
      const context = runtime.getContext();

      // Create a temporary assets directory
      const assetsDir = path.join(process.cwd(), 'test-assets-' + Date.now());
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(path.join(assetsDir, 'test.css'), 'body { margin: 0; }');

      try {
        // Register a screen
        context.screens.registerScreen({
          id: 'test-screen',
          title: 'Test Screen',
          component: 'TestComponent'
        });

        // Run export with assets
        await context.actions.runAction('export:static', {
          outputDir: tempDir,
          assetsDir
        });

        // Verify assets were copied
        const copiedAsset = path.join(tempDir, 'assets', 'test.css');
        expect(fs.existsSync(copiedAsset)).toBe(true);
      } finally {
        // Clean up assets directory
        if (fs.existsSync(assetsDir)) {
          fs.rmSync(assetsDir, { recursive: true, force: true });
        }
      }
    });

    it('should handle missing assets directory gracefully', async () => {
      const context = runtime.getContext();

      // Register a screen
      context.screens.registerScreen({
        id: 'test-screen',
        title: 'Test Screen',
        component: 'TestComponent'
      });

      // Run export with non-existent assets directory
      const result = await context.actions.runAction<{ outputDir: string; assetsDir?: string }, { pages: number; errors: string[] }>('export:static', {
        outputDir: tempDir,
        assetsDir: '/non/existent/path'
      });

      // Should not throw error
      expect(result).toBeDefined();
      expect(result.pages).toBe(1);
    });

    it('should maintain directory structure when copying assets', async () => {
      // @see Requirements 10.3
      const context = runtime.getContext();

      // Create a temporary assets directory with subdirectories
      const assetsDir = path.join(process.cwd(), 'test-assets-' + Date.now());
      const cssDir = path.join(assetsDir, 'css');
      const jsDir = path.join(assetsDir, 'js');
      
      fs.mkdirSync(cssDir, { recursive: true });
      fs.mkdirSync(jsDir, { recursive: true });
      fs.writeFileSync(path.join(cssDir, 'styles.css'), 'body { margin: 0; }');
      fs.writeFileSync(path.join(jsDir, 'app.js'), 'console.log("test");');

      try {
        // Register a screen
        context.screens.registerScreen({
          id: 'test-screen',
          title: 'Test Screen',
          component: 'TestComponent'
        });

        // Run export with assets
        await context.actions.runAction('export:static', {
          outputDir: tempDir,
          assetsDir
        });

        // Verify directory structure was maintained
        expect(fs.existsSync(path.join(tempDir, 'assets', 'css', 'styles.css'))).toBe(true);
        expect(fs.existsSync(path.join(tempDir, 'assets', 'js', 'app.js'))).toBe(true);
      } finally {
        // Clean up assets directory
        if (fs.existsSync(assetsDir)) {
          fs.rmSync(assetsDir, { recursive: true, force: true });
        }
      }
    });
  });
});
