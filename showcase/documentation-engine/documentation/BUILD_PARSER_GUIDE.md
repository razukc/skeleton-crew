# Build Parser Guide

## Overview

The `build:parser` command is a critical part of the Documentation Engine's build-time optimization strategy. It pre-parses all markdown files and generates a JSON file that the browser loads at runtime, eliminating the need to include markdown parsing libraries in the client bundle.

## What It Does

The `build:parser` command:

1. **Scans** the `docs/` directory recursively for all `.md` files
2. **Parses** each markdown file using unified/remark
3. **Extracts** frontmatter metadata (title, description, path, order)
4. **Extracts** heading hierarchy for table of contents
5. **Extracts** code blocks with language information
6. **Identifies** MDX components used in the content
7. **Generates** `public/parsed-content.json` with all parsed data
8. **Copies** the JSON file to `dist/` for production builds

## When to Run It

### Required Scenarios

You **must** run `npm run build:parser` when:

- ✅ Adding new markdown files to `docs/`
- ✅ Modifying existing markdown content
- ✅ Changing frontmatter metadata (title, path, order, description)
- ✅ Adding new documentation versions (e.g., `docs/v1.0/`)
- ✅ Restructuring the docs folder hierarchy
- ✅ Adding or removing MDX components in markdown

### Not Required

You **don't** need to run it when:

- ❌ Modifying React components (Layout, Sidebar, etc.)
- ❌ Changing plugin code
- ❌ Updating styles or CSS
- ❌ Modifying build configuration (vite.config.ts)

## Usage

### Development Workflow

```bash
# 1. Make changes to markdown files
vim docs/getting-started.md

# 2. Parse the markdown
npm run build:parser

# 3. Start/restart dev server (if not already running)
npm run dev

# 4. View changes in browser
# Navigate to http://localhost:5173
```

### Production Build

```bash
# Single command - automatically runs build:parser first
npm run build

# This is equivalent to:
# npm run build:parser && tsc && vite build
```

### Manual Execution

```bash
# Run the parser directly
npm run build:parser

# Or use tsx directly
npx tsx scripts/build-parser.ts
```

## Output

### Console Output

```
Starting build-time markdown parsing...
Docs directory: /path/to/docs
Output file: /path/to/public/parsed-content.json
Found 11 markdown files
Parsing api\runtime.md...
Parsing getting-started.md...
Parsing v1.0\index.md...
Successfully parsed 11 files
Output written to /path/to/public/parsed-content.json
Build complete!
Copying to dist folder...
Copied to dist folder!
```

### Generated File

The command generates `public/parsed-content.json`:

```json
{
  "pages": {
    "index": {
      "id": "index",
      "frontmatter": {
        "title": "Home",
        "description": "Welcome to Documentation Engine",
        "path": "/",
        "order": 1
      },
      "headings": [
        { "level": 1, "text": "Welcome", "id": "welcome" },
        { "level": 2, "text": "Features", "id": "features" }
      ],
      "content": "...",
      "rawContent": "# Welcome\n\n..."
    }
  }
}
```

## How It Works

### 1. File Discovery

```typescript
// Recursively scan docs directory
const files = await scanDirectory('docs/');
// Returns: ['index.md', 'getting-started.md', 'v1.0/index.md', ...]
```

### 2. Markdown Parsing

```typescript
// Parse each file with unified/remark
const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkMdx);

const ast = processor.parse(content);
```

### 3. Data Extraction

```typescript
// Extract structured data
const parsed = {
  frontmatter: extractFrontmatter(ast),
  headings: extractHeadings(ast),
  content: ast,
  rawContent: content
};
```

### 4. JSON Generation

```typescript
// Write to public folder
await writeFile(
  'public/parsed-content.json',
  JSON.stringify(allPages, null, 2)
);
```

## Performance Benefits

### Without build:parser (Runtime Parsing)

- ❌ Large bundle size (~500KB+ for unified/remark)
- ❌ Slow initial page load (parsing on every visit)
- ❌ CPU-intensive parsing in browser
- ❌ Blocks rendering until parsing completes

### With build:parser (Build-Time Parsing)

- ✅ Small bundle size (~50KB for core runtime)
- ✅ Fast initial page load (pre-parsed JSON)
- ✅ No CPU overhead in browser
- ✅ Instant rendering from cached data

**Performance Improvement:** ~10x faster page loads, ~90% smaller bundle

## Integration with Dev Server (Automatic Hot Reload)

