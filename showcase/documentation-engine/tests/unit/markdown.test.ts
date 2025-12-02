/**
 * Unit tests for Markdown Plugin
 * 
 * Tests heading extraction, code block extraction, and heading ID generation
 * @see Requirements 1.3, 1.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { createMarkdownPlugin } from '../../src/plugins/markdown.js';
import type { RuntimeContextWithMarkdown } from '../../src/plugins/markdown.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Markdown Plugin - Heading and Code Block Extraction', () => {
  let runtime: Runtime;
  let testDocsDir: string;

  beforeEach(() => {
    // Create a temporary test docs directory
    testDocsDir = path.join(__dirname, '../temp-docs');
    if (!fs.existsSync(testDocsDir)) {
      fs.mkdirSync(testDocsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test docs directory
    if (fs.existsSync(testDocsDir)) {
      fs.rmSync(testDocsDir, { recursive: true, force: true });
    }
  });

  it('should extract heading hierarchy from markdown', async () => {
    // Create test markdown file with headings
    const testContent = `---
title: Test Page
---

# Main Heading

Some content here.

## Subheading 1

More content.

### Nested Heading

Even more content.

## Subheading 2

Final content.
`;

    fs.writeFileSync(path.join(testDocsDir, 'test.md'), testContent);

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);
    await runtime.initialize();

    // Get the markdown plugin from context
    const context = runtime.getContext() as RuntimeContextWithMarkdown;
    const metadata = context.markdown.getMetadata('test');

    // Verify headings were extracted
    expect(metadata).toBeDefined();
    expect(metadata!.headings).toHaveLength(4);
    
    // Verify heading hierarchy
    expect(metadata!.headings[0]).toEqual({
      level: 1,
      text: 'Main Heading',
      id: 'main-heading'
    });
    
    expect(metadata!.headings[1]).toEqual({
      level: 2,
      text: 'Subheading 1',
      id: 'subheading-1'
    });
    
    expect(metadata!.headings[2]).toEqual({
      level: 3,
      text: 'Nested Heading',
      id: 'nested-heading'
    });
    
    expect(metadata!.headings[3]).toEqual({
      level: 2,
      text: 'Subheading 2',
      id: 'subheading-2'
    });
  });

  it('should extract code blocks with language information', async () => {
    // Create test markdown file with code blocks
    const testContent = `---
title: Code Examples
---

# Code Examples

Here's some JavaScript:

\`\`\`javascript
function hello() {
  console.log('Hello, world!');
}
\`\`\`

And some TypeScript:

\`\`\`typescript
interface User {
  name: string;
  age: number;
}
\`\`\`

Plain text:

\`\`\`
No language specified
\`\`\`
`;

    fs.writeFileSync(path.join(testDocsDir, 'code-test.md'), testContent);

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);
    await runtime.initialize();

    // Get the markdown plugin from context
    const context = runtime.getContext() as RuntimeContextWithMarkdown;
    const metadata = context.markdown.getMetadata('code-test');

    // Verify code blocks were extracted
    expect(metadata).toBeDefined();
    expect(metadata!.codeBlocks).toHaveLength(3);
    
    // Verify first code block (JavaScript)
    expect(metadata!.codeBlocks[0].language).toBe('javascript');
    expect(metadata!.codeBlocks[0].code).toContain('function hello()');
    expect(metadata!.codeBlocks[0].code).toContain("console.log('Hello, world!')");
    
    // Verify second code block (TypeScript)
    expect(metadata!.codeBlocks[1].language).toBe('typescript');
    expect(metadata!.codeBlocks[1].code).toContain('interface User');
    
    // Verify third code block (no language)
    expect(metadata!.codeBlocks[2].language).toBe('text');
    expect(metadata!.codeBlocks[2].code).toContain('No language specified');
  });

  it('should generate heading IDs for anchors', async () => {
    // Create test markdown file with various heading formats
    const testContent = `---
title: Heading ID Test
---

# Simple Heading

## Heading with Multiple Words

### Heading with Special Characters!@#

#### Heading   with   Extra   Spaces

##### Heading-with-dashes
`;

    fs.writeFileSync(path.join(testDocsDir, 'heading-ids.md'), testContent);

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);
    await runtime.initialize();

    // Get the markdown plugin from context
    const context = runtime.getContext() as RuntimeContextWithMarkdown;
    const metadata = context.markdown.getMetadata('heading-ids');

    // Verify heading IDs were generated correctly
    expect(metadata).toBeDefined();
    expect(metadata!.headings).toHaveLength(5);
    
    expect(metadata!.headings[0].id).toBe('simple-heading');
    expect(metadata!.headings[1].id).toBe('heading-with-multiple-words');
    expect(metadata!.headings[2].id).toBe('heading-with-special-characters');
    expect(metadata!.headings[3].id).toBe('heading-with-extra-spaces');
    expect(metadata!.headings[4].id).toBe('heading-with-dashes');
  });

  it('should preserve code content exactly', async () => {
    // Create test markdown file with code that has special formatting
    const testContent = `---
title: Code Preservation Test
---

# Code Preservation

\`\`\`javascript
// This code has special formatting
const data = {
  "key": "value",
  'single': 'quotes',
  number: 42,
  array: [1, 2, 3]
};

function test() {
  return \`template \${data.key}\`;
}
\`\`\`
`;

    fs.writeFileSync(path.join(testDocsDir, 'code-preserve.md'), testContent);

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);
    await runtime.initialize();

    // Get the markdown plugin from context
    const context = runtime.getContext() as RuntimeContextWithMarkdown;
    const metadata = context.markdown.getMetadata('code-preserve');

    // Verify code content is preserved exactly
    expect(metadata).toBeDefined();
    expect(metadata!.codeBlocks).toHaveLength(1);
    
    const codeBlock = metadata!.codeBlocks[0];
    expect(codeBlock.language).toBe('javascript');
    expect(codeBlock.code).toContain('"key": "value"');
    expect(codeBlock.code).toContain("'single': 'quotes'");
    expect(codeBlock.code).toContain('number: 42');
    expect(codeBlock.code).toContain('array: [1, 2, 3]');
    expect(codeBlock.code).toContain('template ${data.key}');
  });
});

describe('Markdown Plugin - MDX Component Identification', () => {
  let runtime: Runtime;
  let testDocsDir: string;

  beforeEach(() => {
    // Create a temporary test docs directory
    testDocsDir = path.join(__dirname, '../temp-docs-mdx');
    if (!fs.existsSync(testDocsDir)) {
      fs.mkdirSync(testDocsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test docs directory
    if (fs.existsSync(testDocsDir)) {
      fs.rmSync(testDocsDir, { recursive: true, force: true });
    }
  });

  it('should identify MDX components in markdown', async () => {
    // Create test markdown file with MDX components
    const testContent = `---
title: MDX Components Test
---

# MDX Components

Here's a callout:

<Callout type="info">
This is an info callout.
</Callout>

And a playground:

<Playground language="javascript" initialCode="console.log('hello')">
</Playground>

Multiple components:

<Alert severity="warning" title="Warning">
Be careful!
</Alert>
`;

    fs.writeFileSync(path.join(testDocsDir, 'mdx-test.md'), testContent);

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);
    await runtime.initialize();

    // Get the markdown plugin from context
    const context = runtime.getContext() as RuntimeContextWithMarkdown;
    const metadata = context.markdown.getMetadata('mdx-test');

    // Verify components were identified
    expect(metadata).toBeDefined();
    expect(metadata!.components).toHaveLength(3);
    
    // Verify first component (Callout)
    expect(metadata!.components[0].name).toBe('Callout');
    expect(metadata!.components[0].props.type).toBe('info');
    
    // Verify second component (Playground)
    expect(metadata!.components[1].name).toBe('Playground');
    expect(metadata!.components[1].props.language).toBe('javascript');
    expect(metadata!.components[1].props.initialCode).toBe("console.log('hello')");
    
    // Verify third component (Alert)
    expect(metadata!.components[2].name).toBe('Alert');
    expect(metadata!.components[2].props.severity).toBe('warning');
    expect(metadata!.components[2].props.title).toBe('Warning');
  });

  it('should extract component names without props', async () => {
    // Create test markdown file with components without props
    const testContent = `---
title: Simple Components
---

# Simple Components

<SimpleComponent>
Content here
</SimpleComponent>

<AnotherComponent />
`;

    fs.writeFileSync(path.join(testDocsDir, 'simple-components.md'), testContent);

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);
    await runtime.initialize();

    // Get the markdown plugin from context
    const context = runtime.getContext() as RuntimeContextWithMarkdown;
    const metadata = context.markdown.getMetadata('simple-components');

    // Verify components were identified
    expect(metadata).toBeDefined();
    expect(metadata!.components).toHaveLength(2);
    
    expect(metadata!.components[0].name).toBe('SimpleComponent');
    expect(Object.keys(metadata!.components[0].props)).toHaveLength(0);
    
    expect(metadata!.components[1].name).toBe('AnotherComponent');
    expect(Object.keys(metadata!.components[1].props)).toHaveLength(0);
  });

  it('should handle inline MDX components', async () => {
    // Create test markdown file with inline components
    const testContent = `---
title: Inline Components
---

# Inline Components

This is a paragraph with an <InlineComponent prop="value" /> component.

And another <Badge color="blue">Badge Text</Badge> inline.
`;

    fs.writeFileSync(path.join(testDocsDir, 'inline-components.md'), testContent);

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);
    await runtime.initialize();

    // Get the markdown plugin from context
    const context = runtime.getContext() as RuntimeContextWithMarkdown;
    const metadata = context.markdown.getMetadata('inline-components');

    // Verify inline components were identified
    expect(metadata).toBeDefined();
    expect(metadata!.components).toHaveLength(2);
    
    expect(metadata!.components[0].name).toBe('InlineComponent');
    expect(metadata!.components[0].props.prop).toBe('value');
    
    expect(metadata!.components[1].name).toBe('Badge');
    expect(metadata!.components[1].props.color).toBe('blue');
  });
});

describe('Markdown Plugin - Screen Registration', () => {
  let runtime: Runtime;
  let testDocsDir: string;

  beforeEach(() => {
    // Create a temporary test docs directory
    testDocsDir = path.join(__dirname, '../temp-docs-registration');
    if (!fs.existsSync(testDocsDir)) {
      fs.mkdirSync(testDocsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test docs directory
    if (fs.existsSync(testDocsDir)) {
      fs.rmSync(testDocsDir, { recursive: true, force: true });
    }
  });

  it('should register each markdown file as a screen', async () => {
    // Create test markdown files
    const file1Content = `---
title: Getting Started
path: /getting-started
---

# Getting Started

Welcome to the documentation.
`;

    const file2Content = `---
title: API Reference
path: /api
---

# API Reference

API documentation here.
`;

    fs.writeFileSync(path.join(testDocsDir, 'getting-started.md'), file1Content);
    fs.writeFileSync(path.join(testDocsDir, 'api.md'), file2Content);

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);
    await runtime.initialize();

    // Get the runtime context
    const context = runtime.getContext();

    // Verify both files were registered as screens
    const screen1 = context.screens.getScreen('getting-started');
    const screen2 = context.screens.getScreen('api');

    expect(screen1).toBeDefined();
    expect(screen1!.id).toBe('getting-started');
    expect(screen1!.title).toBe('Getting Started');
    expect(screen1!.component).toBe('MarkdownPage');

    expect(screen2).toBeDefined();
    expect(screen2!.id).toBe('api');
    expect(screen2!.title).toBe('API Reference');
    expect(screen2!.component).toBe('MarkdownPage');
  });

  it('should emit markdown:page-registered events for each file', async () => {
    // Create test markdown file
    const testContent = `---
title: Test Page
path: /test
---

# Test Page

Test content.
`;

    fs.writeFileSync(path.join(testDocsDir, 'test.md'), testContent);

    // Track emitted events
    const emittedEvents: Array<{ id: string; metadata: any }> = [];

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    
    // Create a custom plugin to listen for events during initialization
    const eventListenerPlugin = {
      name: 'event-listener',
      version: '1.0.0',
      setup(context: any) {
        context.events.on('markdown:page-registered', (data: any) => {
          emittedEvents.push(data);
        });
      }
    };
    
    runtime.registerPlugin(eventListenerPlugin);
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);

    await runtime.initialize();

    // Verify event was emitted
    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0].id).toBe('test');
    expect(emittedEvents[0].metadata).toBeDefined();
    expect(emittedEvents[0].metadata.path).toBe('/test');
    expect(emittedEvents[0].metadata.frontmatter.title).toBe('Test Page');
  });

  it('should store metadata in screen definition', async () => {
    // Create test markdown file with various metadata
    const testContent = `---
title: Complex Page
description: A page with lots of metadata
path: /complex
order: 5
---

# Main Heading

Some content here.

## Subheading

\`\`\`javascript
console.log('test');
\`\`\`
`;

    fs.writeFileSync(path.join(testDocsDir, 'complex.md'), testContent);

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);
    await runtime.initialize();

    // Get the markdown plugin from context
    const context = runtime.getContext() as RuntimeContextWithMarkdown;
    const metadata = context.markdown.getMetadata('complex');

    // Verify metadata is stored correctly
    expect(metadata).toBeDefined();
    expect(metadata!.path).toBe('/complex');
    expect(metadata!.frontmatter.title).toBe('Complex Page');
    expect(metadata!.frontmatter.description).toBe('A page with lots of metadata');
    expect(metadata!.frontmatter.order).toBe(5);
    expect(metadata!.headings).toHaveLength(2);
    expect(metadata!.codeBlocks).toHaveLength(1);
  });

  it('should register multiple files from nested directories', async () => {
    // Create nested directory structure
    const guidesDir = path.join(testDocsDir, 'guides');
    fs.mkdirSync(guidesDir, { recursive: true });

    const file1Content = `---
title: Index
---
# Index
`;

    const file2Content = `---
title: Plugin Guide
---
# Plugin Guide
`;

    fs.writeFileSync(path.join(testDocsDir, 'index.md'), file1Content);
    fs.writeFileSync(path.join(guidesDir, 'plugins.md'), file2Content);

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);
    await runtime.initialize();

    // Get the runtime context
    const context = runtime.getContext();

    // Verify both files were registered
    const indexScreen = context.screens.getScreen('index');
    const pluginsScreen = context.screens.getScreen('guides-plugins');

    expect(indexScreen).toBeDefined();
    expect(indexScreen!.title).toBe('Index');

    expect(pluginsScreen).toBeDefined();
    expect(pluginsScreen!.title).toBe('Plugin Guide');
  });

  it('should use filename as title when frontmatter title is missing', async () => {
    // Create test markdown file without title in frontmatter
    const testContent = `# Heading

Content without frontmatter title.
`;

    fs.writeFileSync(path.join(testDocsDir, 'no-title.md'), testContent);

    // Initialize runtime with markdown plugin
    runtime = new Runtime();
    const markdownPlugin = createMarkdownPlugin(testDocsDir);
    runtime.registerPlugin(markdownPlugin);
    await runtime.initialize();

    // Get the runtime context
    const context = runtime.getContext();

    // Verify screen was registered with filename as title
    const screen = context.screens.getScreen('no-title');
    expect(screen).toBeDefined();
    expect(screen!.title).toBe('no-title.md');
  });
});
