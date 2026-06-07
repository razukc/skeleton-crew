# Real-World Examples: v0.2.0 Implementation

This guide showcases real-world examples of Skeleton Crew Runtime v0.2.0 implementation patterns, based on actual production use cases.

## Table of Contents

- [Browser Extension: Preview Tool](#browser-extension-preview-tool)
- [Express.js API Server](#expressjs-api-server)
- [CLI Tool with Plugins](#cli-tool-with-plugins)
- [React Application with SCR](#react-application-with-scr)
- [Microservice Architecture](#microservice-architecture)
- [Development Tools](#development-tools)

## Browser Extension: Preview Tool

A real-world browser extension that manages development previews with multiple plugins.

### Configuration Structure

```typescript
// config/types.ts
export interface PreviewConfig {
  host: string;
  jobId: string;
  workDir: string;
  token?: string;
  features: {
    autoDownload: boolean;
    notifications: boolean;
    analytics: boolean;
  };
  limits: {
    maxFileSize: number;
    maxFiles: number;
    timeout: number;
  };
}

// config/index.ts
export const createConfig = (): PreviewConfig => ({
  host: process.env.PREVIEW_HOST || 'localhost:3000',
  jobId: process.env.JOB_ID || generateJobId(),
  workDir: process.env.WORK_DIR || '/tmp/preview',
  token: process.env.AUTH_TOKEN,
  features: {
    autoDownload: process.env.AUTO_DOWNLOAD === 'true',
    notifications: process.env.NOTIFICATIONS !== 'false',
    analytics: process.env.ANALYTICS === 'true'
  },
  limits: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    maxFiles: parseInt(process.env.MAX_FILES || '100'),
    timeout: parseInt(process.env.TIMEOUT || '30000') // 30s
  }
});
```

### Core Plugins

#### 1. Configuration Plugin

```typescript
// plugins/config.ts
import { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import { PreviewConfig } from '../config/types.js';

export const configPlugin: PluginDefinition<PreviewConfig> = {
  name: 'config',
  version: '1.0.0',
  setup(ctx: RuntimeContext<PreviewConfig>) {
    // Validate configuration
    const { host, jobId, workDir } = ctx.config;
    
    if (!host || !jobId || !workDir) {
      throw new Error('Missing required configuration');
    }
    
    ctx.logger.info(`Config initialized for job: ${jobId}`);
    
    // Expose config validation action
    ctx.actions.registerAction({
      id: 'config:validate',
      handler: () => {
        const config = ctx.config;
        const errors: string[] = [];
        
        if (!config.host) errors.push('host is required');
        if (!config.jobId) errors.push('jobId is required');
        if (!config.workDir) errors.push('workDir is required');
        
        return {
          valid: errors.length === 0,
          errors
        };
      }
    });
    
    // Expose config getter
    ctx.actions.registerAction({
      id: 'config:get',
      handler: (key?: keyof PreviewConfig) => {
        return key ? ctx.config[key] : ctx.config;
      }
    });
  }
};
```

#### 2. File Downloader Plugin

```typescript
// plugins/downloader.ts
import { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import { PreviewConfig } from '../config/types.js';
import fs from 'fs/promises';
import path from 'path';

interface DownloadParams {
  url: string;
  filename: string;
  overwrite?: boolean;
}

interface DownloadResult {
  success: boolean;
  path: string;
  size: number;
  duration: number;
}

export const downloaderPlugin: PluginDefinition<PreviewConfig> = {
  name: 'downloader',
  version: '1.0.0',
  dependencies: ['config'],
  
  setup(ctx: RuntimeContext<PreviewConfig>) {
    const { workDir, limits, token } = ctx.config;
    
    ctx.logger.info(`Downloader initialized (max size: ${limits.maxFileSize} bytes)`);
    
    ctx.actions.registerAction<DownloadParams, DownloadResult>({
      id: 'download:file',
      handler: async (params, ctx) => {
        const startTime = Date.now();
        const { url, filename, overwrite = false } = params;
        const { workDir, limits, token } = ctx.config;
        
        // Validate file limits
        const existingFiles = await fs.readdir(workDir).catch(() => []);
        if (existingFiles.length >= limits.maxFiles) {
          throw new Error(`Maximum file limit reached (${limits.maxFiles})`);
        }
        
        const filePath = path.join(workDir, filename);
        
        // Check if file exists
        if (!overwrite) {
          try {
            await fs.access(filePath);
            throw new Error(`File already exists: ${filename}`);
          } catch (error) {
            // File doesn't exist, continue
          }
        }
        
        ctx.logger.info(`Downloading ${url} to ${filePath}`);
        
        // Prepare headers
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Download file
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }
        
        // Check file size
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > limits.maxFileSize) {
          throw new Error(`File too large: ${contentLength} bytes (max: ${limits.maxFileSize})`);
        }
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Write file
        const buffer = await response.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(buffer));
        
        const duration = Date.now() - startTime;
        const size = buffer.byteLength;
        
        // Emit event for other plugins
        ctx.events.emit('file:downloaded', {
          url,
          path: filePath,
          size,
          duration
        });
        
        ctx.logger.info(`Downloaded ${filename} (${size} bytes) in ${duration}ms`);
        
        return {
          success: true,
          path: filePath,
          size,
          duration
        };
      },
      timeout: ctx.config.limits.timeout
    });
    
    // Batch download action
    ctx.actions.registerAction<{ files: DownloadParams[] }, DownloadResult[]>({
      id: 'download:batch',
      handler: async (params, ctx) => {
        const { files } = params;
        const { maxFiles } = ctx.config.limits;
        
        if (files.length > maxFiles) {
          throw new Error(`Too many files: ${files.length} (max: ${maxFiles})`);
        }
        
        ctx.logger.info(`Starting batch download of ${files.length} files`);
        
        // Download files in parallel with concurrency limit
        const concurrency = 3;
        const results: DownloadResult[] = [];
        
        for (let i = 0; i < files.length; i += concurrency) {
          const batch = files.slice(i, i + concurrency);
          const batchResults = await Promise.allSettled(
            batch.map(file => ctx.actions.runAction<DownloadParams, DownloadResult>('download:file', file))
          );
          
          for (const result of batchResults) {
            if (result.status === 'fulfilled') {
              results.push(result.value);
            } else {
              ctx.logger.error('Download failed:', result.reason);
              results.push({
                success: false,
                path: '',
                size: 0,
                duration: 0
              });
            }
          }
        }
        
        ctx.events.emit('batch:completed', {
          total: files.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        });
        
        return results;
      },
      timeout: ctx.config.limits.timeout * 2
    });
  }
};
```

#### 3. Notification Plugin

```typescript
// plugins/notifications.ts
import { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import { PreviewConfig } from '../config/types.js';

interface NotificationParams {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export const notificationPlugin: PluginDefinition<PreviewConfig> = {
  name: 'notifications',
  version: '1.0.0',
  dependencies: ['config'],
  
  setup(ctx: RuntimeContext<PreviewConfig>) {
    const { features } = ctx.config;
    
    if (!features.notifications) {
      ctx.logger.info('Notifications disabled');
      return;
    }
    
    ctx.logger.info('Notifications enabled');
    
    // Register notification action
    ctx.actions.registerAction<NotificationParams, void>({
      id: 'notify:show',
      handler: async (params) => {
        const { title, message, type = 'info', duration = 5000 } = params;
        
        // Use Chrome notifications API if available
        if (typeof chrome !== 'undefined' && chrome.notifications) {
          await new Promise<void>((resolve) => {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: '/icons/icon-48.png',
              title,
              message
            }, () => resolve());
          });
        } else {
          // Fallback to console
          console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
        }
        
        ctx.logger.info(`Notification shown: ${title}`);
      }
    });
    
    // Listen for download events
    ctx.events.on('file:downloaded', async (data: any) => {
      await ctx.actions.runAction('notify:show', {
        title: 'Download Complete',
        message: `Downloaded ${path.basename(data.path)} (${formatBytes(data.size)})`,
        type: 'success'
      });
    });
    
    // Listen for batch completion
    ctx.events.on('batch:completed', async (data: any) => {
      const { total, successful, failed } = data;
      
      if (failed === 0) {
        await ctx.actions.runAction('notify:show', {
          title: 'Batch Complete',
          message: `Successfully downloaded ${successful} files`,
          type: 'success'
        });
      } else {
        await ctx.actions.runAction('notify:show', {
          title: 'Batch Partial',
          message: `Downloaded ${successful}/${total} files (${failed} failed)`,
          type: 'warning'
        });
      }
    });
    
    // Listen for errors
    ctx.events.on('error', async (error: Error) => {
      await ctx.actions.runAction('notify:show', {
        title: 'Error',
        message: error.message,
        type: 'error'
      });
    });
  }
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

#### 4. Analytics Plugin

```typescript
// plugins/analytics.ts
import { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import { PreviewConfig } from '../config/types.js';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

export const analyticsPlugin: PluginDefinition<PreviewConfig> = {
  name: 'analytics',
  version: '1.0.0',
  dependencies: ['config'],
  
  setup(ctx: RuntimeContext<PreviewConfig>) {
    const { features, jobId } = ctx.config;
    
    if (!features.analytics) {
      ctx.logger.info('Analytics disabled');
      return;
    }
    
    ctx.logger.info(`Analytics enabled for job: ${jobId}`);
    
    // Track events
    ctx.actions.registerAction<AnalyticsEvent, void>({
      id: 'analytics:track',
      handler: async (params) => {
        const { event, properties = {}, timestamp = Date.now() } = params;
        
        const payload = {
          event,
          properties: {
            ...properties,
            jobId: ctx.config.jobId,
            timestamp
          }
        };
        
        // Send to analytics service (mock)
        try {
          await fetch('https://analytics.example.com/track', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ctx.config.token}`
            },
            body: JSON.stringify(payload)
          });
          
          ctx.logger.debug(`Analytics tracked: ${event}`);
        } catch (error) {
          ctx.logger.error('Analytics failed:', error);
        }
      }
    });
    
    // Auto-track download events
    ctx.events.on('file:downloaded', async (data: any) => {
      await ctx.actions.runAction('analytics:track', {
        event: 'file_downloaded',
        properties: {
          filename: path.basename(data.path),
          size: data.size,
          duration: data.duration,
          url: data.url
        }
      });
    });
    
    // Auto-track batch events
    ctx.events.on('batch:completed', async (data: any) => {
      await ctx.actions.runAction('analytics:track', {
        event: 'batch_completed',
        properties: {
          total: data.total,
          successful: data.successful,
          failed: data.failed
        }
      });
    });
    
    // Track plugin initialization
    ctx.events.on('runtime:initialized', async () => {
      await ctx.actions.runAction('analytics:track', {
        event: 'runtime_initialized',
        properties: {
          plugins: ctx.plugins.getInitializedPlugins(),
          config: {
            autoDownload: ctx.config.features.autoDownload,
            notifications: ctx.config.features.notifications
          }
        }
      });
    });
  }
};
```

### Main Application

```typescript
// background.ts
import { Runtime } from 'skeleton-crew';
import { PreviewConfig, createConfig } from './config/index.js';
import { configPlugin } from './plugins/config.js';
import { downloaderPlugin } from './plugins/downloader.js';
import { notificationPlugin } from './plugins/notifications.js';
import { analyticsPlugin } from './plugins/analytics.js';

class PreviewExtension {
  private runtime: Runtime<PreviewConfig>;
  
  constructor() {
    const config = createConfig();
    
    this.runtime = new Runtime<PreviewConfig>({
      config,
      hostContext: {
        chrome: typeof chrome !== 'undefined' ? chrome : null
      }
    });
    
    this.registerPlugins();
  }
  
  private registerPlugins(): void {
    // Register plugins in dependency order (though SCR will resolve automatically)
    this.runtime.registerPlugin(configPlugin);
    this.runtime.registerPlugin(downloaderPlugin);
    this.runtime.registerPlugin(notificationPlugin);
    this.runtime.registerPlugin(analyticsPlugin);
  }
  
  async initialize(): Promise<void> {
    await this.runtime.initialize();
    
    const ctx = this.runtime.getContext();
    ctx.logger.info('Preview extension initialized');
    
    // Setup message handling
    this.setupMessageHandling();
  }
  
  private setupMessageHandling(): void {
    const ctx = this.runtime.getContext();
    
    // Handle messages from popup/content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      
      return true; // Keep message channel open for async response
    });
  }
  
  private async handleMessage(message: any, sender: chrome.runtime.MessageSender): Promise<any> {
    const ctx = this.runtime.getContext();
    
    switch (message.type) {
      case 'download':
        return await ctx.actions.runAction('download:file', message.params);
      
      case 'batch-download':
        return await ctx.actions.runAction('download:batch', message.params);
      
      case 'get-config':
        return await ctx.actions.runAction('config:get', message.key);
      
      case 'validate-config':
        return await ctx.actions.runAction('config:validate');
      
      case 'notify':
        return await ctx.actions.runAction('notify:show', message.params);
      
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }
  
  async shutdown(): Promise<void> {
    await this.runtime.shutdown();
  }
}

// Initialize extension
const extension = new PreviewExtension();

// Handle extension lifecycle
chrome.runtime.onStartup.addListener(async () => {
  await extension.initialize();
});

chrome.runtime.onInstalled.addListener(async () => {
  await extension.initialize();
});

chrome.runtime.onSuspend.addListener(async () => {
  await extension.shutdown();
});

// Initialize immediately if not in extension context
if (typeof chrome === 'undefined') {
  extension.initialize().catch(console.error);
}
```

### Popup Interface

```typescript
// popup/popup.ts
interface ExtensionMessage {
  type: string;
  params?: any;
  key?: string;
}

class PopupInterface {
  private async sendMessage(message: ExtensionMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }
  
  async downloadFile(url: string, filename: string): Promise<void> {
    try {
      const result = await this.sendMessage({
        type: 'download',
        params: { url, filename }
      });
      
      console.log('Download completed:', result);
      this.showSuccess(`Downloaded ${filename}`);
    } catch (error) {
      console.error('Download failed:', error);
      this.showError(error.message);
    }
  }
  
  async batchDownload(files: Array<{ url: string; filename: string }>): Promise<void> {
    try {
      const results = await this.sendMessage({
        type: 'batch-download',
        params: { files }
      });
      
      const successful = results.filter((r: any) => r.success).length;
      this.showSuccess(`Downloaded ${successful}/${files.length} files`);
    } catch (error) {
      console.error('Batch download failed:', error);
      this.showError(error.message);
    }
  }
  
  async getConfig(): Promise<any> {
    return await this.sendMessage({ type: 'get-config' });
  }
  
  private showSuccess(message: string): void {
    // Update UI to show success
    console.log('Success:', message);
  }
  
  private showError(message: string): void {
    // Update UI to show error
    console.error('Error:', message);
  }
}

// Initialize popup
const popup = new PopupInterface();

// Setup event handlers
document.addEventListener('DOMContentLoaded', async () => {
  const config = await popup.getConfig();
  console.log('Current config:', config);
  
  // Setup download button
  document.getElementById('download-btn')?.addEventListener('click', () => {
    const url = (document.getElementById('url-input') as HTMLInputElement).value;
    const filename = (document.getElementById('filename-input') as HTMLInputElement).value;
    
    if (url && filename) {
      popup.downloadFile(url, filename);
    }
  });
});
```

## Key Benefits Demonstrated

### 1. Type Safety
- **Configuration**: Fully typed config prevents runtime errors
- **Actions**: Type-safe parameters and return values
- **Events**: Structured event data

### 2. Plugin Architecture
- **Modularity**: Each feature is a separate plugin
- **Dependencies**: Clear dependency relationships
- **Reusability**: Plugins can be reused across projects

### 3. Developer Experience
- **IDE Support**: Full autocomplete and error detection
- **Debugging**: Clear error messages and logging
- **Testing**: Easy to test individual plugins

### 4. Production Ready
- **Error Handling**: Comprehensive error handling throughout
- **Performance**: Efficient async operations and batching
- **Monitoring**: Built-in analytics and logging

This real-world example demonstrates how v0.2.0's features enable building robust, maintainable applications with clear separation of concerns and excellent developer experience.

For more examples, see:
- [API Reference](../api/reference.md)
- [Plugin Dependencies Guide](./plugin-dependencies.md)
- [Migration Guide](./v0.1-to-v0.2-migration.md)