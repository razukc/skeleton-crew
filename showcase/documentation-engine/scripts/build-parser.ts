/**
 * Build-Time Markdown Parser
 * 
 * Parses all markdown files during build and serializes to JSON.
 * This allows the runtime to skip markdown parsing and load pre-parsed content.
 * 
 * @see Requirements 15.1, 15.2
 */

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
import * as yaml from 'yaml';

/**
 * Frontmatter metadata
 */
interface Frontmatter {
  title?: string;
  description?: string;
  path?: string;
  order?: number;
  [key: string]: any;
}

/**
 * Heading node
 */
interface HeadingNode {
  level: number;
  text: string;
  id: string;
}

/**
 * Code block node
 */
interface CodeBlockNode {
  language: string;
  code: string;
  meta?: string;
}

/**
 * Component reference
 */
interface ComponentReference {
  name: string;
  props: Record<string, any>;
}

/**
 * Parsed markdown data
 */
interface ParsedMarkdown {
  frontmatter: Frontmatter;
  headings: HeadingNode[];
  content: Root;
  codeBlocks: CodeBlockNode[];
  components: ComponentReference[];
}

/**
 * Screen metadata for serialization
 */
interface ScreenMetadata {
  id: string;
  path: string;
  frontmatter: Frontmatter;
  headings: HeadingNode[];
  content: Root;
  codeBlocks: CodeBlockNode[];
  components: ComponentReference[];
}

/**
 * Parse YAML frontmatter using proper YAML parser
 */
function parseFrontmatter(yamlContent: string): Frontmatter {
  try {
    const parsed = yaml.parse(yamlContent);
    return parsed || {};
  } catch (error) {
    console.error('Error parsing YAML:', error);
    return {};
  }
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
 * Parse markdown content
 */
async function parseMarkdown(content: string): Promise<ParsedMarkdown> {
  const frontmatter: Frontmatter = {};
  const headings: HeadingNode[] = [];
  const codeBlocks: CodeBlockNode[] = [];
  const components: ComponentReference[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkMdx)
    .use(remarkGfm);

  const ast = processor.parse(content) as Root;

  visit(ast, (node: any) => {
    if (node.type === 'yaml') {
      const yamlNode = node as Yaml;
      const parsed = parseFrontmatter(yamlNode.value);
      Object.assign(frontmatter, parsed);
    }

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

    if (node.type === 'code') {
      const codeNode = node as Code;
      codeBlocks.push({
        language: codeNode.lang || 'text',
        code: codeNode.value,
        meta: codeNode.meta || undefined
      });
    }

    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      const mdxNode = node as MdxJsxFlowElement;
      if (mdxNode.name) {
        const props: Record<string, any> = {};
        
        if (mdxNode.attributes) {
          for (const attr of mdxNode.attributes) {
            if (attr.type === 'mdxJsxAttribute' && attr.name) {
              let value = attr.value;
              
              // Handle JSX expression values (e.g., {`template literal`})
              if (value && typeof value === 'object' && value.type === 'mdxJsxAttributeValueExpression') {
                // Extract the actual string value
                value = value.value;
                
                // Remove surrounding backticks if present (template literal syntax)
                if (typeof value === 'string' && value.startsWith('`') && value.endsWith('`')) {
                  value = value.slice(1, -1);
                }
              }
              
              props[attr.name] = value;
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
 * Scan directory for markdown files
 */
function scanDirectory(dirPath: string, baseDir: string = dirPath): Array<{ id: string; path: string; content: string }> {
  const files: Array<{ id: string; path: string; content: string }> = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...scanDirectory(fullPath, baseDir));
    } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const relativePath = path.relative(baseDir, fullPath);
      const id = relativePath
        .replace(/\.(md|mdx)$/i, '')
        .replace(/\\/g, '/')
        .replace(/\//g, '-');

      files.push({
        id,
        path: relativePath,
        content
      });
    }
  }

  return files;
}

/**
 * Main build function
 */
async function buildParsedContent(docsDir: string, outputFile: string): Promise<void> {
  console.log('Starting build-time markdown parsing...');
  console.log(`Docs directory: ${docsDir}`);
  console.log(`Output file: ${outputFile}`);

  // Scan for markdown files
  const files = scanDirectory(docsDir);
  console.log(`Found ${files.length} markdown files`);

  // Parse all files
  const parsedScreens: ScreenMetadata[] = [];
  
  for (const file of files) {
    try {
      console.log(`Parsing ${file.path}...`);
      const parsed = await parseMarkdown(file.content);
      
      const urlPath = parsed.frontmatter.path || 
        '/' + file.id.replace(/-/g, '/');

      parsedScreens.push({
        id: file.id,
        path: urlPath,
        frontmatter: parsed.frontmatter,
        headings: parsed.headings,
        content: parsed.content,
        codeBlocks: parsed.codeBlocks,
        components: parsed.components
      });
    } catch (error) {
      console.error(`Error parsing ${file.path}:`, error);
    }
  }

  // Serialize to JSON
  const jsonOutput = JSON.stringify(parsedScreens, null, 2);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(outputFile, jsonOutput, 'utf-8');
  
  console.log(`Successfully parsed ${parsedScreens.length} files`);
  console.log(`Output written to ${outputFile}`);
}

// CLI execution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.resolve(__dirname, '../docs');
const publicOutputFile = path.resolve(__dirname, '../public/parsed-content.json');
const distOutputFile = path.resolve(__dirname, '../dist/parsed-content.json');

// Build to public folder for dev server
buildParsedContent(docsDir, publicOutputFile)
  .then(() => {
    console.log('Build complete!');
    console.log('Copying to dist folder...');
    
    // Also copy to dist folder for production builds
    const distDir = path.dirname(distOutputFile);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    fs.copyFileSync(publicOutputFile, distOutputFile);
    console.log('Copied to dist folder!');
    
    process.exit(0);
  })
  .catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });
