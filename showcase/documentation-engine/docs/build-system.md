---
title: Build System
description: Understanding the Documentation Engine build system and hot reload
path: /build-system
order: 6
---

# Build System

> **Latest Version (v2.0)** - You are viewing the latest documentation.

Documentation Engine uses a build-time optimization strategy where markdown files are pre-parsed for fast loading. This page explains how the build system works and how to use it effectively.

## Overview

The build system has two main components:

1. **Build-Time Parser** - Converts markdown to JSON at build time
2. **Hot Reload Plugin** - Automatically rebuilds during development

## Build-Time Parser

### What It Does

The `build:parser` command:

- Scans the `docs/` directory recursively
- Parses all `.md` and `.mdx` files
- Extracts frontmatter, headings, and content
- Generates `public/parsed-content.json`
- Copies the file to `dist/` for production

### Why It's Needed

**Without build-time parsing:**
- Large bundle size (~500KB+ for markdown parser)
- Slow initial page load (parsing on every visit)
- CPU-intensive parsing in browser

**With build-time parsing:**
- Small bundle size (~50KB for core runtime)
- Fast initial page load (pre-parsed JSON)
- No CPU overhead in browser
- **~10x faster page loads, ~90% smaller bundle**

### When to Run It

You must run `npm run build:parser` when:

- ✅ Adding new markdown files
- ✅ Modifying existing markdown content
- ✅ Changing frontmatter metadata
- ✅ Adding new documentation versions
- ✅ Restructuring the docs folder

You don't need to run it when:

- ❌ Modifying React components
- ❌ Changing plugin code
- ❌ Updating styles or CSS

## Commands

```bash
# Parse markdown files manually
npm run build:parser

# Start development server (includes hot reload)
npm run dev

# Build for production (includes build:parser automatically)
npm run build

# Preview production build
npm run preview
```

## Hot Reload During Development

### Automatic Rebuilding

When running `npm run dev`, a custom Vite plugin watches the `docs/` folder and automatically rebuilds when you edit markdown files:

```typescript
// vite.config.ts
function watchDocsFolder() {
  return {
    name: 'watch-docs-folder',
    configureServer(server) {
      // Watch docs folder for changes
      server.watcher.add('docs/**/*.{md,mdx}');
      
      server.watcher.on('change', async (file) => {
        if (file.includes('docs')) {
          console.log('[docs-watcher] Detected change');
          console.log('[docs-watcher] Rebuilding...');
          
          // Run build:parser automatically
          await execAsync('npm run build:parser');
          
          // Trigger browser reload
          server.ws.send({ type: 'full-reload' });
          
          console.log('[docs-watcher] Rebuild complete!');
        }
      });
    }
  };
}
```

### How It Works

1. **Edit** a markdown file in `docs/`
2. **Vite detects** the file change
3. **Plugin runs** `npm run build:parser` automatically
4. **Parser rebuilds** `parsed-content.json`
5. **Browser reloads** automatically
6. **See changes** immediately!

### Console Output

When you save a markdown file during development:

```
[docs-watcher] Detected change in docs/getting-started.md
[docs-watcher] Rebuilding parsed-content.json...

Starting build-time markdown parsing...
Docs directory: /path/to/docs
Found 11 markdown files
Parsing getting-started.md...
Successfully parsed 11 files

[docs-watcher] Rebuild complete! Reloading page...
```

### Benefits

<Callout type="info" title="No Manual Commands Needed">
With the hot reload plugin, you can edit markdown files and see changes immediately without running any commands manually!
</Callout>

- ✅ **Instant feedback** - Changes appear in ~2 seconds
- ✅ **No manual commands** - Just edit and save
- ✅ **Always up-to-date** - Prevents stale content
- ✅ **Error handling** - Shows parsing errors in console
- ✅ **Debounced** - Won't rebuild multiple times simultaneously

## Development Workflow

### Typical Workflow

```bash
# 1. Start dev server (one time)
npm run dev

# 2. Edit markdown files
vim docs/getting-started.md

# 3. Save the file
# (Hot reload plugin automatically rebuilds and reloads browser)

# 4. See changes immediately in browser!
```

### First Time Setup

```bash
# 1. Clone the repository
git clone <repo-url>

# 2. Install dependencies
npm install

# 3. Parse markdown files (first time only)
npm run build:parser

# 4. Start dev server
npm run dev
```

## Production Build

### Build Process

```bash
# Single command builds everything
npm run build
```

This runs:
1. `npm run build:parser` - Parse all markdown
2. `tsc` - Compile TypeScript
3. `vite build` - Bundle for production

### Output

```
dist/
├── index.html
├── assets/
│   └── main-[hash].js
└── parsed-content.json
```

### Deployment

Deploy the `dist/` folder to any static hosting:

```bash
# Netlify
netlify deploy --dir=dist

# Vercel
vercel --prod

# GitHub Pages
gh-pages -d dist
```

## Troubleshooting

### Changes Not Appearing

**Problem:** Edited markdown but changes don't show

**Solution:**
1. Check console for watcher messages
2. Manually run `npm run build:parser`
3. Refresh browser (Ctrl+R or Cmd+R)

### Watcher Not Working

**Problem:** Hot reload plugin not detecting changes

**Solution:**
1. Restart dev server: `npm run dev`
2. Check file is in `docs/` folder
3. Verify file extension is `.md` or `.mdx`

### Build Fails

**Problem:** `npm run build:parser` fails with errors

**Solution:**
1. Check markdown syntax
2. Verify frontmatter format:
   ```markdown
   ---
   title: Page Title
   path: /page-path
   ---
   ```
3. Look for parsing errors in console

### Stale Content in Production

**Problem:** Production site shows old content

**Solution:**
1. Run full build: `npm run build`
2. Verify `dist/parsed-content.json` exists
3. Clear browser cache
4. Redeploy

## Performance Metrics

### Bundle Size Comparison

| Approach | Bundle Size | Initial Load |
|----------|-------------|--------------|
| Runtime parsing | ~500KB | ~3-5 seconds |
| Build-time parsing | ~50KB | ~0.3-0.5 seconds |

### Build Time

- Parsing 10 files: ~1 second
- Parsing 100 files: ~5 seconds
- Parsing 1000 files: ~30 seconds

### Hot Reload Speed

- File change detected: ~100ms
- Parser rebuild: ~1-2 seconds
- Browser reload: ~200ms
- **Total time to see changes: ~2 seconds**

## Best Practices

1. **Use hot reload during development**
   ```bash
   # Just run once and edit freely
   npm run dev
   ```

2. **Always build before deploying**
   ```bash
   # Ensures latest content is included
   npm run build
   ```

3. **Commit parsed-content.json**
   ```bash
   # Include in version control
   git add public/parsed-content.json
   git commit -m "Update parsed content"
   ```

4. **Use in CI/CD pipeline**
   ```yaml
   # .github/workflows/deploy.yml
   - name: Build
     run: npm run build
   ```

## Advanced Configuration

### Custom Docs Directory

Edit `scripts/build-parser.ts`:

```typescript
const DOCS_DIR = path.join(__dirname, '../my-custom-docs');
```

### Custom Output Location

Edit `scripts/build-parser.ts`:

```typescript
const OUTPUT_FILE = path.join(__dirname, '../public/my-content.json');
```

### Disable Hot Reload

Edit `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [
    react(),
    // watchDocsFolder(), // Comment out to disable
  ],
});
```

## See Also

- [Getting Started](/getting-started) - Basic setup guide
- [Plugin Development](/guides/plugins) - Creating custom plugins
- [Versioning](/build-system) - Managing multiple versions
