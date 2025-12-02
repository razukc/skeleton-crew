# NPM Publish Readiness Review

## Current Status: ⚠️ NEEDS FIXES

The package.json has several issues that need to be addressed before publishing to npm.

---

## Critical Issues (Must Fix)

### 1. ❌ Invalid `exclude` Field

**Problem**:
```json
"exclude": [
  "dist-example/"
]
```

**Issue**: `exclude` is not a valid package.json field. This will be ignored.

**Fix**: Remove this field. Use `.npmignore` file instead or rely on `files` whitelist.

**Solution**:
```json
// Remove "exclude" field entirely
```

Create `.npmignore`:
```
dist-example/
examples/
demo/
showcase/
tests/
*.test.ts
*.test.js
coverage/
.kiro/
```

### 2. ⚠️ Broken Build Script (Windows Incompatible)

**Problem**:
```json
"build": "rm -rf dist 2>&1 & tsc"
```

**Issues**:
- `rm -rf` doesn't work on Windows
- `2>&1 &` is bash syntax, won't work in cmd/powershell
- Will fail for Windows users

**Fix**: Use cross-platform solution

**Solution**:
```json
"build": "rimraf dist && tsc"
```

Then install rimraf:
```bash
npm install -D rimraf
```

### 3. ⚠️ Example Scripts Reference Wrong Path

**Problem**:
```json
"examples": "npm run build:examples && node dist-example/example/index.js",
"example:01": "npm run build:examples && node dist-example/example/01-plugin-system/index.js",
```

**Issue**: References `example/` but folder is now `examples/`

**Fix**: Update all paths

**Solution**:
```json
"example": "npm run build:examples && node dist-example/examples/playground/index.js",
"example:01": "npm run build:examples && node dist-example/examples/basics/01-plugin-system/index.js",
"example:02": "npm run build:examples && node dist-example/examples/basics/02-screen-registry/index.js",
"example:03": "npm run build:examples && node dist-example/examples/basics/03-action-engine/index.js",
"example:04": "npm run build:examples && node dist-example/examples/basics/04-event-bus/index.js",
"example:05": "npm run build:examples && node dist-example/examples/basics/05-runtime-context/index.js",
"tutorial:01": "npm run build:examples && node dist-example/examples/tutorial/01-basic-task-plugin/index.js",
"tutorial:02": "npm run build:examples && node dist-example/examples/tutorial/02-multiple-plugins/index.js",
"tutorial:03": "npm run build:examples && node dist-example/examples/tutorial/03-event-communication/index.js",
"tutorial:04": "npm run build:examples && vite dist-example/examples/tutorial/04-ui-provider-swap",
"tutorial:05": "npm run build:examples && node dist-example/examples/tutorial/05-custom-plugin/index.js"
```

---

## Recommended Improvements

### 4. 📝 Add Repository Field

**Missing**:
```json
"repository": {
  "type": "git",
  "url": "https://github.com/yourusername/skeleton-crew-runtime.git"
}
```

**Why**: Helps users find source code, required for npm badges

### 5. 📝 Add Homepage Field

**Missing**:
```json
"homepage": "https://github.com/yourusername/skeleton-crew-runtime#readme"
```

**Why**: Links to documentation

### 6. 📝 Add Bugs Field

**Missing**:
```json
"bugs": {
  "url": "https://github.com/yourusername/skeleton-crew-runtime/issues"
}
```

**Why**: Helps users report issues

### 7. 📝 Add Engines Field

**Missing**:
```json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=8.0.0"
}
```

**Why**: Specifies required Node.js version

### 8. 📝 Improve Keywords

**Current**: Good but could be better

**Suggested additions**:
```json
"keywords": [
  "runtime",
  "plugin",
  "plugin-system",
  "framework",
  "internal-tools",
  "modular",
  "ui-agnostic",
  "event-driven",
  "browser-extension",
  "cli-tools",
  "typescript"
]
```

### 9. 📝 Add prepublishOnly Script

**Missing**:
```json
"scripts": {
  "prepublishOnly": "npm run build && npm test"
}
```

**Why**: Ensures build and tests pass before publishing

### 10. 📝 Separate Author and Email

**Current**:
```json
"author": "skcrew",
"email": "skeleton-crew-runtime@gmail.com"
```

**Better**:
```json
"author": {
  "name": "skcrew",
  "email": "skeleton-crew-runtime@gmail.com"
}
```

---

## Complete Fixed package.json

