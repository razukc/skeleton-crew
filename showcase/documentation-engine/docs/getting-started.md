---
title: Getting Started
description: Welcome to the Documentation Engine! This guide will help you get up and running quickly.
path: /getting-started
order: 2
---

# Getting Started

> **Latest Version (v2.0)** - You are viewing the latest documentation. [View v1.0 docs](/v1.0/getting-started) for the previous version.

## What is Documentation Engine?

Documentation Engine is a powerful, plugin-driven documentation system built on Skeleton Crew Runtime. It transforms markdown files into beautiful, interactive documentation websites with features like:

- 📝 Markdown and MDX support
- 🔍 Full-text search
- 🎨 Syntax highlighting
- 🌓 Dark/light theme
- 🎮 Interactive code playgrounds
- 📱 Responsive design
- 🚀 Static site generation

## Installation

First, install the required dependencies:

```bash
npm install skeleton-crew-runtime unified remark react react-dom minisearch prismjs
```

For development, you'll also want:

```bash
npm install --save-dev vite typescript @types/react @types/react-dom
```

## Project Structure

Create the following directory structure:

```
my-docs/
├── docs/              # Your markdown files
│   ├── index.md
│   └── guides/
├── src/
│   ├── plugins/       # Documentation plugins
│   └── components/    # React components
└── index.html         # Entry point
```

## Creating Your First Page

Create a markdown file in the `docs` directory with frontmatter:

```markdown
---
title: My First Page
description: This is my first documentation page
path: /my-first-page
order: 1
---

# My First Page

Welcome to my documentation!

## Features

- Easy to write
- Beautiful output
- Interactive components
```

<Callout type="info" title="Frontmatter Fields">
The frontmatter supports the following fields:
- `title`: Page title (required)
- `description`: Page description for SEO
- `path`: URL path (defaults to filename)
- `order`: Sort order in navigation (optional)
</Callout>

## Initializing the Runtime

Create your main entry point:

```typescript
import { Runtime } from 'skeleton-crew-runtime';
import { markdownPlugin } from './plugins/markdown';
import { routerPlugin } from './plugins/router';
import { reactUIPlugin } from './plugins/react-ui';

// Create runtime instance
const runtime = new Runtime();

// Register plugins
runtime.registerPlugin(markdownPlugin);
runtime.registerPlugin(routerPlugin);
runtime.registerPlugin(reactUIPlugin);

// Initialize
await runtime.initialize();

// Navigate to home page
await runtime.actions.execute('router:navigate', { path: '/' });
```

## Adding Code Examples

Code blocks are automatically syntax highlighted:

```javascript
// JavaScript example
function greet(name) {
  return `Hello, ${name}!`;
}

console.log(greet('World'));
```

```python
# Python example
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

```typescript
// TypeScript example
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com'
};
```

## Using MDX Components

You can embed interactive components in your markdown:

<Callout type="warning" title="Component Registration">
Make sure to register components with the Component Registry before using them in markdown files.
</Callout>

### Callout Component

```mdx
<Callout type="info" title="Helpful Tip">
This is an informational callout!
</Callout>
```

### Playground Component

```mdx
<Playground initialCode={`
console.log('Try editing this code!');
`} />
```

## Development Workflow

### Building and Running

Documentation Engine uses a build-time optimization where markdown files are pre-parsed for fast loading:

```bash
# Parse markdown files (required after adding/modifying docs)
npm run build:parser

# Start development server
npm run dev

# Build for production (includes build:parser automatically)
npm run build

# Preview production build
npm run preview
```

<Callout type="warning" title="Important: Run build:parser">
You must run `npm run build:parser` whenever you:
- Add new markdown files to the `docs/` directory
- Modify existing markdown content
- Add new documentation versions
- Change frontmatter metadata

This generates `public/parsed-content.json` which the browser loads at runtime.
</Callout>

### Hot Reload for Markdown

During development with `npm run dev`, a custom Vite plugin automatically watches the `docs/` folder for changes:

```typescript
// vite.config.ts includes a custom plugin
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

**What this means:**
- Edit any markdown file in `docs/`
- The watcher detects the change
- Automatically runs `npm run build:parser`
- Triggers a full page reload in your browser
- You see your changes immediately!

**No manual `build:parser` needed during development** - the Vite plugin handles it automatically.

### Adding New Pages

1. Create a new markdown file in `docs/`:
   ```bash
   echo "---\ntitle: New Page\npath: /new-page\n---\n\n# New Page\n\nContent here" > docs/new-page.md
   ```

2. Run the parser:
   ```bash
   npm run build:parser
   ```

3. The page will automatically appear in the sidebar navigation and be searchable!

## Next Steps

Now that you have the basics, explore these topics:

- [Plugin Development](/guides/plugins) - Learn how to create custom plugins
- [API Reference](/api/runtime) - Detailed API documentation
- [Playground Examples](/playground-example) - Interactive code examples

<Callout type="info" title="Need Help?">
Check out the full documentation or join our community for support!
</Callout>
