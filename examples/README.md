# Skeleton Crew Runtime - Examples

Learn Skeleton Crew Runtime through hands-on examples, from 10-second feature demos to building complete applications.

## Quick Navigation

| What You Want | Go Here | Time |
|---------------|---------|------|
| **Learn one feature at a time** | [basics/](basics/) | 10 sec each |
| **See everything working together** | [playground/](playground/) | 5 min |
| **Build an app from scratch** | [tutorial/](tutorial/) | 1-2 hours |

---

## 1. Basics - Focused Feature Demos

**Path**: `examples/basics/`  
**Time**: 10 seconds each  
**Purpose**: Learn individual features in isolation

Five focused examples, each demonstrating one core feature:

```bash
npm run example:01  # Plugin System
npm run example:02  # Screen Registry
npm run example:03  # Action Engine
npm run example:04  # Event Bus
npm run example:05  # Runtime Context
```

**Start here if you're new to Skeleton Crew.**

Each example is ~50-80 lines, runs instantly, and teaches one concept.

**[Go to basics →](basics/)**

---

## 2. Playground - Complete Interactive App

**Path**: `examples/playground/`  
**Time**: 5 minutes  
**Purpose**: See all features integrated in a real application

A complete terminal-based app with:
- Multiple screens (Home, Counter, Settings)
- Interactive actions (increment, decrement, toggle theme)
- Real-time event logging
- Plugin-driven architecture

```bash
npm run example
```

**See how everything works together** in a production-like application.

**[Go to playground →](playground/)**

---

## 3. Tutorial - Build a Task Manager

**Path**: `examples/tutorial/`  
**Time**: 1-2 hours  
**Purpose**: Build a complete app from scratch, step by step

Progressive tutorial building a task management application:

- **Step 1**: Basic runtime + task plugin ✅ Implemented
- **Step 2**: Multiple plugins 📝 Implement yourself
- **Step 3**: Event communication 📝 Implement yourself
- **Step 4**: UI provider swap (React) 📝 Implement yourself
- **Step 5**: Build your own plugin 📝 Implement yourself

```bash
npm run tutorial:01  # Only step 1 is implemented
```

**Note**: Steps 2-5 have complete documentation but no code - this is intentional. Implement them yourself as a learning exercise.

**[Go to tutorial →](tutorial/)**

---

## Learning Path

### For Complete Beginners

1. **Start with basics** (10 min total):
   ```bash
   npm run example:01  # Understand plugins
   npm run example:02  # Understand screens
   npm run example:03  # Understand actions
   npm run example:04  # Understand events
   npm run example:05  # Understand context
   ```

2. **Run the playground** (5 min):
   ```bash
   npm run example
   ```
   See how features integrate in a real app.

3. **Try the tutorial** (1-2 hours):
   ```bash
   npm run tutorial:01
   ```
   Build your own app from scratch.

### For Experienced Developers

1. **Skim basics** (2 min):
   Read the code in `examples/basics/` to understand patterns.

2. **Run playground** (5 min):
   ```bash
   npm run example
   ```
   See production-like architecture.

3. **Build something** (1-2 hours):
   Use playground as a template for your own application.

---

## What Each Section Teaches

### Basics (examples/basics/)

**Problem Solved**: "How do I use feature X?"

- Minimal code (50-80 lines each)
- One feature per example
- Instant feedback (10 seconds)
- No dependencies between examples

**Best for**: Understanding individual features.

### Playground (examples/playground/)

**Problem Solved**: "How do features work together?"

- Complete application (~300 lines)
- All features integrated
- Interactive terminal UI
- Production-like structure

**Best for**: Understanding architecture and integration.

### Tutorial (examples/tutorial/)

**Problem Solved**: "How do I build my own app?"

- Step-by-step progression
- Build from scratch
- Learn by implementing
- Real-world patterns

**Best for**: Hands-on learning and practice.

---

## Running Examples

### Prerequisites

```bash
# Build the runtime first
npm run build

# Build examples
npm run build:examples
```

### Run Individual Examples

```bash
# Basics (10 seconds each)
npm run example:01
npm run example:02
npm run example:03
npm run example:04
npm run example:05

# Playground (interactive)
npm run example

# Tutorial (step 1 only)
npm run tutorial:01
```

### Build All Examples

```bash
npm run build:examples
```

This compiles all examples to `dist-example/examples/`.

---

## Example Structure

```
examples/
├── README.md                  # This file
├── basics/                    # Focused feature demos
│   ├── README.md
│   ├── 01-plugin-system/
│   ├── 02-screen-registry/
│   ├── 03-action-engine/
│   ├── 04-event-bus/
│   └── 05-runtime-context/
├── playground/                # Complete interactive app
│   ├── README.md
│   ├── index.ts
│   ├── plugins/
│   └── ui/
└── tutorial/                  # Step-by-step learning
    ├── README.md
    ├── TUTORIAL_GUIDE.md
    ├── IMPLEMENTATION_STATUS.md
    └── 01-basic-task-plugin/
```

---

## Key Concepts Demonstrated

All examples demonstrate these core principles:

### 1. Plugin-Driven Architecture
All functionality extends through plugins. The runtime provides primitives, plugins compose them.

### 2. UI-Agnostic Core
No UI framework dependencies. UI providers can use any rendering technology.

### 3. Event-Driven Communication
Plugins communicate through events, enabling loose coupling.

### 4. Minimal Core
Runtime is < 5KB. No heavy dependencies. No framework lock-in.

---

## Next Steps

After completing the examples:

1. **Explore demos** - See real-world applications in [demo/](../demo/)
2. **Study showcases** - See production-ready apps in [showcase/](../showcase/)
3. **Read API docs** - Complete reference in [docs/api/](../docs/api/)
4. **Build your own** - Use examples as templates

---

## Documentation

- **[Main README](../README.md)** - Skeleton Crew Runtime overview
- **[API Reference](../docs/api/API.md)** - Complete TypeScript API
- **[Quick Demos](../demo/README.md)** - 30-minute problem-solving demos
- **[Advanced Showcases](../showcase/README.md)** - Production-ready applications

---

**Start with [basics/](basics/) if you're new, or jump to [playground/](playground/) if you want to see everything working together.**
