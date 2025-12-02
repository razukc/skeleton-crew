import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Plugin to watch docs folder and rebuild parsed-content.json
function watchDocsFolder() {
  return {
    name: 'watch-docs-folder',
    configureServer(server: any) {
      // Watch the docs folder
      server.watcher.add(resolve(__dirname, 'docs/**/*.{md,mdx}'));
      
      let isRebuilding = false;
      
      server.watcher.on('change', async (file: string) => {
        // Check if the changed file is in the docs folder
        if (file.includes('docs') && (file.endsWith('.md') || file.endsWith('.mdx'))) {
          if (isRebuilding) return;
          
          isRebuilding = true;
          console.log(`\n[docs-watcher] Detected change in ${file}`);
          console.log('[docs-watcher] Rebuilding parsed-content.json...');
          
          try {
            await execAsync('npm run build:parser');
            console.log('[docs-watcher] Rebuild complete! Reloading page...\n');
            
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

// Plugin to copy parsed-content.json to dist
function copyParsedContent() {
  return {
    name: 'copy-parsed-content',
    closeBundle() {
      const src = resolve(__dirname, 'dist/parsed-content.json');
      
      if (existsSync(src)) {
        console.log('Parsed content already in dist folder');
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), watchDocsFolder(), copyParsedContent()],
  root: '.',
  publicDir: 'public',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // Increase chunk size warning limit (optional - removes warning)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Manual chunk splitting for better code splitting
        manualChunks: {
          // React and React DOM in separate chunk
          'react-vendor': ['react', 'react-dom'],
          
          // Syntax highlighting (Prism is lightweight ~50KB)
          'syntax-highlighter': ['prismjs'],
          
          // Code editor (CodeMirror is large ~200KB)
          'code-editor': [
            'codemirror',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/lang-javascript',
            '@codemirror/theme-one-dark'
          ],
          
          // Markdown parsing (Remark/Unified ~100KB)
          'markdown-parser': [
            'unified',
            'remark-parse',
            'remark-frontmatter',
            'remark-gfm',
            'remark-mdx',
            'unist-util-visit'
          ],
          
          // Search functionality (~50KB)
          'search': ['minisearch'],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    dedupe: ['@codemirror/state', '@codemirror/view', '@codemirror/lang-javascript', 'codemirror'],
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/lang-javascript',
      'codemirror',
      'prismjs',
      'minisearch'
    ],
  },
});
