/**
 * Unit tests for Search Plugin
 * 
 * Tests search indexing, query execution, and result formatting.
 * 
 * @see Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 11.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { createSearchPlugin } from '../../src/plugins/search.js';
import type { RuntimeContextWithSearch, SearchResult } from '../../src/plugins/search.js';
import type { ScreenMetadata } from '../../src/plugins/markdown.js';

describe('Search Plugin', () => {
  let runtime: Runtime;
  let context: RuntimeContextWithSearch;

  beforeEach(async () => {
    runtime = new Runtime();
    const searchPlugin = createSearchPlugin();
    runtime.registerPlugin(searchPlugin);
    await runtime.initialize();
    context = runtime.getContext() as RuntimeContextWithSearch;
  });

  describe('Page Indexing', () => {
    it('should index page when markdown:page-registered event is emitted', () => {
      // @see Requirements 4.1
      const metadata: ScreenMetadata = {
        path: '/test-page',
        frontmatter: { title: 'Test Page' },
        headings: [
          { level: 1, text: 'Introduction', id: 'introduction' },
          { level: 2, text: 'Getting Started', id: 'getting-started' }
        ],
        content: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'text', value: 'This is test content about plugins.' }
              ]
            }
          ]
        } as any,
        codeBlocks: [],
        components: []
      };

      // Emit page registered event
      context.events.emit('markdown:page-registered', {
        id: 'test-page',
        metadata
      });

      // Search for indexed content
      const results = context.search.search('plugins');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('test-page');
      expect(results[0].title).toBe('Test Page');
    });

    it('should index title, content, and headings', () => {
      // @see Requirements 4.1
      const metadata: ScreenMetadata = {
        path: '/advanced',
        frontmatter: { title: 'Advanced Topics' },
        headings: [
          { level: 1, text: 'Performance Optimization', id: 'performance' }
        ],
        content: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'text', value: 'Learn about caching strategies.' }
              ]
            }
          ]
        } as any,
        codeBlocks: [],
        components: []
      };

      context.events.emit('markdown:page-registered', {
        id: 'advanced',
        metadata
      });

      // Should find by title
      let results = context.search.search('Advanced');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('advanced');

      // Should find by heading
      results = context.search.search('Performance');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('advanced');

      // Should find by content
      results = context.search.search('caching');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('advanced');
    });
  });

  describe('Search Query Execution', () => {
    beforeEach(() => {
      // Index multiple pages
      const pages = [
        {
          id: 'intro',
          metadata: {
            path: '/intro',
            frontmatter: { title: 'Introduction' },
            headings: [{ level: 1, text: 'Welcome', id: 'welcome' }],
            content: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'text', value: 'Welcome to our documentation.' }]
                }
              ]
            } as any,
            codeBlocks: [],
            components: []
          }
        },
        {
          id: 'plugins',
          metadata: {
            path: '/plugins',
            frontmatter: { title: 'Plugin Guide' },
            headings: [{ level: 1, text: 'Creating Plugins', id: 'creating' }],
            content: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'text', value: 'Learn how to create custom plugins.' }]
                }
              ]
            } as any,
            codeBlocks: [],
            components: []
          }
        }
      ];

      for (const page of pages) {
        context.events.emit('markdown:page-registered', page);
      }
    });

    it('should return matching pages ranked by relevance', () => {
      // @see Requirements 4.2
      const results = context.search.search('plugins');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('plugins');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should return empty array for empty query', () => {
      // @see Requirements 4.5
      const results = context.search.search('');
      expect(results).toEqual([]);
    });

    it('should return empty array for no matches', () => {
      // @see Requirements 4.5
      const results = context.search.search('nonexistent-term-xyz');
      expect(results).toEqual([]);
    });

    it('should support fuzzy matching', () => {
      // @see Requirements 4.2
      const results = context.search.search('plugn'); // Typo
      expect(results.length).toBeGreaterThan(0);
    });

    it('should support prefix matching', () => {
      // @see Requirements 4.2
      const results = context.search.search('plug');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('plugins');
    });
  });

  describe('Search Result Formatting', () => {
    beforeEach(() => {
      const metadata: ScreenMetadata = {
        path: '/formatting',
        frontmatter: { title: 'Formatting Guide' },
        headings: [{ level: 1, text: 'Text Formatting', id: 'text' }],
        content: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                { 
                  type: 'text', 
                  value: 'This is a long paragraph with lots of content. It contains information about formatting and styling. The search term appears here in the middle of the text.' 
                }
              ]
            }
          ]
        } as any,
        codeBlocks: [],
        components: []
      };

      context.events.emit('markdown:page-registered', {
        id: 'formatting',
        metadata
      });
    });

    it('should include title, path, and snippet in results', () => {
      // @see Requirements 4.3
      const results = context.search.search('formatting');
      
      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      
      expect(result.title).toBe('Formatting Guide');
      expect(result.path).toBe('/formatting');
      expect(result.snippet).toBeTruthy();
      expect(typeof result.snippet).toBe('string');
    });

    it('should extract snippet around search term', () => {
      // @see Requirements 4.3
      const results = context.search.search('styling');
      
      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      
      expect(result.snippet).toContain('styling');
    });

    it('should include ellipsis for truncated snippets', () => {
      // @see Requirements 4.3
      const results = context.search.search('middle');
      
      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      
      // Should have ellipsis since term is in middle of long text
      expect(result.snippet).toMatch(/\.\.\./);
    });
  });

  describe('Search Action', () => {
    beforeEach(() => {
      const metadata: ScreenMetadata = {
        path: '/actions',
        frontmatter: { title: 'Actions Guide' },
        headings: [],
        content: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'Learn about actions.' }]
            }
          ]
        } as any,
        codeBlocks: [],
        components: []
      };

      context.events.emit('markdown:page-registered', {
        id: 'actions',
        metadata
      });
    });

    it('should register search:query action', async () => {
      // @see Requirements 4.2
      // Verify action is registered by attempting to execute it
      // If not registered, runAction will throw an error
      const results = await context.actions.runAction('search:query', {
        term: 'test'
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should execute search via action', async () => {
      // @see Requirements 4.2
      const results = await context.actions.runAction<{ term: string }, SearchResult[]>('search:query', {
        term: 'actions'
      });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('actions');
    });

    it('should emit search:results event', async () => {
      // @see Requirements 11.3
      let eventEmitted = false;
      let eventData: any = null;

      context.events.on('search:results', (data) => {
        eventEmitted = true;
        eventData = data;
      });

      await context.actions.runAction('search:query', {
        term: 'actions'
      });

      expect(eventEmitted).toBe(true);
      expect(eventData).toBeDefined();
      expect(eventData.term).toBe('actions');
      expect(Array.isArray(eventData.results)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid page data gracefully', () => {
      // Emit event with invalid data
      context.events.emit('markdown:page-registered', {
        id: null,
        metadata: null
      });

      // Should not crash, search should still work
      const results = context.search.search('test');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle missing metadata fields', () => {
      const metadata: ScreenMetadata = {
        path: '/minimal',
        frontmatter: {},
        headings: [],
        content: { type: 'root', children: [] } as any,
        codeBlocks: [],
        components: []
      };

      context.events.emit('markdown:page-registered', {
        id: 'minimal',
        metadata
      });

      // Should not crash
      const results = context.search.search('minimal');
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
