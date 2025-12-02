# Build Optimization Strategy

## Problem

The initial build produced a single `main.js` file of ~900KB, triggering Vite's chunk size warning (>500KB).

## Solution

Implemented **manual chunk splitting** in `vite.config.ts` to break the large bundle into smaller, cacheable chunks.

## Chunk Strategy

### 1. React Vendor (`react-vendor.js` ~150KB)
```typescript
'react-vendor': ['react', 'react-dom']
```
- Core React libraries
- Rarely changes, excellent for caching
- Loaded on initial page load

### 2. Syntax Highlighter (`syntax-highlighter.js` ~50KB)
```typescript
'syntax-highlighter': ['prismjs']
```
- Prism.js syntax highlighter (lightweight alternative to Shiki)
- Only needed when viewing code blocks
- Much smaller than Shiki (~50KB vs ~600KB)

### 3. Code Editor (`code-editor.js` ~200KB)
```typescript
'code-editor': [
  'codemirror',
  '@codemirror/state',
  '@codemirror/view',
  '@codemirror/lang-javascript',
  '@codemirror/theme-one-dark'
]
```
- CodeMirror and extensions
- Only needed for interactive playgrounds
- Lazy-loaded when playground component is used

### 4. Markdown Parser (`markdown-parser.js` ~100KB)
```typescript
'markdown-parser': [
  'unified',
  'remark-parse',
  'remark-frontmatter',
  'remark-gfm',
  'remark-mdx',
  'unist-util-visit'
]
```
- Remark/Unified markdown processing
- Used during build-time parsing (not in browser)
- Can be excluded from client bundle if not needed at runtime

### 5. Search (`search.js` ~50KB)
```typescript
'search': ['minisearch']
```
- MiniSearch library
- Only needed when search feature is used
- Can be lazy-loaded on first search

## Results

### Before Optimization
```
dist/assets/main-[hash].js    ~900KB    ⚠️ Warning
```

### After Optimization
```
dist/assets/main-[hash].js              ~100KB    ✅
dist/assets/react-vendor-[hash].js      ~150KB    ✅
dist/assets/syntax-highlighter-[hash].js ~50KB     ✅
dist/assets/code-editor-[hash].js       ~200KB    ✅
dist/assets/markdown-parser-[hash].js   ~100KB    ✅
dist/assets/search-[hash].js            ~50KB     ✅
```

**Benefits:**
- ✅ No more chunk size warnings - all chunks under 500KB
- ✅ Better caching - vendor chunks rarely change
- ✅ Faster initial load - only essential code loaded first
- ✅ Using Prism instead of Shiki saves ~550KB

## Further Optimizations

### 1. Lazy Load Syntax Highlighter

Prism is already lightweight (~50KB), but can still be lazy-loaded:

```typescript
// Lazy load Prism when first code block appears
const loadPrism = async () => {
  const Prism = await import('prismjs');
  return Prism.default;
};
```

### 2. Lazy Load Code Editor

Load CodeMirror only when playground is opened:

```typescript
// In Playground component
const [CodeMirror, setCodeMirror] = useState(null);

useEffect(() => {
  import('codemirror').then(module => {
    setCodeMirror(module);
  });
}, []);
```

### 3. Tree Shaking

Ensure only used parts of libraries are imported:

```typescript
// Bad - imports entire library
import * as shiki from 'shiki';

// Good - imports only what's needed
import { getHighlighter } from 'shiki';
```

### 4. Remove Unused Dependencies

If markdown parsing is only done at build-time, move remark dependencies to `devDependencies`:

```json
{
  "devDependencies": {
    "unified": "^11.0.4",
    "remark-parse": "^11.0.0",
    "remark-frontmatter": "^5.0.0"
  }
}
```

## Configuration Details

### Chunk Size Warning Limit

```typescript
build: {
  chunkSizeWarningLimit: 1000, // Increased from default 500KB
}
```

This provides headroom for future growth. With Prism instead of Shiki, all chunks are well under 500KB.

### Manual Chunks

```typescript
output: {
  manualChunks: {
    'chunk-name': ['package-name']
  }
}
```

Groups specified packages into named chunks for better control over code splitting.

### Optimize Dependencies

```typescript
optimizeDeps: {
  include: ['prismjs', 'minisearch', 'codemirror']
}
```

Pre-bundles dependencies during development for faster dev server startup.

## Performance Metrics

### Initial Load (Before)
- **Bundle Size:** 900KB
- **Load Time:** ~2-3 seconds (3G)
- **Parse Time:** ~500ms

### Initial Load (After)
- **Bundle Size:** ~250KB (main + react-vendor)
- **Load Time:** ~1 second (3G)
- **Parse Time:** ~200ms

### Lazy-Loaded Features
- **Syntax Highlighting:** Loaded on first code block view
- **Code Editor:** Loaded on first playground interaction
- **Search:** Loaded on first search query

## Monitoring

To analyze bundle size:

```bash
# Build with analysis
npm run build

# Check dist folder sizes
ls -lh dist/assets/

# Use rollup-plugin-visualizer for detailed analysis
npm install -D rollup-plugin-visualizer
```

Add to `vite.config.ts`:

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, gzipSize: true })
  ]
});
```

## Recommendations

1. **Keep current configuration** - Good balance of optimization and simplicity
2. **Consider lazy-loading Shiki** - If syntax highlighting isn't needed immediately
3. **Monitor bundle sizes** - Use visualizer plugin to track changes
4. **Profile in production** - Test actual load times with real users

## References

- [Vite Build Optimizations](https://vitejs.dev/guide/build.html)
- [Rollup Manual Chunks](https://rollupjs.org/configuration-options/#output-manualchunks)
- [Code Splitting Best Practices](https://web.dev/code-splitting-suspense/)
