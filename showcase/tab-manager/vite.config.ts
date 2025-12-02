import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox';
  const outDir = isFirefox ? 'dist-firefox' : 'dist-chrome';

  return {
    plugins: [
      react(),
      {
        name: 'copy-manifest',
        writeBundle() {
          const manifestSrc = isFirefox 
            ? 'manifest.firefox.json' 
            : 'manifest.chrome.json';
          
          if (!existsSync(outDir)) {
            mkdirSync(outDir, { recursive: true });
          }
          
          try {
            copyFileSync(manifestSrc, `${outDir}/manifest.json`);
            console.log(`✓ Copied ${manifestSrc} to ${outDir}/manifest.json`);
          } catch (error) {
            console.error(`Failed to copy manifest: ${error}`);
          }
        }
      },
      {
        name: 'copy-popup-html',
        writeBundle() {
          const htmlSrc = `${outDir}/src/popup/index.html`;
          const htmlDest = `${outDir}/popup.html`;
          
          try {
            if (existsSync(htmlSrc)) {
              copyFileSync(htmlSrc, htmlDest);
              console.log(`✓ Copied popup HTML to ${htmlDest}`);
            }
          } catch (error) {
            console.error(`Failed to copy popup HTML: ${error}`);
          }
        }
      }
    ],
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          background: resolve(__dirname, 'src/background/index.ts'),
          popup: resolve(__dirname, 'src/popup/index.html')
        },
        output: {
          entryFileNames: (chunkInfo) => {
            return chunkInfo.name === 'background' 
              ? 'background.js' 
              : '[name].js';
          },
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            // Put popup HTML at root for manifest
            if (assetInfo.name === 'index.html') {
              return 'popup.html';
            }
            return 'assets/[name].[ext]';
          },
          format: 'es'
        }
      },
      sourcemap: mode === 'development',
      minify: mode !== 'development'
    },
    define: {
      __BROWSER__: JSON.stringify(isFirefox ? 'firefox' : 'chrome')
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  };
});
