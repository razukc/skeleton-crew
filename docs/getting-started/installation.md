# Installation

**Get Skeleton Crew Runtime installed in 5 minutes.**

## Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher (or yarn, pnpm)
- **TypeScript**: 5.x (recommended but optional)

## Install via npm

```bash
npm install skeleton-crew-runtime
```

## Install via yarn

```bash
yarn add skeleton-crew-runtime
```

## Install via pnpm

```bash
pnpm add skeleton-crew-runtime
```

## Verify Installation

Create a test file to verify installation:

```typescript
// test.js or test.ts
import { Runtime } from 'skeleton-crew-runtime';

const runtime = new Runtime();
console.log('Skeleton Crew Runtime installed successfully!');
console.log('Version:', runtime.getState());
```

Run it:

```bash
node test.js
# or with TypeScript
npx tsx test.ts
```

## TypeScript Setup (Recommended)

If using TypeScript, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## ESM Requirement

Skeleton Crew Runtime uses **ES Modules (ESM)**. Ensure your `package.json` includes:

```json
{
  "type": "module"
}
```

All imports must use `.js` extensions:

```typescript
// Correct
import { Runtime } from 'skeleton-crew-runtime';

// In your own files
import { myPlugin } from './plugins/my-plugin.js';
```

## Troubleshooting

### Error: Cannot find module

**Problem**: Module not found errors

**Solution**: 
1. Ensure `"type": "module"` in package.json
2. Use `.js` extensions in imports
3. Check Node.js version (18+)

### TypeScript Errors

**Problem**: Type errors or missing types

**Solution**:
1. Install `@types/node`: `npm install -D @types/node`
2. Check tsconfig.json settings above
3. Ensure TypeScript 5.x

### Import Errors

**Problem**: `ERR_MODULE_NOT_FOUND`

**Solution**: Add `.js` extension to all relative imports

---

**Next**: [Your First Plugin →](your-first-plugin.md)
