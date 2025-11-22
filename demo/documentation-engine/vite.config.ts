import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
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
      const dest = resolve(__dirname, 'dist/parsed-content.json');
      
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
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
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
    include: ['@codemirror/state', '@codemirror/view', '@codemirror/lang-javascript', 'codemirror'],
  },
});
