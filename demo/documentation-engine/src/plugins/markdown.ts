/**
 * Markdown Plugin
 * 
 * Parses markdown/MDX files from the docs directory and registers them as screens.
 * Extracts frontmatter, headings, code blocks, and MDX component references.
 * 
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 7.1, 11.1
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import type { Root, Code, Heading, Yaml } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';
import { visit } from 'unist-util-visit';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Frontmatter metadata extracted from markdown files
 */
export interface Frontmatter {
  title?: string;
  description?: string;
  path?: string;
  order?: number;
  [key: string]: any;
}

/**
 * Heading extracted from markdown
 */
export interface HeadingNode {
  level: number;
  text: string;
  id: string;
}

/**
 * Code block extracted from markdown
 */
export interface CodeBlockNode {
  language: string;
  code: string;
  meta?: string;
}

/**
 * MDX component reference
 */
export interface ComponentReference {
  name: string;
  props: Record<string, any>;
}

/**
 * Parsed markdown metadata
 */
export interface ParsedMarkdown {
  frontmatter: Frontmatter;
  headings: HeadingNode[];
  content: Root;
  codeBlocks: CodeBlockNode[];
  components: ComponentReference[];
}

/**
 * Markdown file information
 */
export interface MarkdownFile {
  id: string;
  path: string;
  name: string;
  content: string;
}

/**
 * Parse YAML frontmatter
 */
function parseFrontmatter(yamlContent: string): Frontmatter {
  const frontmatter: Frontmatter = {};
  
  // Simple YAML parser for common frontmatter fields
  const lines = yamlContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      // Parse numbers
      if (/^\d+$/.test(value.trim())) {
        frontmatter[key] = parseInt(value.trim(), 10);
      } else {
        // Remove quotes if present
        frontmatter[key] = value.trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  
  return frontmatter;
}

/**
 * Generate heading ID from text
 */
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Parse markdown content and extract metadata
 */
async function parseMarkdown(content: string): Promise<ParsedMarkdown> {
  const frontmatter: Frontmatter = {};
  const headings: HeadingNode[] = [];
  const codeBlocks: CodeBlockNode[] = [];
  const components: ComponentReference[] = [];

  // Create unified processor with plugins
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkMdx)
    .use(remarkGfm);

  // Parse the markdown
  const ast = processor.parse(content) as Root;

  // Visit all nodes in the AST
  visit(ast, (node: any) => {
    // Extract frontmatter
    if (node.type === 'yaml') {
      const yamlNode = node as Yaml;
      Object.assign(frontmatter, parseFrontmatter(yamlNode.value));
    }

    // Extract headings
    if (node.type === 'heading') {
      const headingNode = node as Heading;
      const text = headingNode.children
        .filter((child: any) => child.type === 'text')
        .map((child: any) => child.value)
        .join('');
      
      headings.push({
        level: headingNode.depth,
        text,
        id: generateHeadingId(text)
      });
    }

    // Extract code blocks
    if (node.type === 'code') {
      const codeNode = node as Code;
      codeBlocks.push({
        language: codeNode.lang || 'text',
        code: codeNode.value,
        meta: codeNode.meta || undefined
      });
    }

    // Extract MDX components
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      const mdxNode = node as MdxJsxFlowElement;
      if (mdxNode.name) {
        const props: Record<string, any> = {};
        
        // Extract props from attributes
        if (mdxNode.attributes) {
          for (const attr of mdxNode.attributes) {
            if (attr.type === 'mdxJsxAttribute' && attr.name) {
              props[attr.name] = attr.value;
            }
          }
        }

        components.push({
          name: mdxNode.name,
          props
        });
      }
    }
  });

  return {
    frontmatter,
    headings,
    content: ast,
    codeBlocks,
    components
  };
}

/**
 * Scan directory for markdown files recursively
 */
function scanDirectory(dirPath: string, baseDir: string = dirPath): MarkdownFile[] {
  const files: MarkdownFile[] = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      files.push(...scanDirectory(fullPath, baseDir));
    } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      // Read markdown file
      const content = fs.readFileSync(fullPath, 'utf-8');
      const relativePath = path.relative(baseDir, fullPath);
      const id = relativePath
        .replace(/\.(md|mdx)$/i, '')
        .replace(/\\/g, '/')
        .replace(/\//g, '-');

      files.push({
        id,
        path: relativePath,
        name: entry.name,
        content
      });
    }
  }

  return files;
}

/**
 * Screen metadata storage
 */
export interface ScreenMetadata {
  path: string;
  frontmatter: Frontmatter;
  headings: HeadingNode[];
  content: Root;
  codeBlocks: CodeBlockNode[];
  components: ComponentReference[];
}

/**
 * Markdown plugin interface
 */
export interface MarkdownPlugin {
  /**
   * Get metadata for a screen
   * @param screenId - Screen identifier
   * @returns Screen metadata or undefined if not found
   */
  getMetadata(screenId: string): ScreenMetadata | undefined;

  /**
   * Get all screen metadata
   * @returns Map of screen IDs to metadata
   */
  getAllMetadata(): Map<string, ScreenMetadata>;
}

/**
 * Extended RuntimeContext with markdown plugin
 */
export interface RuntimeContextWithMarkdown extends RuntimeContext {
  markdown: MarkdownPlugin;
}

/**
 * Create the markdown plugin
 * 
 * This plugin scans the docs directory for markdown files, parses them,
 * and registers each file as a screen in the runtime.
 * 
 * @param docsDir - Path to the docs directory (default: './docs')
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 7.1, 11.1
 */
export function createMarkdownPlugin(docsDir: string = './docs'): PluginDefinition {
  // Metadata storage
  const metadata = new Map<string, ScreenMetadata>();

  // Markdown plugin implementation
  const markdownPlugin: MarkdownPlugin = {
    getMetadata(screenId: string): ScreenMetadata | undefined {
      return metadata.get(screenId);
    },

    getAllMetadata(): Map<string, ScreenMetadata> {
      return new Map(metadata);
    }
  };

  return {
    name: 'markdown',
    version: '1.0.0',
    async setup(context: RuntimeContext): Promise<void> {
      // Extend the runtime context with markdown plugin
      (context as RuntimeContextWithMarkdown).markdown = markdownPlugin;

      // Resolve docs directory path
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const docsPath = path.resolve(__dirname, '../../..', docsDir);

      // Scan for markdown files
      const files = scanDirectory(docsPath);

      // Parse and register each file
      for (const file of files) {
        try {
          // Parse markdown content
          const parsed = await parseMarkdown(file.content);

          // Determine the URL path
          const urlPath = parsed.frontmatter.path || 
            '/' + file.id.replace(/-/g, '/');

          // Store metadata
          const screenMetadata: ScreenMetadata = {
            path: urlPath,
            frontmatter: parsed.frontmatter,
            headings: parsed.headings,
            content: parsed.content,
            codeBlocks: parsed.codeBlocks,
            components: parsed.components
          };
          metadata.set(file.id, screenMetadata);

          // Register as a screen
          context.screens.registerScreen({
            id: file.id,
            title: parsed.frontmatter.title || file.name,
            component: 'MarkdownPage'
          });

          // Emit page registered event
          context.events.emit('markdown:page-registered', {
            id: file.id,
            metadata: screenMetadata
          });
        } catch (error) {
          // Log error but continue processing other files
          console.error(`Error parsing ${file.path}:`, error);
        }
      }
    }
  };
}
