/**
 * Unit tests for Sidebar Plugin
 * 
 * Tests navigation tree building, sorting, and active page tracking.
 * 
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSidebarPlugin } from '../../src/plugins/sidebar.js';
import type { RuntimeContext } from 'skeleton-crew-runtime';
import type { ScreenMetadata } from '../../src/plugins/markdown.js';

describe('Sidebar Plugin', () => {
  let mockContext: RuntimeContext;
  let mockScreens: Map<string, ScreenMetadata>;

  beforeEach(() => {
    mockScreens = new Map();

    // Create mock context
    mockContext = {
      screens: {
        registerScreen: vi.fn(),
        getScreen: vi.fn(),
        getAllScreens: vi.fn()
      },
      actions: {
        registerAction: vi.fn(),
        runAction: vi.fn()
      },
      plugins: {
        registerPlugin: vi.fn(),
        getPlugin: vi.fn(),
        getAllPlugins: vi.fn(),
        getInitializedPlugins: vi.fn()
      },
      events: {
        emit: vi.fn(),
        emitAsync: vi.fn(),
        on: vi.fn()
      },
      getRuntime: vi.fn()
    } as any;

    // Add markdown plugin mock
    (mockContext as any).markdown = {
      getAllMetadata: () => mockScreens,
      getMetadata: (id: string) => mockScreens.get(id)
    };
  });

  describe('Plugin Setup', () => {
    it('should register sidebar plugin on context', () => {
      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      expect((mockContext as any).sidebar).toBeDefined();
      expect((mockContext as any).sidebar.getNavigationTree).toBeDefined();
      expect((mockContext as any).sidebar.getActivePage).toBeDefined();
      expect((mockContext as any).sidebar.setActivePage).toBeDefined();
    });

    it('should listen to markdown:page-registered events', () => {
      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      expect(mockContext.events.on).toHaveBeenCalledWith(
        'markdown:page-registered',
        expect.any(Function)
      );
    });

    it('should listen to router:navigated events', () => {
      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      expect(mockContext.events.on).toHaveBeenCalledWith(
        'router:navigated',
        expect.any(Function)
      );
    });
  });

  describe('Navigation Tree Building', () => {
    it('should build navigation tree from flat screen list', () => {
      // Add mock screens
      mockScreens.set('index', {
        path: '/',
        frontmatter: { title: 'Home', order: 1 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      mockScreens.set('getting-started', {
        path: '/getting-started',
        frontmatter: { title: 'Getting Started', order: 2 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      const tree = (mockContext as any).sidebar.getNavigationTree();

      expect(tree.root).toHaveLength(2);
      expect(tree.flat.size).toBe(2);
      expect(tree.root[0].id).toBe('index');
      expect(tree.root[1].id).toBe('getting-started');
    });

    it('should organize pages hierarchically based on path structure', () => {
      // Add mock screens with hierarchical paths
      mockScreens.set('guides', {
        path: '/guides',
        frontmatter: { title: 'Guides', order: 1 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      mockScreens.set('guides-plugins', {
        path: '/guides/plugins',
        frontmatter: { title: 'Plugins', order: 1 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      mockScreens.set('guides-themes', {
        path: '/guides/themes',
        frontmatter: { title: 'Themes', order: 2 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      const tree = (mockContext as any).sidebar.getNavigationTree();

      // Should have 1 root item (guides)
      expect(tree.root).toHaveLength(1);
      expect(tree.root[0].id).toBe('guides');

      // Guides should have 2 children
      expect(tree.root[0].children).toHaveLength(2);
      expect(tree.root[0].children[0].id).toBe('guides-plugins');
      expect(tree.root[0].children[1].id).toBe('guides-themes');
    });

    it('should handle pages without parent by adding to root', () => {
      // Add orphan page (parent doesn't exist)
      mockScreens.set('orphan', {
        path: '/nonexistent/orphan',
        frontmatter: { title: 'Orphan Page' },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      const tree = (mockContext as any).sidebar.getNavigationTree();

      // Orphan should be added to root
      expect(tree.root).toHaveLength(1);
      expect(tree.root[0].id).toBe('orphan');
    });
  });

  describe('Sorting Logic', () => {
    it('should sort items by order metadata when present', () => {
      mockScreens.set('page-3', {
        path: '/page-3',
        frontmatter: { title: 'Page 3', order: 3 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      mockScreens.set('page-1', {
        path: '/page-1',
        frontmatter: { title: 'Page 1', order: 1 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      mockScreens.set('page-2', {
        path: '/page-2',
        frontmatter: { title: 'Page 2', order: 2 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      const tree = (mockContext as any).sidebar.getNavigationTree();

      expect(tree.root[0].id).toBe('page-1');
      expect(tree.root[1].id).toBe('page-2');
      expect(tree.root[2].id).toBe('page-3');
    });

    it('should fall back to alphabetical sorting when order is missing', () => {
      mockScreens.set('zebra', {
        path: '/zebra',
        frontmatter: { title: 'Zebra' },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      mockScreens.set('apple', {
        path: '/apple',
        frontmatter: { title: 'Apple' },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      mockScreens.set('banana', {
        path: '/banana',
        frontmatter: { title: 'Banana' },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      const tree = (mockContext as any).sidebar.getNavigationTree();

      expect(tree.root[0].title).toBe('Apple');
      expect(tree.root[1].title).toBe('Banana');
      expect(tree.root[2].title).toBe('Zebra');
    });

    it('should sort by order first, then alphabetically', () => {
      mockScreens.set('zebra', {
        path: '/zebra',
        frontmatter: { title: 'Zebra', order: 1 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      mockScreens.set('apple', {
        path: '/apple',
        frontmatter: { title: 'Apple', order: 1 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      mockScreens.set('banana', {
        path: '/banana',
        frontmatter: { title: 'Banana', order: 2 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      const tree = (mockContext as any).sidebar.getNavigationTree();

      // Order 1 items should come first, sorted alphabetically
      expect(tree.root[0].title).toBe('Apple');
      expect(tree.root[1].title).toBe('Zebra');
      // Order 2 items come after
      expect(tree.root[2].title).toBe('Banana');
    });

    it('should recursively sort children', () => {
      mockScreens.set('guides', {
        path: '/guides',
        frontmatter: { title: 'Guides', order: 1 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      mockScreens.set('guides-zebra', {
        path: '/guides/zebra',
        frontmatter: { title: 'Zebra Guide', order: 2 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      mockScreens.set('guides-apple', {
        path: '/guides/apple',
        frontmatter: { title: 'Apple Guide', order: 1 },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      const tree = (mockContext as any).sidebar.getNavigationTree();

      const guidesItem = tree.root[0];
      expect(guidesItem.children[0].title).toBe('Apple Guide');
      expect(guidesItem.children[1].title).toBe('Zebra Guide');
    });
  });

  describe('Active Page Tracking', () => {
    it('should initialize with no active page', () => {
      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      const activePage = (mockContext as any).sidebar.getActivePage();
      expect(activePage).toBeNull();
    });

    it('should update active page when router:navigated event is emitted', () => {
      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      // Get the event handler
      const onCalls = (mockContext.events.on as any).mock.calls;
      const navigatedHandler = onCalls.find(
        (call: any) => call[0] === 'router:navigated'
      )?.[1];

      expect(navigatedHandler).toBeDefined();

      // Simulate navigation event
      navigatedHandler({ screenId: 'getting-started', path: '/getting-started' });

      const activePage = (mockContext as any).sidebar.getActivePage();
      expect(activePage).toBe('getting-started');
    });

    it('should allow manual setting of active page', () => {
      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      (mockContext as any).sidebar.setActivePage('test-page');

      const activePage = (mockContext as any).sidebar.getActivePage();
      expect(activePage).toBe('test-page');
    });
  });

  describe('Event Integration', () => {
    it('should rebuild navigation tree when markdown:page-registered event is emitted', () => {
      const plugin = createSidebarPlugin();
      plugin.setup(mockContext);

      // Initial tree should be empty
      let tree = (mockContext as any).sidebar.getNavigationTree();
      expect(tree.root).toHaveLength(0);

      // Add a screen
      mockScreens.set('new-page', {
        path: '/new-page',
        frontmatter: { title: 'New Page' },
        headings: [],
        content: {} as any,
        codeBlocks: [],
        components: []
      });

      // Get the event handler
      const onCalls = (mockContext.events.on as any).mock.calls;
      const pageRegisteredHandler = onCalls.find(
        (call: any) => call[0] === 'markdown:page-registered'
      )?.[1];

      expect(pageRegisteredHandler).toBeDefined();

      // Simulate page registered event
      pageRegisteredHandler({ id: 'new-page', metadata: {} });

      // Tree should now include the new page
      tree = (mockContext as any).sidebar.getNavigationTree();
      expect(tree.root).toHaveLength(1);
      expect(tree.root[0].id).toBe('new-page');
    });
  });
});
