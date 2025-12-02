/**
 * Tests for Markdown Loader Plugin
 * 
 * Validates that the markdown loader plugin correctly loads pre-parsed content.
 * 
 * @see Requirements 15.3, 15.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { createMarkdownLoaderPlugin } from '../../src/plugins/markdown-loader.js';
import type { ScreenMetadata } from '../../src/plugins/markdown-loader.js';

describe('Markdown Loader Plugin', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  describe('Pre-parsed content loading', () => {
    it('should load pre-parsed content from JSON', async () => {
      // Mock parsed content
      const mockParsedContent: ScreenMetadata[] = [
        {
          id: 'test-page',
          path: '/test',
          frontmatter: {
            title: 'Test Page',
            description: 'A test page'
          },
          headings: [
            { level: 1, text: 'Test Heading', id: 'test-heading' }
          ],
          content: {
            type: 'root',
            children: []
          },
          codeBlocks: [],
          components: []
        }
      ];

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockParsedContent
      });

      // Register plugin
      const plugin = createMarkdownLoaderPlugin('/test-content.json');
      runtime.registerPlugin(plugin);

      // Initialize runtime
      await runtime.initialize();

      // Verify screen was registered
      const context = runtime as any;
      const screen = context.screens?.getScreen('test-page');
      expect(screen).toBeDefined();
      expect(screen?.title).toBe('Test Page');
      expect(screen?.component).toBe('MarkdownPage');
    });

    it('should emit page-registered events for each loaded page', async () => {
      const mockParsedContent: ScreenMetadata[] = [
        {
          id: 'page-1',
          path: '/page-1',
          frontmatter: { title: 'Page 1' },
          headings: [],
          content: { type: 'root', children: [] },
          codeBlocks: [],
          components: []
        },
        {
          id: 'page-2',
          path: '/page-2',
          frontmatter: { title: 'Page 2' },
          headings: [],
          content: { type: 'root', children: [] },
          codeBlocks: [],
          components: []
        }
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockParsedContent
      });

      const events: any[] = [];
      
      // Create a plugin that listens to events
      const listenerPlugin = {
        name: 'event-listener',
        version: '1.0.0',
        setup(context: any) {
          context.events.on('markdown:page-registered', (data: any) => {
            events.push(data);
          });
        }
      };

      runtime.registerPlugin(listenerPlugin);
      const plugin = createMarkdownLoaderPlugin('/test-content.json');
      runtime.registerPlugin(plugin);
      await runtime.initialize();

      expect(events).toHaveLength(2);
      expect(events[0].id).toBe('page-1');
      expect(events[1].id).toBe('page-2');
    });

    it('should provide metadata access through context', async () => {
      const mockParsedContent: ScreenMetadata[] = [
        {
          id: 'test-page',
          path: '/test',
          frontmatter: { title: 'Test' },
          headings: [{ level: 1, text: 'Heading', id: 'heading' }],
          content: { type: 'root', children: [] },
          codeBlocks: [{ language: 'javascript', code: 'console.log("test");' }],
          components: [{ name: 'Callout', props: { type: 'info' } }]
        }
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockParsedContent
      });

      const plugin = createMarkdownLoaderPlugin('/test-content.json');
      runtime.registerPlugin(plugin);
      await runtime.initialize();

      // Access metadata through context.markdown (plugin stores itself there)
      const context = runtime.getContext() as any;
      const metadata = context.markdown?.getMetadata('test-page');

      expect(metadata).toBeDefined();
      expect(metadata?.frontmatter.title).toBe('Test');
      expect(metadata?.headings).toHaveLength(1);
      expect(metadata?.codeBlocks).toHaveLength(1);
      expect(metadata?.components).toHaveLength(1);
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      });

      const plugin = createMarkdownLoaderPlugin('/missing.json');
      runtime.registerPlugin(plugin);

      await expect(runtime.initialize()).rejects.toThrow('Failed to load parsed content');
    });

    it('should handle invalid JSON gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      const plugin = createMarkdownLoaderPlugin('/invalid.json');
      runtime.registerPlugin(plugin);

      await expect(runtime.initialize()).rejects.toThrow();
    });

    it('should use default URL when none provided', async () => {
      const mockParsedContent: ScreenMetadata[] = [];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockParsedContent
      });

      const plugin = createMarkdownLoaderPlugin();
      runtime.registerPlugin(plugin);
      await runtime.initialize();

      expect(global.fetch).toHaveBeenCalledWith('/parsed-content.json');
    });

    it('should handle empty parsed content array', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => []
      });

      const plugin = createMarkdownLoaderPlugin('/empty.json');
      runtime.registerPlugin(plugin);
      await runtime.initialize();

      // Should not throw, just register no screens
      const context = runtime as any;
      const screens = context.screens?.getAllScreens() || [];
      expect(screens).toHaveLength(0);
    });
  });

  describe('Metadata retrieval', () => {
    it('should return undefined for non-existent screen', async () => {
      const mockParsedContent: ScreenMetadata[] = [
        {
          id: 'existing-page',
          path: '/existing',
          frontmatter: {},
          headings: [],
          content: { type: 'root', children: [] },
          codeBlocks: [],
          components: []
        }
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockParsedContent
      });

      const plugin = createMarkdownLoaderPlugin('/test.json');
      runtime.registerPlugin(plugin);
      await runtime.initialize();

      const context = runtime.getContext() as any;
      const metadata = context.markdown?.getMetadata('non-existent');

      expect(metadata).toBeUndefined();
    });

    it('should return all metadata', async () => {
      const mockParsedContent: ScreenMetadata[] = [
        {
          id: 'page-1',
          path: '/page-1',
          frontmatter: {},
          headings: [],
          content: { type: 'root', children: [] },
          codeBlocks: [],
          components: []
        },
        {
          id: 'page-2',
          path: '/page-2',
          frontmatter: {},
          headings: [],
          content: { type: 'root', children: [] },
          codeBlocks: [],
          components: []
        }
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockParsedContent
      });

      const plugin = createMarkdownLoaderPlugin('/test.json');
      runtime.registerPlugin(plugin);
      await runtime.initialize();

      const context = runtime.getContext() as any;
      const allMetadata = context.markdown?.getAllMetadata();

      expect(allMetadata).toBeInstanceOf(Map);
      expect(allMetadata.size).toBe(2);
      expect(allMetadata.has('page-1')).toBe(true);
      expect(allMetadata.has('page-2')).toBe(true);
    });
  });
});
