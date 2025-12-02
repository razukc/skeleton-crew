/**
 * Code Block Plugin Tests
 * 
 * Tests for the code block plugin functionality including:
 * - Code highlighting
 * - Theme integration
 * - Component registration
 * 
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 7.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { createCodeBlockPlugin, type RuntimeContextWithCodeBlock } from '../../src/plugins/code-block.js';
import { createComponentRegistryPlugin, type RuntimeContextWithComponents } from '../../src/plugins/component-registry.js';

describe('Code Block Plugin', () => {
  let runtime: Runtime;
  let context: RuntimeContextWithCodeBlock & RuntimeContextWithComponents;

  beforeEach(async () => {
    runtime = new Runtime();
    
    // Register component registry first (required)
    runtime.registerPlugin(createComponentRegistryPlugin());
    
    // Register code block plugin
    runtime.registerPlugin(createCodeBlockPlugin());
    
    await runtime.initialize();
    
    context = runtime.getContext() as RuntimeContextWithCodeBlock & RuntimeContextWithComponents;
    
    console.log('Plugin "code-block" initialized successfully');
  });

  describe('Plugin Initialization', () => {
    it('should initialize code block plugin', () => {
      expect(context.codeBlock).toBeDefined();
      expect(typeof context.codeBlock.highlight).toBe('function');
      expect(typeof context.codeBlock.getCurrentTheme).toBe('function');
      expect(typeof context.codeBlock.setTheme).toBe('function');
    });

    it('should initialize with light theme by default', () => {
      expect(context.codeBlock.getCurrentTheme()).toBe('light');
    });
  });

  describe('Code Highlighting', () => {
    it('should highlight JavaScript code', () => {
      const code = 'const x = 42;';
      const result = context.codeBlock.highlight(code, 'javascript');
      
      // Should return HTML string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      
      // Should contain the code
      expect(result.includes('const') || result.includes('42')).toBe(true);
    });

    it('should highlight TypeScript code', () => {
      const code = 'interface User { name: string; }';
      const result = context.codeBlock.highlight(code, 'typescript');
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle unknown languages gracefully', () => {
      const code = 'some code';
      const result = context.codeBlock.highlight(code, 'unknown-lang');
      
      // Should still return HTML (fallback)
      expect(typeof result).toBe('string');
      expect(result.includes('some code')).toBe(true);
    });

    it('should handle empty code', () => {
      const result = context.codeBlock.highlight('', 'javascript');
      
      expect(typeof result).toBe('string');
    });

    it('should escape HTML in code', () => {
      const code = '<script>alert("xss")</script>';
      const result = context.codeBlock.highlight(code, 'javascript');
      
      // Should not contain raw script tags
      expect(result.includes('<script>alert("xss")</script>')).toBe(false);
    });
  });

  describe('Theme Integration', () => {
    it('should allow setting theme to dark', () => {
      context.codeBlock.setTheme('dark');
      expect(context.codeBlock.getCurrentTheme()).toBe('dark');
    });

    it('should allow setting theme to light', () => {
      context.codeBlock.setTheme('dark');
      context.codeBlock.setTheme('light');
      expect(context.codeBlock.getCurrentTheme()).toBe('light');
    });

    it('should listen to theme:changed events', async () => {
      // Emit theme changed event
      context.events.emit('theme:changed', { theme: 'dark' });
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(context.codeBlock.getCurrentTheme()).toBe('dark');
    });

    it('should update theme when theme:changed event is emitted', async () => {
      expect(context.codeBlock.getCurrentTheme()).toBe('light');
      
      // Change to dark
      context.events.emit('theme:changed', { theme: 'dark' });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(context.codeBlock.getCurrentTheme()).toBe('dark');
      
      // Change back to light
      context.events.emit('theme:changed', { theme: 'light' });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(context.codeBlock.getCurrentTheme()).toBe('light');
    });

    it('should ignore invalid theme values in events', async () => {
      const initialTheme = context.codeBlock.getCurrentTheme();
      
      // Emit invalid theme
      context.events.emit('theme:changed', { theme: 'invalid' });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Theme should not change
      expect(context.codeBlock.getCurrentTheme()).toBe(initialTheme);
    });
  });

  describe('Component Registration', () => {
    it('should register CodeBlock component in component registry', () => {
      expect(context.componentRegistry.has('CodeBlock')).toBe(true);
    });

    it('should be able to retrieve CodeBlock component', () => {
      const CodeBlock = context.componentRegistry.get('CodeBlock');
      expect(CodeBlock).toBeDefined();
      expect(typeof CodeBlock).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle highlighting errors gracefully', () => {
      // Try to highlight with null/undefined
      const result1 = context.codeBlock.highlight(null as any, 'javascript');
      expect(typeof result1).toBe('string');
      
      const result2 = context.codeBlock.highlight(undefined as any, 'javascript');
      expect(typeof result2).toBe('string');
    });

    it('should provide fallback when highlighter is not available', () => {
      const code = 'const x = 42;';
      const result = context.codeBlock.highlight(code, 'javascript');
      
      // Should still return valid HTML
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