```json
{
  "name": "skeleton-crew-runtime",
  "version": "0.1.1",
  "description": "A minimal, plugin-based application runtime for building internal tools and modular applications",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/",
    "LICENSE",
    "README.md"
  ],
  "scripts": {
    "build": "rimraf dist && tsc",
    "build:examples": "tsc -p tsconfig.examples.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build && npm test",
    "example": "npm run build:examples && node dist-example/examples/playground/index.js",
    "example:01": "npm run build:examples && node dist-example/examples/basics/01-plugin-system/index.js",
    "example:02": "npm run build:examples && node dist-example/examples/basics/02-screen-registry/index.js",
    "example:03": "npm run build:examples && node dist-example/examples/basics/03-action-engine/index.js",
    "example:04": "npm run build:examples && node dist-example/examples/basics/04-event-bus/index.js",
    "example:05": "npm run build:examples && node dist-example/examples/basics/05-runtime-context/index.js",
    "tutorial:01": "npm run build:examples && node dist-example/examples/tutorial/01-basic-task-plugin/index.js",
    "tutorial:02": "npm run build:examples && node dist-example/examples/tutorial/02-multiple-plugins/index.js",
    "tutorial:03": "npm run build:examples && node dist-example/examples/tutorial/03-event-communication/index.js",
    "tutorial:04": "npm run build:examples && vite dist-example/examples/tutorial/04-ui-provider-swap",
    "tutorial:05": "npm run build:examples && node dist-example/examples/tutorial/05-custom-plugin/index.js"
  },
  "keywords": [
    "runtime",
    "plugin",
    "plugin-system",
    "framework",
    "internal-tools",
    "modular",
    "ui-agnostic",
    "event-driven",
    "browser-extension",
    "cli-tools",
    "typescript"
  ],
  "author": {
    "name": "skcrew",
    "email": "skeleton-crew-runtime@gmail.com"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/skeleton-crew-runtime.git"
  },
  "homepage": "https://github.com/yourusername/skeleton-crew-runtime#readme",
  "bugs": {
    "url": "https://github.com/yourusername/skeleton-crew-runtime/issues"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@vitest/coverage-v8": "^1.6.1",
    "fast-check": "^3.15.0",
    "rimraf": "^5.0.5",
    "typescript": "^5.3.3",
    "vitest": "^1.1.0"
  },
  "optionalDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "vite": "^5.0.0"
  }
}
```

---

## Pre-Publish Checklist

Before running `npm publish`:

- [ ] Fix critical issues (1-3)
- [ ] Add recommended fields (4-10)
- [ ] Install rimraf: `npm install -D rimraf`
- [ ] Create `.npmignore` file
- [ ] Update GitHub repository URL
- [ ] Run `npm run build` - verify it works
- [ ] Run `npm test` - verify all tests pass
- [ ] Check `dist/` folder contains compiled files
- [ ] Verify `dist/index.d.ts` exists (TypeScript types)
- [ ] Test package locally: `npm pack` then `npm install skeleton-crew-runtime-0.1.1.tgz`
- [ ] Update version if needed: `npm version patch|minor|major`
- [ ] Commit all changes
- [ ] Run `npm publish --dry-run` to test
- [ ] Run `npm publish` to publish

---

## Testing Package Locally

Before publishing, test the package:

```bash
# Create package tarball
npm pack

# This creates: skeleton-crew-runtime-0.1.1.tgz

# Test in another project
cd /path/to/test-project
npm install /path/to/skeleton-crew-runtime-0.1.1.tgz

# Verify it works
node -e "const {Runtime} = require('skeleton-crew-runtime'); console.log('Works!');"
```

---

## Publishing Commands

```bash
# Dry run (test without publishing)
npm publish --dry-run

# Publish to npm
npm publish

# Publish with tag (for beta/alpha)
npm publish --tag beta
```

---

## Post-Publish

After publishing:

1. Verify on npm: `https://www.npmjs.com/package/skeleton-crew-runtime`
2. Test installation: `npm install skeleton-crew-runtime`
3. Create GitHub release with changelog
4. Update documentation with new version
5. Announce on social media/forums

---

## Summary

**Status**: ⚠️ NOT READY - 3 critical issues

**Must fix**:
1. Remove invalid `exclude` field
2. Fix Windows-incompatible build script
3. Update example script paths

**Should add**:
- Repository, homepage, bugs fields
- Engines field
- prepublishOnly script
- Better keywords

**Estimated time to fix**: 15-20 minutes

---

**After fixes, the package will be ready for npm publish!**
