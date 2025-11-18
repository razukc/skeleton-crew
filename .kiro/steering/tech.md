# Technology Stack

## Language & Build System

- **TypeScript 5.x** with strict mode enabled
- **ES2022** target and module format
- **ESM** (ES Modules) - all imports use `.js` extensions
- **Vitest** for testing

## Build Configuration

- Source: `src/`
- Output: `dist/`
- Generates declaration files (`.d.ts`) and source maps

## Common Commands

```bash
# Build the project
npm run build

# Run tests (single run)
npm test

# Run tests in watch mode
npm run test:watch
```

## TypeScript Configuration

- Strict type checking enabled
- No unused locals or parameters allowed
- Implicit returns not allowed
- Fallthrough cases in switch statements not allowed
- Test files (`*.test.ts`) excluded from build output

## Module System

- All imports must use `.js` extensions (ESM requirement)
- Example: `import { Runtime } from './runtime.js'`

## Testing

- Test files colocated with source: `*.test.ts`
- Use Vitest for all tests
- Tests verify requirements through property-based assertions