The Vite dev server includes a custom plugin that watches for markdown file changes and automatically rebuilds:

```typescript
// vite.config.ts
function watchDocsFolder() {
  return {
    name: 'watch-docs-folder',
    configureServer(server) {
      // Watch the docs folder
      server.watcher.add(resolve(__dirname, 'docs/**/*.{md,mdx}'));
      
      let isRebuilding = false;
      
      server.watcher.on('change', async (file) => {
        // Check if the changed file is in the docs folder
        if (file.includes('docs') && (file.endsWith('.md') || file.endsWith('.mdx'))) {
          if (isRebuilding) return;
          
          isRebuilding = true;
          console.log(`[docs-watcher] Detected change in ${file}`);
          console.log('[docs-watcher] Rebuilding parsed-content.json...');
          
          try {
            await execAsync('npm run build:parser');
            console.log('[docs-watcher] Rebuild complete! Reloading page...');
            
            // Trigger a full page reload
            server.ws.send({
              type: 'full-reload',
              path: '*'
            });
          } catch (error) {
            console.error('[docs-watcher] Rebuild failed:', error);
          } finally {
            isRebuilding = false;
          }
        }
      });
    }
  };
}
```

### How It Works During Development

When running `npm run dev`:

1. **You edit** a markdown file in `docs/`
2. **Vite detects** the file change via the watcher
3. **Plugin runs** `npm run build:parser` automatically
4. **Parser rebuilds** `parsed-content.json` with updated content
5. **Browser reloads** automatically via WebSocket message
6. **You see changes** immediately in the browser!

### Console Output

```
[docs-watcher] Detected change in docs/getting-started.md
[docs-watcher] Rebuilding parsed-content.json...

Starting build-time markdown parsing...
Found 11 markdown files
Successfully parsed 11 files

[docs-watcher] Rebuild complete! Reloading page...
```

### Benefits

- ✅ **No manual commands** - Just edit and save
- ✅ **Instant feedback** - See changes in ~2 seconds
- ✅ **Prevents stale content** - Always up-to-date
- ✅ **Debounced rebuilds** - Won't rebuild multiple times simultaneously
- ✅ **Error handling** - Shows errors in console if parsing fails

### When Manual `build:parser` Is Still Needed

Even with the Vite plugin, you may need to run `build:parser` manually when:

- Starting development for the first time (before running `npm run dev`)
- The watcher fails to detect changes (rare)
- You want to verify parsing without starting the dev server
- Running in a CI/CD environment
- Building for production (though `npm run build` handles this)

## Troubleshooting

### Issue: Changes not appearing

**Solution:** Run `build:parser` manually and refresh browser

```bash
npm run build:parser
# Then refresh browser (Ctrl+R or Cmd+R)
```

### Issue: "File not found" errors

**Solution:** Ensure markdown files have correct frontmatter paths

```markdown
---
title: My Page
path: /my-page  # Must match URL structure
---
```

### Issue: Build fails with parsing errors

**Solution:** Check markdown syntax and frontmatter format

```bash
# Run parser with verbose output
npx tsx scripts/build-parser.ts

# Check for syntax errors in markdown files
```

### Issue: Stale content in production

**Solution:** Ensure `build:parser` runs before deployment

```bash
# Always run full build before deploying
npm run build

# Verify parsed-content.json exists in dist/
ls dist/parsed-content.json
```

## Best Practices

1. **Always run after content changes**
   ```bash
   # Good workflow
   vim docs/new-page.md
   npm run build:parser
   npm run dev
   ```

2. **Include in CI/CD pipeline**
   ```yaml
   # .github/workflows/deploy.yml
   - name: Build
     run: npm run build  # Includes build:parser
   ```

3. **Commit parsed-content.json to git**
   ```bash
   # Include in version control for reproducible builds
   git add public/parsed-content.json
   git commit -m "Update parsed content"
   ```

4. **Use in pre-commit hooks**
   ```json
   // package.json
   {
     "husky": {
       "hooks": {
         "pre-commit": "npm run build:parser"
       }
     }
   }
   ```

## Related Commands

- `npm run build` - Full production build (includes build:parser)
- `npm run dev` - Development server with hot reload
- `npm run preview` - Preview production build locally
- `npm test` - Run test suite

## See Also

- [Getting Started Guide](docs/getting-started.md)
- [Build-Time Optimization](README.MD#10-performance-considerations)
- [Versioning Implementation](VERSIONING_IMPLEMENTATION.md)
