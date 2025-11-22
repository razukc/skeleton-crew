/**
 * Static Export Plugin
 * 
 * Exports all registered screens to static HTML files for deployment.
 * Preserves URL path structure and copies assets.
 * 
 * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

import type { PluginDefinition, RuntimeContext, ScreenDefinition } from 'skeleton-crew-runtime';
import type { RuntimeContextWithMarkdown } from './markdown.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Export configuration
 */
export interface ExportConfig {
  outputDir: string;
  assetsDir?: string;
  includeAssets?: boolean;
}

/**
 * Export result
 */
export interface ExportResult {
  pages: number;
  errors: string[];
}

/**
 * Create the static export plugin
 * 
 * This plugin provides functionality to export all registered screens
 * to static HTML files for deployment to static hosting services.
 * 
 * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */
export function createStaticExportPlugin(): PluginDefinition {
  return {
    name: 'static-export',
    version: '1.0.0',
    setup(context: RuntimeContext): void {
      /**
       * Register export:static action
       * @see Requirements 10.1
       */
      context.actions.registerAction({
        id: 'export:static',
        handler: async (params: { outputDir: string; assetsDir?: string }): Promise<ExportResult> => {
          const { outputDir, assetsDir } = params;

          if (!outputDir || typeof outputDir !== 'string') {
            throw new Error('Output directory must be a non-empty string');
          }

          const errors: string[] = [];
          let pageCount = 0;

          try {
            // Create output directory if it doesn't exist
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }

            // Get all registered screens
            // @see Requirements 10.1
            const screens = context.screens.getAllScreens();

            // Get markdown metadata if available
            const markdownContext = context as RuntimeContextWithMarkdown;
            const hasMarkdown = markdownContext.markdown !== undefined;

            // Render each screen to HTML
            // @see Requirements 10.2, 10.5
            for (const screen of screens) {
              try {
                // Get the screen metadata to determine the path
                let screenPath = `/${screen.id}`;
                
                if (hasMarkdown) {
                  const metadata = markdownContext.markdown.getMetadata(screen.id);
                  if (metadata) {
                    screenPath = metadata.path;
                  }
                }

                // Render screen to static HTML
                const html = await renderScreenToHTML(screen);

                // Preserve URL path structure
                // @see Requirements 10.2
                const filePath = getOutputFilePath(outputDir, screenPath);

                // Ensure directory exists
                const fileDir = path.dirname(filePath);
                if (!fs.existsSync(fileDir)) {
                  fs.mkdirSync(fileDir, { recursive: true });
                }

                // Write HTML file
                fs.writeFileSync(filePath, html, 'utf-8');
                pageCount++;
              } catch (error) {
                // Handle rendering errors gracefully
                // @see Requirements 10.5
                const errorMessage = `Failed to render screen ${screen.id}: ${error instanceof Error ? error.message : String(error)}`;
                errors.push(errorMessage);
                console.error(errorMessage);
                // Continue with remaining screens
              }
            }

            // Copy assets if specified
            // @see Requirements 10.3
            if (assetsDir && fs.existsSync(assetsDir)) {
              try {
                const assetsOutputDir = path.join(outputDir, 'assets');
                copyDirectory(assetsDir, assetsOutputDir);
              } catch (error) {
                const errorMessage = `Failed to copy assets: ${error instanceof Error ? error.message : String(error)}`;
                errors.push(errorMessage);
                console.error(errorMessage);
              }
            }

            // Return export report
            // @see Requirements 10.4
            return {
              pages: pageCount,
              errors
            };
          } catch (error) {
            throw new Error(`Static export failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      });
    }
  };
}

/**
 * Render a screen to static HTML
 * @param screen - Screen definition
 * @returns HTML string
 */
async function renderScreenToHTML(screen: ScreenDefinition): Promise<string> {
  // For now, create a simple HTML template
  // In a full implementation, this would render the actual React component
  // Note: The component field is a string identifier, not the actual component
  
  // Wrap in a basic HTML template
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${screen.title || 'Documentation'}</title>
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <div id="root">
    <h1>${screen.title}</h1>
    <p>Screen ID: ${screen.id}</p>
    <p>Component: ${screen.component}</p>
  </div>
  <script src="/assets/bundle.js"></script>
</body>
</html>`;

  return html;
}

/**
 * Get output file path for a screen path
 * Preserves URL path structure
 * @param outputDir - Output directory
 * @param screenPath - Screen URL path
 * @returns File path
 * @see Requirements 10.2
 */
function getOutputFilePath(outputDir: string, screenPath: string): string {
  // Normalize path
  let normalizedPath = screenPath.startsWith('/') ? screenPath.slice(1) : screenPath;

  // Handle root path
  if (!normalizedPath || normalizedPath === '/') {
    return path.join(outputDir, 'index.html');
  }

  // If path ends with /, add index.html
  if (normalizedPath.endsWith('/')) {
    return path.join(outputDir, normalizedPath, 'index.html');
  }

  // Add .html extension if not present
  if (!normalizedPath.endsWith('.html')) {
    normalizedPath += '.html';
  }

  return path.join(outputDir, normalizedPath);
}

/**
 * Copy directory recursively
 * @param src - Source directory
 * @param dest - Destination directory
 * @see Requirements 10.3
 */
function copyDirectory(src: string, dest: string): void {
  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      copyDirectory(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
