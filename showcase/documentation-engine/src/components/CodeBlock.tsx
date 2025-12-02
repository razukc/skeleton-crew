/**
 * CodeBlock Component
 * 
 * Renders syntax-highlighted code blocks with line numbers and copy functionality.
 * Integrates with the code-block plugin for syntax highlighting.
 * 
 * @see Requirements 5.1, 5.2, 5.3, 5.4
 */

import React, { useState, useEffect } from 'react';
import type { RuntimeContextWithCodeBlock } from '../plugins/code-block.js';

/**
 * CodeBlock component props
 */
export interface CodeBlockProps {
  /**
   * Code content to display
   */
  code?: string;
  
  /**
   * Programming language for syntax highlighting
   */
  language?: string;
  
  /**
   * Whether to show line numbers (default: true)
   */
  showLineNumbers?: boolean;
  
  /**
   * Lines to highlight (e.g., [1, 3, 5])
   */
  highlightLines?: number[];
  
  /**
   * Runtime context for accessing code block plugin
   */
  context?: RuntimeContextWithCodeBlock;
  
  /**
   * Children (code content can be passed as children)
   */
  children?: string;
}

/**
 * CodeBlock component
 * 
 * Renders a code block with syntax highlighting, line numbers, and copy button.
 * 
 * @see Requirements 5.1, 5.2, 5.3, 5.4
 */
export function CodeBlock({
  code: codeProp,
  language = 'text',
  showLineNumbers = true,
  highlightLines = [],
  context,
  children
}: CodeBlockProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  
  // Use code from props or children
  const code = codeProp || (typeof children === 'string' ? children : '');

  // Highlight code when component mounts or code/language changes
  useEffect(() => {
    if (context?.codeBlock) {
      // Use the code block plugin to highlight
      // @see Requirements 5.1
      const html = context.codeBlock.highlight(code, language);
      setHighlightedHtml(html);
    } else {
      // Fallback: render plain code
      setHighlightedHtml(`<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`);
    }
  }, [code, language, context]);

  /**
   * Handle copy to clipboard
   * @see Requirements 5.4
   */
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  /**
   * Generate line numbers
   * @see Requirements 5.2
   */
  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="code-block-container" style={styles.container}>
      {/* Copy button - shown on hover */}
      {/* @see Requirements 5.3, 5.4 */}
      <button
        className="code-block-copy-button"
        onClick={handleCopy}
        style={styles.copyButton}
        title="Copy to clipboard"
        aria-label="Copy code to clipboard"
      >
        {copied ? '✓ Copied!' : '📋 Copy'}
      </button>

      <div className="code-block-wrapper" style={styles.wrapper}>
        {/* Line numbers */}
        {/* @see Requirements 5.2 */}
        {showLineNumbers && (
          <div className="code-block-line-numbers" style={styles.lineNumbers}>
            {lineNumbers.map(lineNum => (
              <div
                key={lineNum}
                className={highlightLines.includes(lineNum) ? 'highlighted' : ''}
                style={{
                  ...styles.lineNumber,
                  ...(highlightLines.includes(lineNum) ? styles.highlightedLine : {})
                }}
              >
                {lineNum}
              </div>
            ))}
          </div>
        )}

        {/* Highlighted code */}
        {/* @see Requirements 5.1 */}
        <div
          className="code-block-content"
          style={styles.content}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </div>
    </div>
  );
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

/**
 * Basic styles for the code block component
 * These can be overridden by external CSS
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    marginTop: '1rem',
    marginBottom: '1rem',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    backgroundColor: '#f6f8fa',
    border: '1px solid #d0d7de'
  },
  copyButton: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    padding: '0.25rem 0.5rem',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff',
    border: '1px solid #d0d7de',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    zIndex: 10,
    opacity: 0.8,
    transition: 'opacity 0.2s'
  },
  wrapper: {
    display: 'flex',
    overflow: 'auto'
  },
  lineNumbers: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem 0.5rem',
    backgroundColor: '#f6f8fa',
    borderRight: '1px solid #d0d7de',
    userSelect: 'none',
    minWidth: '3rem',
    textAlign: 'right'
  },
  lineNumber: {
    fontSize: '0.875rem',
    lineHeight: '1.5',
    color: '#57606a',
    fontFamily: 'monospace'
  },
  highlightedLine: {
    backgroundColor: '#fff8c5',
    fontWeight: 'bold'
  },
  content: {
    flex: 1,
    overflow: 'auto'
  }
};
