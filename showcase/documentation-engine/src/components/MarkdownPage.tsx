/**
 * MarkdownPage Component
 * 
 * Renders markdown content with MDX component resolution and table of contents.
 * 
 * @see Requirements 7.2, 7.5
 */

import React from 'react';
import type { Root } from 'mdast';
import type { Frontmatter, HeadingNode } from '../plugins/markdown.js';

export interface MarkdownPageProps {
  content: Root;
  frontmatter: Frontmatter;
  headings: HeadingNode[];
  componentRegistry?: {
    get(name: string): React.ComponentType<any> | undefined;
    getAll?(): Map<string, React.ComponentType<any>>;
  };
  codeBlockPlugin?: {
    highlight(code: string, language: string): string;
  };
}

/**
 * MarkdownPage component
 * 
 * Renders parsed markdown content with MDX components and table of contents.
 * 
 * @see Requirements 7.2, 7.5
 */
export function MarkdownPage({
  content,
  frontmatter,
  headings,
  componentRegistry,
  codeBlockPlugin
}: MarkdownPageProps): JSX.Element {
  /**
   * Render markdown AST to React elements
   * This is a simplified renderer - a full implementation would use
   * a library like react-markdown or mdx-js/react
   */
  const renderContent = (node: any, index: number = 0, parentPath: string = ''): React.ReactNode => {
    if (!node) return null;

    // Generate stable key based on node position and type
    const nodeKey = `${parentPath}-${node.type}-${index}`;

    // Handle text nodes
    if (node.type === 'text') {
      return node.value;
    }

    // Handle paragraphs
    if (node.type === 'paragraph') {
      return (
        <p key={nodeKey}>
          {node.children?.map((child: any, i: number) => renderContent(child, i, nodeKey))}
        </p>
      );
    }

    // Handle headings
    if (node.type === 'heading') {
      const HeadingTag = `h${node.depth}` as keyof JSX.IntrinsicElements;
      const text = node.children
        ?.filter((child: any) => child.type === 'text')
        .map((child: any) => child.value)
        .join('');
      const id = text
        ?.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      return (
        <HeadingTag key={nodeKey} id={id}>
          {node.children?.map((child: any, i: number) => renderContent(child, i, nodeKey))}
        </HeadingTag>
      );
    }

    // Handle code blocks
    if (node.type === 'code') {
      if (codeBlockPlugin) {
        // Use syntax highlighting
        const highlighted = codeBlockPlugin.highlight(node.value, node.lang || 'text');
        return (
          <div key={nodeKey} dangerouslySetInnerHTML={{ __html: highlighted }} />
        );
      } else {
        // Fallback without highlighting
        return (
          <pre key={nodeKey}>
            <code className={`language-${node.lang || 'text'}`}>
              {node.value}
            </code>
          </pre>
        );
      }
    }

    // Handle inline code
    if (node.type === 'inlineCode') {
      return <code key={nodeKey}>{node.value}</code>;
    }

    // Handle lists
    if (node.type === 'list') {
      const ListTag = node.ordered ? 'ol' : 'ul';
      return (
        <ListTag key={nodeKey}>
          {node.children?.map((child: any, i: number) => renderContent(child, i, nodeKey))}
        </ListTag>
      );
    }

    // Handle list items
    if (node.type === 'listItem') {
      return (
        <li key={nodeKey}>
          {node.children?.map((child: any, i: number) => renderContent(child, i, nodeKey))}
        </li>
      );
    }

    // Handle links
    if (node.type === 'link') {
      return (
        <a key={nodeKey} href={node.url}>
          {node.children?.map((child: any, i: number) => renderContent(child, i, nodeKey))}
        </a>
      );
    }

    // Handle emphasis
    if (node.type === 'emphasis') {
      return (
        <em key={nodeKey}>
          {node.children?.map((child: any, i: number) => renderContent(child, i, nodeKey))}
        </em>
      );
    }

    // Handle strong
    if (node.type === 'strong') {
      return (
        <strong key={nodeKey}>
          {node.children?.map((child: any, i: number) => renderContent(child, i, nodeKey))}
        </strong>
      );
    }

    // Handle tables
    if (node.type === 'table') {
      return (
        <div key={nodeKey} className="table-wrapper">
          <table>
            <tbody>
              {node.children?.map((child: any, i: number) => renderContent(child, i, nodeKey))}
            </tbody>
          </table>
        </div>
      );
    }

    // Handle table rows
    if (node.type === 'tableRow') {
      return (
        <tr key={nodeKey}>
          {node.children?.map((child: any, i: number) => renderContent(child, i, nodeKey))}
        </tr>
      );
    }

    // Handle table cells
    if (node.type === 'tableCell') {
      return (
        <td key={nodeKey}>
          {node.children?.map((child: any, i: number) => renderContent(child, i, nodeKey))}
        </td>
      );
    }

    // Handle MDX components
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      if (node.name && componentRegistry) {
        const Component = componentRegistry.get(node.name);
        
        if (Component) {
          // Extract props from attributes
          const props: Record<string, any> = {};
          if (node.attributes) {
            for (const attr of node.attributes) {
              if (attr.type === 'mdxJsxAttribute' && attr.name) {
                // Handle JSX expression values (e.g., {`template literal`})
                if (attr.value && typeof attr.value === 'object' && attr.value.type === 'mdxJsxAttributeValueExpression') {
                  // Extract the actual value from the expression
                  // For template literals, the value is stored in the 'value' field
                  let value = attr.value.value;
                  
                  // Remove surrounding backticks if present (template literal syntax)
                  if (typeof value === 'string' && value.startsWith('`') && value.endsWith('`')) {
                    value = value.slice(1, -1);
                    // Also trim any leading/trailing whitespace that was inside the backticks
                    value = value.trim();
                  }
                  
                  props[attr.name] = value;
                } else {
                  props[attr.name] = attr.value;
                }
              }
            }
          }

          // Render children
          const children = node.children?.map((child: any, i: number) => renderContent(child, i, nodeKey));

          return (
            <Component key={nodeKey} {...props}>
              {children}
            </Component>
          );
        } else {
          // Component not found - display error
          const availableComponents = componentRegistry.getAll 
            ? Array.from(componentRegistry.getAll().keys()).join(', ')
            : 'none';
          
          return (
            <div key={nodeKey} className="component-error">
              <strong>Error:</strong> Component "{node.name}" not found in registry.
              <br />
              Available components: {availableComponents}
            </div>
          );
        }
      }
    }

    // Handle root and other container nodes
    if (node.children) {
      return node.children.map((child: any, i: number) => renderContent(child, i, nodeKey));
    }

    return null;
  };

  const hasToc = headings.length > 0;

  return (
    <div className="markdown-page">
      {/* Page header */}
      {frontmatter.title && (
        <header className="page-header">
          <h1 className="page-title">{frontmatter.title}</h1>
          {frontmatter.description && (
            <p className="page-description">{frontmatter.description}</p>
          )}
        </header>
      )}

      <div className="page-layout">
        {/* Main content */}
        <article className="page-content">
          {renderContent(content)}
        </article>

        {/* Table of contents */}
        {hasToc && (
          <aside className="page-toc">
            <nav aria-label="Table of contents">
              <h2 className="toc-title">On this page</h2>
              <ul className="toc-list">
                {headings.map((heading, index) => (
                  <li
                    key={`${heading.id}-${index}`}
                    className={`toc-item toc-level-${heading.level}`}
                  >
                    <a href={`#${heading.id}`} className="toc-link">
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
      </div>

      <style>{`
        .markdown-page {
          width: 100%;
        }

        .page-header {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .page-title {
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.2;
          color: var(--text-color, #1f2937);
          margin: 0 0 0.5rem 0;
        }

        .page-description {
          font-size: 1.125rem;
          color: var(--text-muted, #6b7280);
          margin: 0;
        }

        .page-layout {
          display: flex;
          gap: 2rem;
        }

        .page-content {
          flex: 1;
          min-width: 0;
          line-height: 1.7;
          color: var(--text-color, #374151);
        }

        .page-content h1,
        .page-content h2,
        .page-content h3,
        .page-content h4,
        .page-content h5,
        .page-content h6 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 600;
          line-height: 1.3;
          color: var(--text-color, #1f2937);
        }

        .page-content h1 { font-size: 2rem; }
        .page-content h2 { font-size: 1.5rem; }
        .page-content h3 { font-size: 1.25rem; }
        .page-content h4 { font-size: 1.125rem; }
        .page-content h5 { font-size: 1rem; }
        .page-content h6 { font-size: 0.875rem; }

        .page-content p {
          margin: 1rem 0;
        }

        .page-content a {
          color: var(--link-color, #3b82f6);
          text-decoration: underline;
          transition: color 0.2s ease;
        }

        .page-content a:hover {
          color: var(--link-hover-color, #2563eb);
        }

        .page-content code {
          padding: 0.125rem 0.25rem;
          background: var(--code-bg, #f3f4f6);
          border-radius: 0.25rem;
          font-size: 0.875em;
          font-family: 'Courier New', monospace;
          color: var(--code-color, #1f2937);
        }

        .page-content pre {
          padding: 1rem;
          background: var(--pre-bg, #f6f8fa);
          color: var(--pre-color, #24292f);
          border-radius: 0.375rem;
          overflow-x: auto;
          margin: 1.5rem 0;
          border: 1px solid var(--border-color, #d0d7de);
        }

        .page-content pre code {
          padding: 0;
          background: none;
          color: inherit;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        /* Prism syntax highlighting colors - Light theme */
        .page-content .token.comment,
        .page-content .token.prolog,
        .page-content .token.doctype,
        .page-content .token.cdata {
          color: #6a737d;
        }

        .page-content .token.punctuation {
          color: #5c6370;
        }

        .page-content .token.property,
        .page-content .token.tag,
        .page-content .token.boolean,
        .page-content .token.number,
        .page-content .token.constant,
        .page-content .token.symbol,
        .page-content .token.deleted {
          color: #005cc5;
        }

        .page-content .token.selector,
        .page-content .token.attr-name,
        .page-content .token.string,
        .page-content .token.char,
        .page-content .token.builtin,
        .page-content .token.inserted {
          color: #22863a;
        }

        .page-content .token.operator,
        .page-content .token.entity,
        .page-content .token.url,
        .page-content .language-css .token.string,
        .page-content .style .token.string {
          color: #d73a49;
        }

        .page-content .token.atrule,
        .page-content .token.attr-value,
        .page-content .token.keyword {
          color: #d73a49;
        }

        .page-content .token.function,
        .page-content .token.class-name {
          color: #6f42c1;
        }

        .page-content .token.regex,
        .page-content .token.important,
        .page-content .token.variable {
          color: #e36209;
        }

        /* Prism syntax highlighting colors - Dark theme */
        [data-theme="dark"] .page-content .token.comment,
        [data-theme="dark"] .page-content .token.prolog,
        [data-theme="dark"] .page-content .token.doctype,
        [data-theme="dark"] .page-content .token.cdata {
          color: #7d8799;
          background: none;
        }

        [data-theme="dark"] .page-content .token.punctuation {
          color: #abb2bf;
          background: none;
        }

        [data-theme="dark"] .page-content .token.property,
        [data-theme="dark"] .page-content .token.tag,
        [data-theme="dark"] .page-content .token.boolean,
        [data-theme="dark"] .page-content .token.number,
        [data-theme="dark"] .page-content .token.constant,
        [data-theme="dark"] .page-content .token.symbol,
        [data-theme="dark"] .page-content .token.deleted {
          color: #79b8ff;
          background: none;
        }

        [data-theme="dark"] .page-content .token.selector,
        [data-theme="dark"] .page-content .token.attr-name,
        [data-theme="dark"] .page-content .token.string,
        [data-theme="dark"] .page-content .token.char,
        [data-theme="dark"] .page-content .token.builtin,
        [data-theme="dark"] .page-content .token.inserted {
          color: #9ecbff;
          background: none;
        }

        [data-theme="dark"] .page-content .token.operator,
        [data-theme="dark"] .page-content .token.entity,
        [data-theme="dark"] .page-content .token.url,
        [data-theme="dark"] .page-content .language-css .token.string,
        [data-theme="dark"] .page-content .style .token.string {
          color: #56b6c2;
          background: none;
        }

        [data-theme="dark"] .page-content .token.atrule,
        [data-theme="dark"] .page-content .token.attr-value,
        [data-theme="dark"] .page-content .token.keyword {
          color: #f97583;
          background: none;
        }

        [data-theme="dark"] .page-content .token.function,
        [data-theme="dark"] .page-content .token.class-name {
          color: #b392f0;
          background: none;
        }

        [data-theme="dark"] .page-content .token.regex,
        [data-theme="dark"] .page-content .token.important,
        [data-theme="dark"] .page-content .token.variable {
          color: #ffab70;
          background: none;
        }

        /* Remove any background from all tokens in dark mode */
        [data-theme="dark"] .page-content pre .token {
          background: transparent !important;
          background-color: transparent !important;
        }

        [data-theme="dark"] .page-content pre code,
        [data-theme="dark"] .page-content pre code *,
        [data-theme="dark"] .page-content pre span {
          background: transparent !important;
          background-color: transparent !important;
        }

        .page-content ul,
        .page-content ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .page-content li {
          margin: 0.5rem 0;
        }

        /* Table styles with horizontal scroll */
        .page-content .table-wrapper {
          overflow-x: auto;
          margin: 1.5rem 0;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .page-content table {
          width: 100%;
          min-width: 600px;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .page-content thead {
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .page-content th,
        .page-content td {
          padding: 0.875rem 1rem;
          text-align: left;
          border-right: 1px solid var(--border-color, #e5e7eb);
          border-bottom: 1px solid var(--border-color, #e5e7eb);
          vertical-align: middle;
        }

        .page-content th:last-child,
        .page-content td:last-child {
          border-right: none;
        }

        .page-content th {
          background: var(--table-header-bg, #f9fafb);
          font-weight: 600;
          color: var(--text-color, #1f2937);
          white-space: nowrap;
          position: relative;
        }

        .page-content th:first-child {
          min-width: 180px;
        }

        .page-content tbody tr:last-child td {
          border-bottom: none;
        }

        .page-content tbody tr:hover {
          background: var(--table-hover-bg, #f9fafb);
        }

        /* Star ratings in tables */
        .page-content td {
          white-space: nowrap;
        }

        /* First column styling (feature names) */
        .page-content td:first-child {
          font-weight: 500;
          color: var(--text-color, #1f2937);
        }

        /* Dark theme table styles */
        [data-theme="dark"] .page-content .table-wrapper {
          border-color: var(--border-color, #404040);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        [data-theme="dark"] .page-content th {
          background: var(--table-header-bg, #2d2d2d);
          border-color: var(--border-color, #404040);
        }

        [data-theme="dark"] .page-content td {
          border-color: var(--border-color, #404040);
        }

        [data-theme="dark"] .page-content tbody tr:hover {
          background: var(--table-hover-bg, #2d2d2d);
        }

        /* Dark theme content styles */
        [data-theme="dark"] .page-content {
          color: var(--text-color, #d1d5db);
        }

        [data-theme="dark"] .page-content h1,
        [data-theme="dark"] .page-content h2,
        [data-theme="dark"] .page-content h3,
        [data-theme="dark"] .page-content h4,
        [data-theme="dark"] .page-content h5,
        [data-theme="dark"] .page-content h6 {
          color: var(--text-color, #e5e7eb);
        }

        [data-theme="dark"] .page-content a {
          color: var(--link-color, #60a5fa);
        }

        [data-theme="dark"] .page-content a:hover {
          color: var(--link-hover-color, #93c5fd);
        }

        [data-theme="dark"] .page-content code {
          background: var(--code-bg, #2d2d2d);
          color: var(--code-color, #e5e7eb);
        }

        [data-theme="dark"] .page-content pre {
          background: var(--pre-bg, #0d1117);
          color: var(--pre-color, #c9d1d9);
          border-color: var(--border-color, #30363d);
        }

        /* Selection colors for code blocks */
        .page-content pre ::selection,
        .page-content pre code ::selection {
          background: rgba(59, 130, 246, 0.3);
          color: inherit;
        }

        [data-theme="dark"] .page-content pre ::selection,
        [data-theme="dark"] .page-content pre code ::selection {
          background: rgba(96, 165, 250, 0.3);
          color: inherit;
        }

        /* Remove any default text highlighting/selection that might appear */
        .page-content pre,
        .page-content pre code {
          -webkit-user-select: text;
          user-select: text;
        }

        [data-theme="dark"] .page-content td:first-child {
          color: var(--text-color, #e5e7eb);
        }

        [data-theme="dark"] .page-header {
          border-bottom-color: var(--border-color, #404040);
        }

        [data-theme="dark"] .page-title {
          color: var(--text-color, #e5e7eb);
        }

        [data-theme="dark"] .page-description {
          color: var(--text-muted, #9ca3af);
        }

        /* Mobile table responsiveness */
        @media (max-width: 768px) {
          .page-content table {
            min-width: 500px;
            font-size: 0.8125rem;
          }

          .page-content th,
          .page-content td {
            padding: 0.625rem 0.75rem;
          }
        }

        .component-error {
          padding: 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 0.375rem;
          color: #991b1b;
          margin: 1rem 0;
        }

        .page-toc {
          width: 240px;
          flex-shrink: 0;
          position: sticky;
          top: 90px;
          align-self: flex-start;
          max-height: calc(100vh - 110px);
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        /* Custom scrollbar for TOC */
        .page-toc::-webkit-scrollbar {
          width: 4px;
        }

        .page-toc::-webkit-scrollbar-track {
          background: transparent;
        }

        .page-toc::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb, #d1d5db);
          border-radius: 2px;
        }

        .page-toc::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover, #9ca3af);
        }

        [data-theme="dark"] .page-toc::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb, #4b5563);
        }

        [data-theme="dark"] .page-toc::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover, #6b7280);
        }

        .toc-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-color, #1f2937);
          margin: 0 0 0.75rem 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          position: sticky;
          top: 0;
          background: var(--bg-color, #ffffff);
          padding: 0.5rem 0;
          z-index: 1;
        }

        [data-theme="dark"] .toc-title {
          background: var(--bg-color, #1a1a1a);
          color: var(--text-color, #e5e7eb);
        }

        .toc-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .toc-item {
          margin: 0.25rem 0;
        }

        .toc-level-1 { padding-left: 0; }
        .toc-level-2 { padding-left: 0.75rem; }
        .toc-level-3 { padding-left: 1.5rem; }
        .toc-level-4 { padding-left: 2.25rem; }
        .toc-level-5 { padding-left: 3rem; }
        .toc-level-6 { padding-left: 3.75rem; }

        .toc-link {
          display: block;
          padding: 0.25rem 0;
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
          text-decoration: none;
          transition: color 0.2s ease;
          line-height: 1.4;
        }

        .toc-link:hover {
          color: var(--link-color, #3b82f6);
        }

        [data-theme="dark"] .toc-link {
          color: var(--text-muted, #9ca3af);
        }

        [data-theme="dark"] .toc-link:hover {
          color: var(--link-color, #60a5fa);
        }

        /* Mobile: show TOC at bottom of content */
        @media (max-width: 1024px) {
          .page-layout {
            flex-direction: column;
          }

          .page-toc {
            position: static;
            width: 100%;
            max-height: none;
            margin-top: 2rem;
            padding: 1rem;
            border-top: 2px solid var(--border-color, #e5e7eb);
            border-radius: 0;
          }

          [data-theme="dark"] .page-toc {
            border-top-color: var(--border-color, #404040);
          }

          .toc-title {
            position: static;
            font-size: 1rem;
            margin-bottom: 1rem;
          }

          .toc-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 0.5rem;
          }

          .toc-item {
            margin: 0;
          }
        }

        /* Very small mobile: single column TOC */
        @media (max-width: 640px) {
          .toc-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
