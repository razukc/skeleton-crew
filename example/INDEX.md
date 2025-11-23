# Skeleton Crew Runtime - Example Index

## Learning Path

### For Beginners: Focused Examples (Recommended Start)

Each example demonstrates **one core feature** in isolation:

```
01-plugin-system/     → Plugin registration & lifecycle
02-screen-registry/   → Screen registration & retrieval  
03-action-engine/     → Action registration & execution
04-event-bus/         → Event emission & subscription
05-runtime-context/   → Unified API for all subsystems
```

**Start here if you're new to Skeleton Crew.** Each example is ~50-80 lines and runs in seconds.

### For Integration: Full Playground

```
index.ts              → Complete terminal-based app
plugins/              → Feature plugins (counter, settings, core-demo)
ui/                   → Terminal UI provider implementation
```

**See all features working together** in a real interactive application.

---

## Quick Reference

| What You Want | Run This | Time |
|---------------|----------|------|
| Learn plugin basics | `npm run example:01` | 10 sec |
| Learn screens | `npm run example:02` | 10 sec |
| Learn actions | `npm run example:03` | 10 sec |
| Learn events | `npm run example:04` | 10 sec |
| Learn context API | `npm run example:05` | 10 sec |
| See full integration | `npm run example` | Interactive |

---

## Example Structure

```
example/
├── 01-plugin-system/          # Focused: Plugin lifecycle
│   ├── index.ts
│   └── README.md
├── 02-screen-registry/        # Focused: Screen management
│   ├── index.ts
│   └── README.md
├── 03-action-engine/          # Focused: Action execution
│   ├── index.ts
│   └── README.md
├── 04-event-bus/              # Focused: Event communication
│   ├── index.ts
│   └── README.md
├── 05-runtime-context/        # Focused: Unified API
│   ├── index.ts
│   └── README.md
├── plugins/                   # Full playground plugins
│   ├── core-demo.ts          # Home screen plugin
│   ├── counter.ts            # Counter feature plugin
│   └── settings.ts           # Settings plugin
├── ui/                        # Full playground UI
│   └── terminal-ui-provider.ts
├── index.ts                   # Full playground entry
├── EXAMPLES.md                # Detailed learning guide
├── INDEX.md                   # This file
├── INTEGRATION_TEST.md        # Test verification
└── README.md                  # Full playground docs
```

---

## Documentation

- [EXAMPLES.md](./EXAMPLES.md) - Detailed learning path with explanations
- [README.md](./README.md) - Full playground documentation
- [INTEGRATION_TEST.md](./INTEGRATION_TEST.md) - Verification results
- Each focused example has its own README

---

## Recommended Learning Flow

1. **Build once**: `npm run build`
2. **Run focused examples** (5 minutes total):
   - `npm run example:01` - Understand plugins
   - `npm run example:02` - Understand screens
   - `npm run example:03` - Understand actions
   - `npm run example:04` - Understand events
   - `npm run example:05` - Understand context
3. **Run full playground**: `npm run example`
4. **Explore the code** in each example directory
5. **Build your own** plugin-driven app

---

**Start with `npm run example:01` and progress through the examples!**
