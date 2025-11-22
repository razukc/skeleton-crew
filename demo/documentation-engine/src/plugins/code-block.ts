/**
 * Code Block Plugin
 * 
 * Provides syntax highlighting for code blocks using Shiki.
 * Integrates with theme system for light/dark mode support.
 * 
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import type { ComponentType } from 'react';
import type { RuntimeContextWithComponents } from './component-registry.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { getHighlighter, type Highlighter, type Theme } from 'shiki';

/**
 * Code block plugin interface
 */
export interface CodeBlockPlugin {
  /**
   * Highlight code with the current theme
   * @param code - Code to highlight
   * @param language - Programming language
   * @returns Highlighted HTML string
   */
  highlight(code: string, language: string): string;

  /**
   * Get the current theme
   * @returns Current theme ('light' or 'dark')
   */
  getCurrentTheme(): 'light' | 'dark';

  /**
   * Set the theme
   * @param theme - Theme to set ('light' or 'dark')
   */
  setTheme(theme: 'light' | 'dark'): void;
}

/**
 * Extended RuntimeContext with code block plugin
 */
export interface RuntimeContextWithCodeBlock extends RuntimeContext {
  codeBlock: CodeBlockPlugin;
}

/**
 * Shiki theme names for light and dark modes
 */
const LIGHT_THEME: Theme = 'github-light';
const DARK_THEME: Theme = 'github-dark';

/**
 * Create the code block plugin
 * 
 * This plugin provides syntax highlighting using Shiki.
 * It loads language grammars and themes, and integrates with the theme system.
 * 
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export function createCodeBlockPlugin(): PluginDefinition {
  let highlighter: Highlighter | null = null;
  let currentTheme: 'light' | 'dark' = 'light';
  
  // Store unsubscribe function for cleanup
  let unsubscribeThemeChanged: (() => void) | null = null;

  // Code block plugin implementation
  const codeBlockPlugin: CodeBlockPlugin = {
    highlight(code: string, language: string): string {
      if (!highlighter) {
        // Fallback if highlighter not initialized
        return `<pre><code>${escapeHtml(code)}</code></pre>`;
      }

      try {
        // Get the theme name based on current theme
        const themeName = currentTheme === 'dark' ? DARK_THEME : LIGHT_THEME;

        // Highlight the code
        // @see Requirements 5.1
        const html = highlighter.codeToHtml(code, {
          lang: language,
          theme: themeName
        });

        return html;
      } catch (error) {
        console.error(`Error highlighting code (${language}):`, error);
        // Fallback to plain code block
        return `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
      }
    },

    getCurrentTheme(): 'light' | 'dark' {
      return currentTheme;
    },

    setTheme(theme: 'light' | 'dark'): void {
      currentTheme = theme;
    }
  };

  return {
    name: 'code-block',
    version: '1.0.0',
    async setup(context: RuntimeContext): Promise<void> {
      // Extend the runtime context with code block plugin
      (context as RuntimeContextWithCodeBlock).codeBlock = codeBlockPlugin;

      try {
        // Initialize Shiki highlighter with themes and common languages
        // @see Requirements 5.1
        highlighter = await getHighlighter({
          themes: [LIGHT_THEME, DARK_THEME],
          langs: [
            'javascript',
            'typescript',
            'jsx',
            'tsx',
            'json',
            'html',
            'css',
            'bash',
            'shell',
            'markdown',
            'yaml',
            'python',
            'java',
            'go',
            'rust',
            'c',
            'cpp',
            'csharp',
            'php',
            'ruby',
            'sql'
          ]
        });

        console.log('[code-block] Shiki highlighter initialized successfully');
      } catch (error: any) {
        console.error('[code-block] Failed to initialize Shiki:', error);
        console.error('[code-block] Error details:', error.message, error.stack);
        // Continue without highlighter - will use fallback
      }

      // Listen to theme:changed events to update syntax highlighting theme
      // @see Requirements 5.5
      unsubscribeThemeChanged = context.events.on('theme:changed', (data: any) => {
        if (data && (data.theme === 'light' || data.theme === 'dark')) {
          codeBlockPlugin.setTheme(data.theme);
          console.log(`[code-block] Theme updated to ${data.theme}`);
        }
      });

      // Register CodeBlock component in component registry
      // @see Requirements 7.4
      const contextWithComponents = context as RuntimeContextWithComponents & RuntimeContextWithCodeBlock;
      if (contextWithComponents.componentRegistry) {
        // Create a wrapper component that passes the context
        const CodeBlockWithContext: ComponentType<any> = (props: any) => {
          return CodeBlock({ ...props, context: contextWithComponents });
        };

        contextWithComponents.componentRegistry.register('CodeBlock', CodeBlockWithContext);
        console.log('[code-block] CodeBlock component registered');
      } else {
        console.warn('[code-block] Component registry not available, CodeBlock component not registered');
      }
    },
    dispose(): void {
      // Clean up event listener
      if (unsubscribeThemeChanged) unsubscribeThemeChanged();
      
      // Clean up highlighter
      highlighter = null;
      
      console.log('[code-block] Plugin disposed');
    }
  };
}

/**
 * Escape HTML special characters
 * 
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
}
