# Logger Guide

This guide covers the built-in logging system in Skeleton Crew Runtime and best practices for using it effectively.

## Overview

Every plugin receives a logger instance via `ctx.logger`. This is the **recommended** way to log in SCR plugins—no need for action-based logging.

## Basic Usage

```typescript
const myPlugin: PluginDefinition = {
  name: 'my-plugin',
  version: '1.0.0',
  
  setup(ctx) {
    // ✅ Use ctx.logger directly
    ctx.logger.info('Plugin initialized');
    
    ctx.actions.registerAction({
      id: 'my:action',
      handler: async () => {
        ctx.logger.debug('Action started');
        // ... do work
        ctx.logger.info('Action completed');
      }
    });
  }
};
```

## Log Levels

The logger supports four levels, in order of severity:

| Level | Use For |
|-------|---------|
| `debug` | Detailed debugging info, not shown in production |
| `info` | General operational messages |
| `warn` | Unexpected but recoverable situations |
| `error` | Errors that need attention |

### When to Use Each Level

```typescript
// debug: Detailed flow information
ctx.logger.debug(`Processing item ${id}`, { data });

// info: Key operational events
ctx.logger.info(`User ${userId} logged in`);

// warn: Something unexpected but handled
ctx.logger.warn(`Retry attempt ${attempt} of ${maxRetries}`);

// error: Something failed
ctx.logger.error(`Failed to connect to database`, error);
```

## Avoid Action-Based Logging

Some developers create `core:log` actions for logging. **This is unnecessary complexity.**

```typescript
// ❌ Unnecessary - Don't do this
ctx.actions.registerAction({
  id: 'core:log',
  handler: async ({ level, message }) => {
    console[level](message);
  }
});

// Later...
await ctx.actions.runAction('core:log', { level: 'info', message: 'Hello' });

// ✅ Just use ctx.logger directly
ctx.logger.info('Hello');
```

## Custom Logger Implementation

You can provide a custom logger when creating the runtime:

```typescript
import { Runtime, Logger } from 'skeleton-crew';

const customLogger: Logger = {
  debug: (msg, ...args) => console.debug(`[DEBUG] ${msg}`, ...args),
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
};

const runtime = new Runtime({ logger: customLogger });
```

### Integration Examples

**Winston:**
```typescript
import winston from 'winston';

const winstonLogger = winston.createLogger({ /* config */ });

const logger: Logger = {
  debug: (msg, ...args) => winstonLogger.debug(msg, ...args),
  info: (msg, ...args) => winstonLogger.info(msg, ...args),
  warn: (msg, ...args) => winstonLogger.warn(msg, ...args),
  error: (msg, ...args) => winstonLogger.error(msg, ...args),
};
```

**Pino:**
```typescript
import pino from 'pino';

const pinoLogger = pino();

const logger: Logger = {
  debug: (msg, ...args) => pinoLogger.debug({ args }, msg),
  info: (msg, ...args) => pinoLogger.info({ args }, msg),
  warn: (msg, ...args) => pinoLogger.warn({ args }, msg),
  error: (msg, ...args) => pinoLogger.error({ args }, msg),
};
```

## Fresh Access Pattern

Always access `ctx.logger` fresh in handlers (see [Avoiding Closure Pitfalls](./avoiding-closure-pitfalls.md)):

```typescript
// ❌ Stale closure risk
setup(ctx) {
  const logger = ctx.logger; // Captured at setup time
  ctx.actions.registerAction({
    handler: async () => {
      logger.info('May be stale'); // Might miss logger updates
    }
  });
}

// ✅ Always fresh
setup(ctx) {
  ctx.actions.registerAction({
    handler: async () => {
      ctx.logger.info('Always current'); // Fresh access
    }
  });
}
```

## Summary

- Use `ctx.logger` directly—it's built-in and always available
- Choose appropriate log levels for different message types
- Avoid creating action-based logging wrappers
- Provide a custom logger implementation if you need advanced features
- Always access `ctx.logger` fresh in handlers to avoid stale closures
