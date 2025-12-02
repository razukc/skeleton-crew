# Skeleton Crew Runtime - Showcase Applications

Advanced applications demonstrating Skeleton Crew Runtime at scale. These are production-ready examples showing complex multi-plugin orchestration and real-world deployment patterns.

**Looking for quick demos?** See [demo/](../demo/README.md) for 30-minute introductions.

---

## Showcase 1: Tab Manager Extension

### The Problem

Building a browser extension from scratch requires 550+ lines of boilerplate before you write any features:

- **Background script**: 200+ lines (message routing, state management, lifecycle)
- **Content script**: 100+ lines (DOM manipulation, messaging)
- **Popup UI**: 150+ lines (UI + business logic tightly coupled)
- **Storage layer**: 100+ lines (sync, migrations, quota management)
- **Manifest setup**: Permissions, CSP, cross-browser compatibility

**Traditional approach**: Business logic mixed with UI, hard to test, framework lock-in.

### The Solution

Plugin-based architecture with framework-agnostic core:

- **Tab plugin**: 60 lines (business logic only)
- **Session plugin**: 50 lines (storage abstraction)
- **UI plugin**: 80 lines (React components, swappable)
- **Runtime handles**: Message passing, lifecycle, state management (0 lines)

**Result**: 190 lines vs 550+ traditional (65% reduction)

### What Makes This Advanced

- **Production-ready**: Chrome Web Store quality
- **Cross-browser**: Chrome, Edge, Firefox support
- **Complex features**: Tab groups, sessions, duplicate detection, search
- **Performance**: Handles 500+ tabs smoothly
- **Testing**: Unit, integration, and property-based tests

### Quick Start

```bash
cd tab-manager
npm install
npm run build:chrome
# Load dist-chrome in Chrome extensions
```

### Key Learnings

- **Framework-agnostic core**: Swap React for Vue without touching business logic
- **Message passing patterns**: Runtime handles background ↔ popup communication
- **Cross-browser compatibility**: Single codebase, multiple manifests
- **Production deployment**: Build, package, and publish workflows

**[Full Documentation →](tab-manager/README.md)**

---

## Showcase 2: Documentation Engine

### The Problem

Building a documentation website requires massive infrastructure:

**Static Site Generators** (Docusaurus, VitePress, etc.):
- 50MB+ node_modules
- Opinionated structure (hard to customize)
- Framework lock-in (React, Vue)
- Limited plugin ecosystem

**Custom Solution**:
- Markdown parsing (100+ lines)
- Routing system (150+ lines)
- Search implementation (200+ lines)
- Syntax highlighting (50+ lines)
- Theme system (100+ lines)
- Version management (150+ lines)
- **Total**: 750+ lines before content

### The Solution

Plugin-driven documentation engine with swappable components:

- **Router plugin**: 40 lines (URL routing, navigation)
- **Markdown plugin**: 50 lines (parsing, rendering)
- **Search plugin**: 60 lines (full-text search, swappable with Algolia)
- **Theme plugin**: 30 lines (dark/light mode)
- **Code plugin**: 40 lines (syntax highlighting)
- **Versioning plugin**: 45 lines (multi-version support)

**Result**: 265 lines vs 750+ traditional (65% reduction)

### What Makes This Advanced

- **10+ plugins orchestrated**: Complex multi-plugin coordination
- **Build-time optimization**: Pre-process markdown for fast loading
- **Plugin marketplace potential**: Swap local search for Algolia, swap React for Vue
- **Multiple deployment modes**: SSG, SPA, SSR, hybrid
- **Content-driven architecture**: Markdown files automatically become screens

### Quick Start

```bash
cd documentation-engine
npm install
npm run build:parser  # Parse markdown files
npm run dev           # Start dev server
```

### Key Learnings

- **Multi-plugin orchestration**: 10+ plugins working together seamlessly
- **Build-time vs runtime**: When to process at build vs runtime
- **Plugin marketplace patterns**: Swappable implementations (local search ↔ Algolia)
- **Content-driven architecture**: Files become screens automatically
- **Performance optimization**: Code-splitting, caching, lazy loading

**[Full Documentation →](documentation-engine/README.md)**

---

## Showcase Comparison

| Metric | Tab Manager | Documentation Engine |
|--------|-------------|---------------------|
| **Complexity** | Medium | High |
| **Lines of Code** | 190 vs 550+ | 265 vs 750+ |
| **Plugins** | 5 plugins | 10+ plugins |
| **Build Time** | 3 hours vs 1 week | 4 hours vs 2 weeks |
| **Environment** | Browser | Web/Node.js |
| **UI Framework** | React (swappable) | React (swappable) |
| **Key Feature** | Framework-agnostic | Multi-plugin orchestration |

## When to Study These Showcases

**Study Tab Manager if you're building**:
- Browser extensions (productivity, automation)
- Cross-platform tools (desktop, mobile, web)
- Apps with complex message passing
- Production-ready applications

**Study Documentation Engine if you're building**:
- Content-driven websites (docs, blogs, wikis)
- Plugin marketplaces (swappable implementations)
- Multi-version systems (API docs, changelogs)
- Build-time optimized applications

## Progression Path

1. **Start with demos** (30 min each): [demo/](../demo/README.md)
   - Dev Launcher: Learn host context and plugin basics
   - Collab Hub: Learn event-driven architecture

2. **Study showcases** (2-3 hours each): This folder
   - Tab Manager: Learn production patterns
   - Documentation Engine: Learn complex orchestration

3. **Build your own** (1-2 days):
   - Use demos as templates for simple tools
   - Use showcases as templates for production apps

## Running All Showcases

```bash
# From showcase directory
for dir in tab-manager documentation-engine; do
  cd $dir
  npm install
  npm run build
  cd ..
done
```

## Documentation

- **[Main README](../README.md)** - Skeleton Crew Runtime overview
- **[API Reference](../docs/api/API.md)** - Complete TypeScript API
- **[Quick Demos](../demo/README.md)** - 30-minute introductions
- **[Examples](../example/README.md)** - Focused code examples

## Contributing

Want to add a showcase? Requirements:

- **Production-ready**: Chrome Web Store / npm publishable quality
- **Well-documented**: Clear README with problem → solution → proof
- **Tested**: Unit, integration, and property-based tests
- **Complex**: Demonstrates advanced patterns (5+ plugins)
- **Painkiller approach**: Solves real, expensive problems

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

**These showcases prove Skeleton Crew Runtime scales from simple tools to production applications.**
