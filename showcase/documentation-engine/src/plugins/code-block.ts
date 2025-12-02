/**
 * Code Block Plugin (Prism.js)
 * 
 * Provides syntax highlighting for code blocks using Prism.js.
 * Integrates with theme system for light/dark mode support.
 * 
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import Prism from 'prismjs';
// Note: We'll handle themes via CSS in the Layout component instead of importing both
// to avoid conflicts. For now, using default Prism styling.
// Import common language support
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import type { ComponentType } from 'react';
import type { RuntimeContextWithComponents } from './component-registry.js';
import { CodeBlock } from '../components/CodeBlock.js';

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
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Create the code block plugin
 * 
 * This plugin provides syntax highlighting using Prism.js.
 * It integrates with the theme system for light/dark mode support.
 * 
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export function createCodeBlockPlugin(): PluginDefinition {
  let currentTheme: 'light' | 'dark' = 'light';

  // Code block plugin implementation
  const codeBlockPlugin: CodeBlockPlugin = {
    highlight(code: string, language: string): string {
      try {
        // Normalize language name
        const lang = language.toLowerCase();
        
        // Check if language is supported by Prism
        if (Prism.languages[lang]) {
          // Highlight the code
          const highlighted = Prism.highlight(code, Prism.languages[lang], lang);
          
          // Wrap in pre/code tags with simple styling
          return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
        } else {
          // Language not supported, return plain code
          return `<pre><code>${escapeHtml(code)}</code></pre>`;
        }
      } catch (error) {
        // Fallback on error
        return `<pre><code>${escapeHtml(code)}</code></pre>`;
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
    setup(context: RuntimeContext): void {
      // Extend the runtime context with code block plugin
      (context as RuntimeContextWithCodeBlock).codeBlock = codeBlockPlugin;

      console.log('[code-block] Using Prism.js for syntax highlighting');

      // Listen to theme:changed events to update syntax highlighting theme
      context.events.on('theme:changed', (data: any) => {
        if (data && (data.theme === 'light' || data.theme === 'dark')) {
          codeBlockPlugin.setTheme(data.theme);
          console.log(`[code-block] Theme updated to ${data.theme}`);
        }
      });

      // Register CodeBlock component in component registry
      const contextWithComponents = context as RuntimeContextWithComponents;
      
      if (contextWithComponents.componentRegistry) {
        contextWithComponents.componentRegistry.register('CodeBlock', CodeBlock as ComponentType<any>);
        console.log('[code-block] CodeBlock component registered');
      } else {
        console.warn('[code-block] Component registry not available, CodeBlock component not registered');
      }
    }
  };
}
