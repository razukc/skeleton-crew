---
title: Skeleton Crew Runtime
description: Learn what, why and how Skeleton Crew Runtime is the foundation of the docs engine
path: /skeleton-crew-runtime
order: 5
---

# 🧭 Advanced Use Case: Building a Documentation Website Using Skeleton Crew

Skeleton Crew is not just a plugin-driven internal tool builder — it is a flexible, declarative runtime capable of powering full websites. One powerful example is using Skeleton Crew to build and deploy a **documentation website**.

This document shows how, why, and when Skeleton Crew can serve as a **docs engine**, what plugins are needed, how the dev workflow looks, and how it compares to traditional static site generators.

---

## Table of Contents

1. [Why a Documentation Website?](#1-why-a-documentation-website)
2. [What Makes Skeleton Crew Suitable for Docs?](#2-what-makes-skeleton-crew-suitable-for-docs)
3. [Required Plugins](#3-required-plugins-for-a-docs-website)
4. [Architecture Overview](#4-architecture-overview)
5. [Developer Workflow](#5-developer-workflow)
6. [Example Directory Structure](#6-example-directory-structure)
7. [Plugin Implementation Details](#7-plugin-implementation-details)
8. [Example Documentation Page](#8-example-documentation-page)
9. [Deployment Options](#9-deployment-options)
10. [Performance Considerations](#10-performance-considerations)
11. [Comparison with Existing Tools](#11-comparison-with-existing-tools)
12. [What This Demo Proves](#12-what-this-demo-proves)
13. [Summary](#13-summary)

---

# 1. Why a Documentation Website?

Documentation websites usually need:

✔️ Fast, searchable content  
✔️ Automatic navigation generation  
✔️ Markdown or MDX rendering  
✔️ Versioning  
✔️ Component embedding (live examples, code snippets)  
✔️ Dark/Light themes  
✔️ Extensible plugin system  
✔️ Deployability to a static host or server  

Skeleton Crew already provides:

* A **runtime** for orchestration
* A **screen registry** for page management
* A **plugin registry** for extensibility
* A **action engine** for dynamic behavior
* A **event bus** for cross-plugin communication
* Declarative component rendering
* UI-framework independence

This makes it ideal for a highly customizable, plugin-driven documentation engine.

---

# 2. What Makes Skeleton Crew Suitable for Docs?

### **2.1. Declarative Screens = Documentation Pages**

Each documentation page (e.g., `/getting-started`, `/api/runtime`) is represented as a **screen** in the Screen Registry.

```typescript
context.screens.registerScreen({
  id: 'getting-started',
  title: 'Getting Started',
  component: MarkdownPage,
  metadata: {
    path: '/getting-started',
    source: 'docs/getting-started.md'
  }
});
```

### **2.2. Plugins = Feature Modules**

Skeleton Crew plugins can define documentation features:

* **Content Plugins**: Markdown parser, MDX compiler, syntax highlighter
* **UI Plugins**: CodeBlock, Tabs, Callout boxes, Live Playground
* **Navigation Plugins**: Sidebar generator, breadcrumbs, page navigation
* **Utility Plugins**: Search indexer, theme switcher, version selector
* **Integration Plugins**: API reference reader, diagram renderer

### **2.3. Actions = Dynamic Behaviors**

Actions enable interactive documentation features:

```typescript
// Search action
context.actions.registerAction({
  id: 'search:query',
  handler: async ({ term }) => {
    return searchIndex.query(term);
  }
});

// Theme toggle action
context.actions.registerAction({
  id: 'theme:toggle',
  handler: async () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    context.events.emit('theme:changed', { theme: newTheme });
    return newTheme;
  }
});
```

### **2.4. Events = Cross-Plugin Communication**

The event bus enables plugins to react to changes:

```typescript
// When user searches, update sidebar highlights
context.events.on('search:query', ({ term }) => {
  highlightMatchingPages(term);
});

// When theme changes, update code blocks
context.events.on('theme:changed', ({ theme }) => {
  updateCodeBlockTheme(theme);
});
```

### **2.5. Router Plugin = Navigation Layer**

Since Skeleton Crew has no built-in routing, a **Router Plugin** provides:

* URL-to-screen mapping
* Browser history management
* Navigation actions
* Deep linking support

This demonstrates Skeleton Crew's philosophy: even core features like routing are plugin-driven.

---

# 3. Required Plugins for a Docs Website

## Core Plugins (Required)

### **3.1. Router Plugin**

Provides navigation and URL management (Skeleton Crew has no built-in routing).

**Responsibilities:**
* Maps URLs to screen IDs (`/getting-started` → `getting-started` screen)
* Handles browser history (back/forward)
* Provides navigation actions
* Supports deep linking and anchor navigation

**Actions:**
* `router:navigate` - Navigate to a page
* `router:back` - Go back in history
* `router:forward` - Go forward in history

**Events:**
* `router:navigated` - Emitted after navigation completes

---

### **3.2. Markdown Plugin**

Converts `.md` or `.mdx` files into screen definitions.

**Responsibilities:**
* Parse markdown/MDX files
* Extract frontmatter metadata
* Generate heading anchors
* Auto-generate table of contents
* Transform markdown AST to UI components

**Processing Pipeline:**
```
.md file → Parse (remark) → Transform → Register Screen → Render
```

**Integration with Component Registry:**
```typescript
// MDX: <Callout type="warning">Be careful!</Callout>
// Markdown plugin resolves <Callout> from Component Registry Plugin
```

---

### **3.3. React UI Plugin** (or Vue/Svelte alternative)

Provides the rendering layer for documentation screens.

**Responsibilities:**
* Render screens as React components
* Provide base UI components (Layout, Container, etc.)
* Handle client-side hydration
* Manage component lifecycle

**Note:** This demonstrates Skeleton Crew's UI-framework independence. You could swap React for Vue, Svelte, or even a custom renderer.

---

## Feature Plugins (Enhance Functionality)

### **3.4. Sidebar Navigation Plugin**

Generates hierarchical navigation automatically.

**Responsibilities:**
* Scan folder structure or read config file
* Build navigation tree
* Track active page
* Highlight search results

**Configuration Options:**
```typescript
{
  source: 'filesystem', // or 'config'
  basePath: 'docs/',
  sortBy: 'order' // or 'alphabetical'
}
```

**Events:**
* Listens to `search:query` to highlight matching pages
* Listens to `router:navigated` to update active state

---

### **3.5. Search Plugin**

Implements content search with multiple backend options.

**Two Variants:**

**A. Local Search Plugin** (client-side)
* Indexes markdown content at build time
* Fast in-browser search (MiniSearch or Fuse.js)
* No server required
* Good for small-to-medium docs

**B. Algolia Search Plugin** (external service)
* Server-side indexing
* Advanced ranking and typo tolerance
* Scales to large documentation sites
* Requires API key

**Plugin Swappability:**
```typescript
// Development: use local search
runtime.registerPlugin(localSearchPlugin);

// Production: use Algolia
runtime.registerPlugin(algoliaSearchPlugin);
```

Both plugins expose the same action interface, demonstrating plugin interchangeability.

---

### **3.6. Code Block Plugin**

Enhances code snippets in documentation.

**Features:**
* Syntax highlighting (Shiki or Prism)
* Copy-to-clipboard button
* Line highlighting (`{1,3-5}`)
* Line numbers
* Theme-aware styles
* Language badges

**Integration:**
```typescript
// Markdown plugin passes code blocks to Code Block plugin
context.events.emit('markdown:codeblock', {
  language: 'typescript',
  code: '...',
  meta: '{1,3-5}'
});
```

---

### **3.7. Theme Plugin**

Manages visual themes across the documentation site.

**Features:**
* Light/dark mode toggle
* Persists preference to localStorage
* CSS variable injection
* Smooth transitions
* System preference detection

**Actions:**
* `theme:toggle` - Switch between light/dark
* `theme:set` - Set specific theme

**Events:**
* `theme:changed` - Notifies other plugins (e.g., code blocks update syntax theme)

---

### **3.8. Live Playground Plugin**

Enables interactive code examples within documentation.

**Features:**
* Run React/Vue/Svelte components inline
* Live code editing
* Error boundaries
* Preset examples
* Shareable playground state

**MDX Integration:**
```mdx
# Button Component

<Playground>
  <Button variant="primary">Click me</Button>
</Playground>
```

The Markdown plugin resolves `<Playground>` from the Component Registry, which is populated by the Live Playground Plugin.

---

### **3.9. Versioning Plugin**

Manages multiple documentation versions.

**Features:**
* Version selector dropdown
* Per-version content routing
* Version-specific search indexes
* Redirect old versions to latest

**Configuration:**
```typescript
{
  versions: [
    { id: 'v2', label: '2.x', path: 'docs/v2' },
    { id: 'v1', label: '1.x', path: 'docs/v1' }
  ],
  default: 'v2'
}
```

---

### **3.10. Component Registry Plugin**

Maps MDX component names to actual implementations.

**Responsibilities:**
* Register custom components (`<Callout>`, `<Tabs>`, `<ApiRef>`)
* Provide component resolution for Markdown plugin
* Enable plugin-contributed components

**Example:**
```typescript
componentRegistry.register('Callout', CalloutComponent);
componentRegistry.register('Tabs', TabsComponent);
componentRegistry.register('Playground', PlaygroundComponent);
```

This allows any plugin to contribute MDX components.

---

# 4. Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Skeleton Crew Runtime                     │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Plugin       │ Screen       │ Action       │ Event          │
│ Registry     │ Registry     │ Engine       │ Bus            │
└──────────────┴──────────────┴──────────────┴────────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Documentation Plugins                     │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Core         │ Feature      │ UI           │ Integration    │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ • Router     │ • Sidebar    │ • React UI   │ • Component    │
│ • Markdown   │ • Search     │ • Code Block │   Registry     │
│              │ • Theme      │ • Playground │                │
│              │ • Versioning │              │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
       │              │              │              │
       └──────────────┴──────────────┴──────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │   Documentation Content  │
              │   (Markdown/MDX files)   │
              └──────────────────────────┘
```

## Plugin Interaction Flow

### Example: User Searches for "plugins"

```
1. User types "plugins" in search box
   ↓
2. Search Plugin executes action: search:query
   ↓
3. Search Plugin emits event: search:results
   ↓
4. Sidebar Plugin listens to event, highlights matching pages
   ↓
5. Router Plugin navigates to first result
   ↓
6. Markdown Plugin loads and renders the page
   ↓
7. Code Block Plugin highlights syntax
   ↓
8. UI Plugin renders final output
```

### Example: Markdown File Processing Pipeline

```
docs/getting-started.md
   ↓
Markdown Plugin (parse with remark)
   ↓
Extract frontmatter, headings, code blocks
   ↓
Resolve MDX components via Component Registry
   ↓
Register screen in Screen Registry
   ↓
Router Plugin maps URL to screen
   ↓
React UI Plugin renders screen
   ↓
User sees documentation page
```

---

# 5. Developer Workflow

## Initial Setup

```typescript
// demo/documentation-engine/src/main.ts
import { Runtime } from '@skeleton/runtime';
import { routerPlugin } from './plugins/router';
import { markdownPlugin } from './plugins/markdown';
import { sidebarPlugin } from './plugins/sidebar';
import { searchPlugin } from './plugins/search';
import { codeBlockPlugin } from './plugins/code-block';
import { themePlugin } from './plugins/theme';
import { reactUIPlugin } from './plugins/react-ui';
import { componentRegistryPlugin } from './plugins/component-registry';

async function initializeDocsEngine() {
  const runtime = new Runtime();

  // Core plugins (order matters)
  runtime.registerPlugin(componentRegistryPlugin);
  runtime.registerPlugin(routerPlugin);
  runtime.registerPlugin(markdownPlugin);
  runtime.registerPlugin(reactUIPlugin);

  // Feature plugins (order doesn't matter)
  runtime.registerPlugin(sidebarPlugin);
  runtime.registerPlugin(searchPlugin);
  runtime.registerPlugin(codeBlockPlugin);
  runtime.registerPlugin(themePlugin);

  await runtime.initialize();

  // Navigate to initial page
  await runtime.executeAction('router:navigate', { path: '/' });
}

initializeDocsEngine();
```

## Adding a New Documentation Page

```bash
# 1. Create markdown file
echo "# New Feature\n\nDocumentation content..." > docs/new-feature.md

# 2. Markdown plugin auto-discovers and registers it
# 3. Sidebar plugin adds it to navigation
# 4. Search plugin indexes it
# 5. No code changes needed!
```

## Adding a Custom MDX Component

```typescript
// plugins/custom-components/api-reference.tsx
export const ApiReference = ({ endpoint }) => {
  return (
    <div className="api-ref">
      <h3>{endpoint.name}</h3>
      <code>{endpoint.method} {endpoint.path}</code>
    </div>
  );
};

// Register in component registry
context.componentRegistry.register('ApiReference', ApiReference);
```

```mdx
<!-- docs/api.mdx -->
# API Documentation

<ApiReference endpoint={{ 
  name: "Get User", 
  method: "GET", 
  path: "/api/users/:id" 
}} />
```

## Development Commands

```bash
# Parse markdown files (required after adding/modifying docs)
npm run build:parser

# Start dev server with hot reload
npm run dev

# Build for production (includes build:parser)
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

### Important: When to Run `build:parser`

The `build:parser` command must be run whenever you:
- Add new markdown files to the `docs/` directory
- Modify existing markdown files
- Add new documentation versions
- Change frontmatter metadata

This command parses all markdown files and generates `public/parsed-content.json`, which is used by the browser at runtime for fast page loads.

**Note:** `npm run build` automatically runs `build:parser` first, so you only need to run it manually during development when using `npm run dev`.

### Automatic Hot Reload (Development)

During development, a custom Vite plugin watches the `docs/` folder and automatically runs `build:parser` when markdown files change:

```typescript
// vite.config.ts
function watchDocsFolder() {
  return {
    name: 'watch-docs-folder',
    configureServer(server) {
      server.watcher.add('docs/**/*.{md,mdx}');
      server.watcher.on('change', async (file) => {
        if (file.includes('docs')) {
          await execAsync('npm run build:parser');
          server.ws.send({ type: 'full-reload' });
        }
      });
    }
  };
}
```

This means when running `npm run dev`, you can edit markdown files and see changes immediately without manually running `build:parser`.

---

# 6. Example Directory Structure

```
skeleton-docs/
├── docs/                           # Documentation content
│   ├── index.md                    # Homepage
│   ├── getting-started.md
│   ├── installation.md
│   ├── guides/
│   │   ├── plugins.md
│   │   └── screens.md
│   ├── api/
│   │   ├── runtime.md
│   │   └── plugin-registry.md
│   └── examples/
│       └── todo-app.mdx
│
├── plugins/                        # Documentation engine plugins
│   ├── router/
│   │   ├── index.ts
│   │   └── router.test.ts
│   ├── markdown/
│   │   ├── index.ts
│   │   ├── parser.ts
│   │   └── markdown.test.ts
│   ├── sidebar/
│   │   ├── index.ts
│   │   └── sidebar.test.ts
│   ├── search/
│   │   ├── local-search.ts
│   │   └── algolia-search.ts
│   ├── code-block/
│   │   ├── index.ts
│   │   └── highlighter.ts
│   ├── theme/
│   │   ├── index.ts
│   │   └── theme.test.ts
│   ├── playground/
│   │   ├── index.ts
│   │   └── sandbox.tsx
│   ├── versioning/
│   │   ├── index.ts
│   │   └── versioning.test.ts
│   ├── component-registry/
│   │   └── index.ts
│   └── react-ui/
│       ├── index.ts
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── Sidebar.tsx
│       │   ├── SearchBar.tsx
│       │   └── ThemeToggle.tsx
│       └── ui.test.tsx
│
├── src/
│   ├── main.ts                     # Entry point
│   └── config.ts                   # Configuration
│
├── public/
│   ├── index.html
│   └── assets/
│
├── dist/                           # Build output
│
├── package.json
├── tsconfig.json
├── vite.config.ts                  # Build tool config
└── README.md
```

---

# 7. Plugin Implementation Details

## Example: Markdown Plugin Implementation

```typescript
// plugins/markdown/index.ts
import { PluginDefinition } from 'skeleton-crew';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdx from 'remark-mdx';

export const markdownPlugin: PluginDefinition = {
  name: 'markdown',
  version: '1.0.0',
  
  async setup(context) {
    // Scan docs directory
    const markdownFiles = await scanDirectory('docs/');
    
    for (const file of markdownFiles) {
      const content = await readFile(file.path);
      const parsed = await parseMarkdown(content);
      
      // Register as screen
      context.screens.registerScreen({
        id: file.id,
        title: parsed.frontmatter.title || file.name,
        component: 'MarkdownPage',
        metadata: {
          path: file.path,
          frontmatter: parsed.frontmatter,
          headings: parsed.headings,
          content: parsed.content
        }
      });
      
      // Emit event for other plugins
      context.events.emit('markdown:page-registered', {
        id: file.id,
        metadata: parsed
      });
    }
  }
};

async function parseMarkdown(content: string) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkMdx);
    
  const ast = processor.parse(content);
  
  return {
    frontmatter: extractFrontmatter(ast),
    headings: extractHeadings(ast),
    content: ast
  };
}
```

## Example: Router Plugin Implementation

```typescript
// plugins/router/index.ts
import { PluginDefinition } from '@skeleton/runtime';

export const routerPlugin: PluginDefinition = {
  name: 'router',
  version: '1.0.0',
  
  setup(context) {
    const routes = new Map<string, string>(); // path -> screenId
    
    // Register navigation action
    context.actions.registerAction({
      id: 'router:navigate',
      handler: async ({ path }) => {
        const screenId = routes.get(path);
        if (!screenId) {
          throw new Error(`No route found for path: ${path}`);
        }
        
        // Update browser URL
        window.history.pushState({}, '', path);
        
        // Emit navigation event
        context.events.emit('router:navigated', { 
          path, 
          screenId 
        });
        
        return { path, screenId };
      }
    });
    
    // Listen for markdown pages and create routes
    context.events.on('markdown:page-registered', ({ id, metadata }) => {
      const path = metadata.frontmatter.path || `/${id}`;
      routes.set(path, id);
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      const path = window.location.pathname;
      context.actions.executeAction('router:navigate', { path });
    });
  }
};
```

## Example: Search Plugin Implementation

```typescript
// plugins/search/local-search.ts
import { PluginDefinition } from '@skeleton/runtime';
import MiniSearch from 'minisearch';

export const localSearchPlugin: PluginDefinition = {
  name: 'search',
  version: '1.0.0',
  
  setup(context) {
    const searchIndex = new MiniSearch({
      fields: ['title', 'content', 'headings'],
      storeFields: ['title', 'path', 'id']
    });
    
    // Index markdown pages as they're registered
    context.events.on('markdown:page-registered', ({ id, metadata }) => {
      searchIndex.add({
        id,
        title: metadata.frontmatter.title,
        content: extractTextContent(metadata.content),
        headings: metadata.headings.join(' '),
        path: metadata.frontmatter.path
      });
    });
    
    // Register search action
    context.actions.registerAction({
      id: 'search:query',
      handler: async ({ term }) => {
        const results = searchIndex.search(term, { 
          fuzzy: 0.2,
          prefix: true 
        });
        
        context.events.emit('search:results', { 
          term, 
          results 
        });
        
        return results;
      }
    });
  }
};
```

---

# 8. Example Documentation Page

## Markdown File with Frontmatter

````markdown
---
title: Getting Started
description: Learn how to use Skeleton Crew
path: /getting-started
order: 1
---

# Getting Started

Welcome to **Skeleton Crew Docs**.

## Installation

```bash
npm install @skeleton/runtime
```

## Quick Example

Here's a minimal plugin:

```typescript
export const myPlugin = {
  name: "my-plugin",
  setup(context) {
    context.screens.registerScreen({
      id: "home",
      title: "Home",
      component: HomeScreen
    });
  }
};
```

## Interactive Demo

<Playground>
  <Button variant="primary">Click me</Button>
</Playground>

<Callout type="info">
  Plugins can contribute screens, actions, and event handlers.
</Callout>

## Next Steps

* [Learn about plugins](/guides/plugins)
* [Explore the API](/api/runtime)
* [See examples](/examples/todo-app)
````

## How It's Processed

```
1. Markdown Plugin parses file
   ↓
2. Extracts frontmatter: { title, description, path, order }
   ↓
3. Identifies MDX components: <Playground>, <Callout>
   ↓
4. Resolves components from Component Registry
   ↓
5. Registers screen with metadata
   ↓
6. Router Plugin creates route: /getting-started → screen
   ↓
7. Sidebar Plugin adds to navigation tree
   ↓
8. Search Plugin indexes content
   ↓
9. React UI Plugin renders when user navigates
```

---

# 9. Deployment Options

Skeleton Crew documentation sites support multiple deployment strategies:

## Option A: Static Site Generation (SSG)

**Best for:** Most documentation sites, GitHub Pages, Netlify, Vercel

### How It Works

A **Static Export Plugin** crawls all registered screens and pre-renders them to HTML:

```typescript
// plugins/static-export/index.ts
export const staticExportPlugin: PluginDefinition = {
  name: 'static-export',
  version: '1.0.0',
  
  async setup(context) {
    context.actions.registerAction({
      id: 'export:static',
      handler: async () => {
        const screens = context.screens.getAllScreens();
        
        for (const screen of screens) {
          const html = await renderScreenToHTML(screen, context);
          const path = screen.metadata.path;
          await writeFile(`dist${path}.html`, html);
        }
        
        // Copy assets
        await copyAssets('public/', 'dist/');
        
        return { pages: screens.length };
      }
    });
  }
};
```

### Build Process

```bash
# 1. Initialize runtime
# 2. Load all plugins
# 3. Markdown plugin registers all pages
# 4. Execute static export action
npm run build

# Output:
# dist/
#   ├── index.html
#   ├── getting-started.html
#   ├── guides/
#   │   └── plugins.html
#   └── assets/
```

### Deployment

```bash
# Deploy to Netlify
netlify deploy --dir=dist

# Deploy to GitHub Pages
gh-pages -d dist

# Deploy to Vercel
vercel --prod
```

**Pros:**
- Fast page loads (pre-rendered HTML)
- Great SEO (crawlable content)
- No server required
- CDN-friendly
- Works offline with service worker

**Cons:**
- Rebuild required for content updates
- Build time increases with page count

---

## Option B: Single Page Application (SPA)

**Best for:** Internal docs, rapid iteration, dynamic content

### How It Works

The runtime loads in the browser and fetches markdown files on-demand:

```typescript
// Markdown plugin fetches files at runtime
async function loadMarkdownFile(path: string) {
  const response = await fetch(`/docs/${path}.md`);
  const content = await response.text();
  return parseMarkdown(content);
}
```

### Build Process

```bash
# Bundle runtime + plugins
npm run build:spa

# Output:
# dist/
#   ├── index.html          # Single HTML file
#   ├── bundle.js           # Runtime + plugins
#   └── docs/               # Raw markdown files
#       ├── getting-started.md
#       └── guides/
```

### Deployment

```bash
# Any static file host
npm run build:spa
npx serve dist
```

**Pros:**
- No rebuild for content changes (just update .md files)
- Smaller initial bundle
- Instant navigation after first load
- Easy to update

**Cons:**
- Slower initial page load
- Poor SEO (requires JS to render)
- Not crawlable by search engines

---

## Option C: Server-Side Rendering (SSR)

**Best for:** Large docs sites, optimal SEO, dynamic content

### How It Works

A Node.js server runs the Skeleton Crew runtime and renders pages on-demand:

```typescript
// server.ts
import { Runtime } from '@skeleton/runtime';
import express from 'express';

const app = express();
const runtime = new Runtime();

// Initialize plugins
await runtime.initialize();

app.get('*', async (req, res) => {
  const path = req.path;
  const screenId = router.getScreenForPath(path);
  const html = await renderScreenToHTML(screenId, runtime);
  
  res.send(html);
});

app.listen(3000);
```

### Deployment

```bash
# Deploy to Node.js host
npm run build:ssr
node dist/server.js

# Or use serverless
vercel deploy  # Vercel Functions
netlify deploy # Netlify Functions
```

**Pros:**
- Optimal SEO (server-rendered HTML)
- Fast initial page load
- Can serve dynamic content
- CDN cacheable

**Cons:**
- Requires server infrastructure
- More complex deployment
- Higher hosting costs

---

## Option D: Hybrid (SSG + Client-Side Hydration)

**Best for:** Best of both worlds

### How It Works

1. Pre-render all pages to HTML (SSG)
2. Include runtime bundle for client-side interactivity
3. Hydrate on client for dynamic features (search, theme toggle)

```html
<!-- dist/getting-started.html -->
<!DOCTYPE html>
<html>
<body>
  <!-- Pre-rendered content -->
  <div id="app">
    <h1>Getting Started</h1>
    <p>Welcome to Skeleton Crew...</p>
  </div>
  
  <!-- Runtime bundle for interactivity -->
  <script src="/bundle.js"></script>
  <script>
    // Hydrate existing content
    runtime.hydrate('#app');
  </script>
</body>
</html>
```

**Pros:**
- Fast initial load (pre-rendered HTML)
- Great SEO
- Full interactivity after hydration
- Progressive enhancement

**Cons:**
- Larger bundle size
- More complex build process

---

## Deployment Comparison

| Feature | SSG | SPA | SSR | Hybrid |
|---------|-----|-----|-----|--------|
| Initial Load Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| SEO | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Hosting Cost | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| Content Updates | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Complexity | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |

**Recommendation:** Start with SSG (Option A) for most documentation sites. It provides the best balance of performance, SEO, and simplicity.

---

# ⭐️ 8. How It Compares to Existing Tools

| Feature | Skeleton Crew | Docusaurus | Astro | VitePress |
|--------|----------------|------------|--------|-----------|
| Plugin-driven everything | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Custom UI Frameworks | Any (via plugin) | React only | Any | Vue |
| Internal tools integration | ⭐⭐⭐⭐⭐ | ⭐ | ⭐ | ⭐ |
| Live playground | Native plugin | Yes | Yes | Yes |
| Action engine | Unique | No | No | No |
| SSR optional | Yes | Yes | Yes | Yes |

Skeleton Crew wins in **customizability** and **runtime interaction**, enabling deeper integration with tools, SDKs, and data sources.

---

# ⭐️ 9. Example: Final Architecture Diagram


```
     ┌──────────────────────────────┐
     │        Skeleton Runtime      │
     ├──────────────────────────────┤
     │ Routing     │ Action Engine  │
     │ Plugin Host │ Screen Loader  │
     └──────────────────────────────┘
                 ▲        ▲
                 │        │
   ┌──────────────────────────────┐
   │        Documentation Plugins │
   ├──────────────────────┬───────┤
   │ Markdown Parser      │ Search│
   │ Sidebar Generator    │ Theme │
   │ Live Playground      │ Code  │
   └───────────┬──────────┴───────┘
               │
     ┌──────────────────────────────┐
     │        Documentation App     │
     │  (Screens, MD files, Config) │
     └──────────────────────────────┘
```

---

# ⭐️ 10. Why This Is an “Advanced Use Case”?

- Leverages **multiple plugins interacting**
- Demonstrates **UI-framework agnostic rendering**
- Uses **runtime-level orchestration**
- Incorporates **navigation, search, caching, actions**
- Can be deployed as SPA, SSR, or static export
- Can integrate custom components from any tool ecosystem

---

# ⭐️ 11. Summary

Skeleton Crew serves as a powerful **documentation engine** because:

🔹 Its runtime naturally maps to routing and content loading  
🔹 Plugins allow infinite customization  
🔹 Screens provide a clean page model  
🔹 Actions enable dynamic content  
🔹 UI independence allows React, Vue, Svelte, or Web Components  

A documentation system built this way is **flexible**, **modern**, **plugin-driven**, and highly **extendable**.

---


# 10. Performance Considerations

## Screen Caching Strategy

```typescript
// plugins/screen-cache/index.ts
export const screenCachePlugin: PluginDefinition = {
  name: 'screen-cache',
  version: '1.0.0',
  
  setup(context) {
    const cache = new Map<string, CachedScreen>();
    
    // Cache screens after first render
    context.events.on('screen:rendered', ({ screenId, html }) => {
      cache.set(screenId, {
        html,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000 // 5 minutes
      });
    });
    
    // Serve from cache if available
    context.events.on('screen:requested', ({ screenId }) => {
      const cached = cache.get(screenId);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        context.events.emit('screen:cache-hit', { screenId });
        return cached.html;
      }
    });
  }
};
```

## Markdown Pre-Parsing

For SSG builds, parse markdown at build time instead of runtime:

```typescript
// Build-time optimization
const buildTimeCache = {};

// During build
for (const file of markdownFiles) {
  const parsed = await parseMarkdown(file.content);
  buildTimeCache[file.id] = parsed;
}

// Write to disk
await writeFile('dist/markdown-cache.json', JSON.stringify(buildTimeCache));

// At runtime, load pre-parsed content
const cache = await fetch('/markdown-cache.json').then(r => r.json());
```

**Performance Gains:**
- 10x faster page loads (no runtime parsing)
- Smaller bundle (no markdown parser in client)
- Better caching (static JSON file)

## Code-Splitting Plugins

Load plugins on-demand instead of upfront:

```typescript
// Lazy load playground plugin only when needed
context.events.on('component:playground-requested', async () => {
  if (!playgroundPluginLoaded) {
    const { playgroundPlugin } = await import('./plugins/playground');
    runtime.registerPlugin(playgroundPlugin);
    playgroundPluginLoaded = true;
  }
});
```

**Bundle Size Reduction:**
- Initial bundle: ~50KB (core + essential plugins)
- Playground plugin: ~200KB (loaded on-demand)
- Search plugin: ~30KB (loaded on first search)

## Search Index Optimization

For large documentation sites:

```typescript
// Split search index by section
const indexes = {
  guides: new MiniSearch({ /* config */ }),
  api: new MiniSearch({ /* config */ }),
  examples: new MiniSearch({ /* config */ })
};

// Load only relevant index
async function search(term: string, section?: string) {
  if (section) {
    return indexes[section].search(term);
  }
  
  // Search all indexes in parallel
  const results = await Promise.all(
    Object.values(indexes).map(idx => idx.search(term))
  );
  
  return mergeResults(results);
}
```

## Image Optimization

```typescript
// plugins/image-optimizer/index.ts
export const imageOptimizerPlugin: PluginDefinition = {
  name: 'image-optimizer',
  setup(context) {
    // Convert markdown images to optimized versions
    context.events.on('markdown:image', ({ src, alt }) => {
      return {
        srcSet: [
          `${src}?w=400 400w`,
          `${src}?w=800 800w`,
          `${src}?w=1200 1200w`
        ],
        loading: 'lazy',
        alt
      };
    });
  }
};
```

---

# 11. Comparison with Existing Tools

| Feature | Skeleton Crew | Docusaurus | Astro | VitePress | Nextra |
|---------|---------------|------------|-------|-----------|--------|
| **Plugin Architecture** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **UI Framework** | Any (via plugin) | React only | Any | Vue only | React/Next.js |
| **Runtime Actions** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐ |
| **Event System** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐ |
| **Internal Tools Integration** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐ | ⭐ |
| **Live Playground** | Native plugin | Built-in | Via plugin | Via plugin | Built-in |
| **Versioning** | Plugin | Built-in | Via plugin | Manual | Manual |
| **Search** | Pluggable | Algolia | Pagefind | Built-in | Flexsearch |
| **SSG Support** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **SSR Support** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Learning Curve** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Customizability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

## Key Differentiators

### Skeleton Crew Advantages

**1. True Plugin-Driven Architecture**
- Even routing is a plugin (not built-in)
- Swap any component (search, theme, UI framework)
- Plugin marketplace potential

**2. Runtime Action Engine**
- Documentation can trigger actions (run code, fetch data)
- Interactive tutorials with real API calls
- Integration with internal tools

**3. Event-Driven Communication**
- Plugins coordinate via events
- Loose coupling enables complex interactions
- Easy to add cross-cutting concerns

**4. UI Framework Independence**
- Not tied to React, Vue, or any framework
- Can render to CLI, Web, Mobile, or custom targets
- Same docs, multiple renderers

**5. Internal Tools Integration**
- Can embed live dashboards in docs
- Connect to internal APIs
- Authenticate users and show personalized content

### When to Choose Skeleton Crew

✅ **Choose Skeleton Crew if:**
- You need deep customization
- You want to integrate with internal tools
- You need multiple UI targets (web + CLI)
- You want a plugin marketplace
- You need runtime interactivity (actions, events)

❌ **Choose alternatives if:**
- You want zero configuration
- You need a mature ecosystem immediately
- You prefer opinionated defaults
- You don't need advanced customization

---

# 12. What This Demo Proves

This documentation engine demonstrates Skeleton Crew's advanced capabilities:

## ✅ Multi-Plugin Orchestration
- 10+ plugins working together seamlessly
- Plugins communicate via events
- No tight coupling between plugins

## ✅ Content-Driven Screen Generation
- Markdown files automatically become screens
- No manual screen registration needed
- Frontmatter drives metadata

## ✅ Plugin Marketplace Potential
- Swap search implementations (local ↔ Algolia)
- Swap UI frameworks (React ↔ Vue ↔ Svelte)
- Swap themes without code changes

## ✅ Real-World Deployment
- SSG for static hosting
- SPA for dynamic content
- SSR for optimal SEO
- Hybrid for best of both worlds

## ✅ Framework Flexibility
- React plugin for web
- CLI plugin for terminal docs
- Mobile plugin for native apps
- Same content, different renderers

## ✅ Runtime Interactivity
- Live code playgrounds
- Interactive tutorials
- Real API integration
- Dynamic content loading

## ✅ Performance Optimization
- Screen caching
- Code-splitting
- Pre-parsed markdown
- Lazy-loaded plugins

## ✅ Developer Experience
- Simple plugin API
- Clear separation of concerns
- Easy to extend
- Testable architecture

---

# 13. Summary

Skeleton Crew serves as a powerful **documentation engine** because:

🔹 **Runtime-driven architecture** naturally maps to routing and content loading  
🔹 **Plugin system** allows infinite customization without core changes  
🔹 **Screen registry** provides a clean page model  
🔹 **Action engine** enables dynamic, interactive documentation  
🔹 **Event bus** coordinates complex plugin interactions  
🔹 **UI independence** allows React, Vue, Svelte, CLI, or custom renderers  
🔹 **Deployment flexibility** supports SSG, SPA, SSR, and hybrid approaches  

A documentation system built this way is **flexible**, **modern**, **plugin-driven**, and **highly extensible**.

This advanced use case proves Skeleton Crew can power real-world applications beyond simple internal tools, demonstrating its potential as a foundation for complex, customizable software platforms.

---

## Final Architecture Diagram

```
     ┌──────────────────────────────┐
     │        Skeleton Runtime      │
     ├──────────────────────────────┤
     │ Routing     │ Action Engine  │
     │ Plugin Host │ Screen Loader  │
     └──────────────────────────────┘
                 ▲        ▲
                 │        │
   ┌──────────────────────────────┐
   │        Documentation Plugins │
   ├──────────────────────┬───────┤
   │ Markdown Parser      │ Search│
   │ Sidebar Generator    │ Theme │
   │ Live Playground      │ Code  │
   └───────────┬──────────┴───────┘
               │
     ┌──────────────────────────────┐
     │        Documentation App     │
     │  (Screens, MD files, Config) │
     └──────────────────────────────┘
```
