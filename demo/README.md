# Skeleton Crew Runtime - Demo Applications

Real-world applications showing how Skeleton Crew Runtime solves actual development problems.

## The Problem with Building Internal Tools

Building internal tools typically means:
- **Days of boilerplate** for basic functionality
- **Heavy dependencies** (100KB+ for simple features)
- **Framework lock-in** (rewrite everything when switching UI)
- **Tight coupling** (business logic mixed with UI/infrastructure)

Skeleton Crew Runtime solves this by providing a minimal plugin architecture that separates concerns and eliminates boilerplate.

---

## Demo 1: Dev Tool Launcher

### The Problem
Developers juggle 5+ CLI tools daily (Git, npm, Docker, databases, cloud CLIs). Each has different syntax, different flags, different mental models. You spend more time remembering commands than writing code.

**Without SCR**: Build a command palette from scratch
- Set up readline interface (50+ lines)
- Parse commands manually (100+ lines)
- Handle child_process spawning (error handling, streams, exit codes)
- Add fuzzy search, history, autocomplete
- **Result**: 500+ lines before first useful command

**With SCR**: Plugin-based command system
- Core plugin handles execution (30 lines)
- Each tool is a plugin (20-30 lines each)
- Add new tools by dropping in plugins
- **Result**: 150 lines total, extensible

**Quick Start**:
```bash
cd dev-launcher
npm install
npm run build
npm start
```

**What You'll Learn**:
- Host context injection (system access without tight coupling)
- Plugin composition (each tool = independent plugin)
- Action orchestration (commands calling commands)
- Real utility in < 200 lines

---

## Demo 2: Real-Time Collaboration Hub

### The Problem
Adding real-time collaboration to existing apps requires heavyweight solutions:
- **Firebase**: 150KB+, vendor lock-in, forces data model
- **Socket.io + Redux**: 100KB+, complex state sync, race conditions
- **Yjs/Automerge**: 200KB+, CRDT overhead, steep learning curve

**Without SCR**: Build WebSocket sync from scratch
- Set up WebSocket server (50+ lines)
- Implement message routing (100+ lines)
- Handle client state sync (150+ lines)
- Add presence, cursors, activity tracking
- Debug race conditions and state inconsistencies
- **Result**: 500+ lines, fragile state management

**With SCR**: Event-driven plugin architecture
- Presence plugin (40 lines)
- Cursor plugin (35 lines)
- Activity plugin (25 lines)
- Server broadcasts events (30 lines)
- **Result**: 130 lines total, no state bugs

**Quick Start**:
```bash
cd collab-hub
npm install
npm run build

# Terminal 1: Start server
npm run server

# Terminal 2-3: Start clients
npm run client
```

**What You'll Learn**:
- Event-driven architecture (zero state management)
- Real-time coordination (WebSocket + events)
- Passive observers (activity plugin just listens)
- Stateless runtime (plugins hold state, not core)

---

## Concrete Results

| Metric | Dev Launcher | Collab Hub |
|--------|-------------|------------|
| **Lines of Code** | 150 vs 500+ | 130 vs 500+ |
| **Bundle Size** | 4KB vs 50KB+ | 5KB vs 150KB+ |
| **Build Time** | 1 hour vs 1 day | 2 hours vs 2 days |
| **Dependencies** | 1 vs 5+ | 1 vs 3+ |
| **Boilerplate** | ~70% reduction | ~75% reduction |

## Why These Demos Matter

### Dev Launcher: Host Context Pattern
**Problem Solved**: System access without tight coupling
- Traditional: Business logic calls `child_process` directly
- SCR: Inject system APIs via host context
- **Benefit**: Swap implementations, test without real system calls

### Collab Hub: Event-Driven Coordination
**Problem Solved**: Real-time sync without state management hell
- Traditional: Manually sync state across clients, handle race conditions
- SCR: Plugins emit events, runtime broadcasts, no shared state
- **Benefit**: Add features by listening to events, zero state bugs

---

## The Pattern: Problem → Solution → Proof

Each demo follows the same structure:

1. **Real Problem**: Specific pain point developers face
2. **Traditional Approach**: Show the 500+ line alternative
3. **SCR Solution**: Show the 150-line plugin-based approach
4. **Concrete Metrics**: Lines of code, bundle size, build time
5. **Working Code**: Run it yourself in minutes

## Common Thread

All three demos solve the same meta-problem:

**Building internal tools requires too much boilerplate.**

- Dev Launcher: 70% less code for CLI tools
- Collab Hub: 75% less code for real-time features
- Tab Manager: 65% less code for browser extensions

Skeleton Crew Runtime eliminates boilerplate by providing:
- Plugin architecture (compose features independently)
- Event-driven coordination (no state management)
- Host context injection (system access without coupling)
- Framework-agnostic core (swap UI without rewriting logic)

## Running Tests

Each demo includes tests showing the patterns:

```bash
# Dev Launcher - host context mocking
cd dev-launcher && npm test

# Collab Hub - event-driven testing
cd collab-hub && npm test

# Tab Manager - plugin isolation
cd tab-manager && npm test
```

## Building All Demos

```bash
# From demo directory
for dir in dev-launcher collab-hub; do
  cd $dir
  npm install
  npm run build
  cd ..
done
```

## Next Steps

### 1. Run a Demo (5 minutes)
Pick the problem closest to yours:
- CLI tools → Dev Launcher
- Real-time features → Collab Hub
- Browser extensions → Tab Manager

### 2. Read the Code (15 minutes)
Each demo is < 200 lines. See how plugins compose.

### 3. Extend a Demo (30 minutes)
Add a plugin:
- Dev Launcher: Add kubectl/terraform commands
- Collab Hub: Add chat or drawing features

### 4. Build Your Own (1-2 hours)
Use these as templates for your internal tools.

### 5. Explore Advanced Showcases
See [showcase/](../showcase/README.md) for production-ready applications:
- **Tab Manager Extension**: Browser extension with 5 plugins (190 lines)
- **Documentation Engine**: Multi-plugin docs site with 10+ plugins (265 lines)

## When to Use Skeleton Crew Runtime

**Good Fit**:
- Internal tools (admin dashboards, dev tools)
- Browser extensions (productivity, automation)
- CLI applications (task runners, deployment tools)
- Real-time features (collaboration, presence, chat)
- Prototypes (validate ideas quickly)

**Not a Good Fit**:
- Public-facing apps (use Next.js, Remix, etc.)
- Complex routing needs (use React Router, etc.)
- Heavy state management (use Redux, Zustand, etc.)
- Large teams (needs more structure)

## Documentation

- [Main README](../README.md) - Skeleton Crew Runtime overview
- [API Documentation](../docs/api/API.md) - Complete API reference
- [Plugin Guide](../docs/guides/plugin-guide.md) - How to write plugins
- [Architecture](../docs/PROJECT_OVERVIEW.md) - System architecture

## Support

- Report issues: [GitHub Issues](https://github.com/razukc/skeleton-crew/issues)
- Ask questions: [GitHub Discussions](https://github.com/razukc/skeleton-crew/discussions)
