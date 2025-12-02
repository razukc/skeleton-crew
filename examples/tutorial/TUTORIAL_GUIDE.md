# Tutorial Implementation Guide

This guide is for maintainers implementing the tutorial code.

## Implementation Checklist

### Step 1: Basic Task Plugin
- [ ] Create `01-basic-task-plugin/` directory
- [ ] Implement `plugins/tasks.ts` with basic CRUD
- [ ] Implement `ui/terminal-ui.ts` with simple commands
- [ ] Create `index.ts` with runtime setup
- [ ] Add npm script: `"tutorial:01": "node dist/example/tutorial/01-basic-task-plugin/index.js"`
- [ ] Test: Add, list, complete tasks

### Step 2: Multiple Plugins
- [ ] Copy step 1 to `02-multiple-plugins/`
- [ ] Create `plugins/filters.ts` with filter logic
- [ ] Create `plugins/stats.ts` with statistics
- [ ] Update `index.ts` to register all plugins
- [ ] Update `ui/terminal-ui.ts` with screen navigation
- [ ] Add npm script: `"tutorial:02"`
- [ ] Test: Navigate between screens, view stats

### Step 3: Event Communication
- [ ] Copy step 2 to `03-event-communication/`
- [ ] Update `plugins/tasks.ts` to emit events
- [ ] Update `plugins/filters.ts` to subscribe to events
- [ ] Update `plugins/stats.ts` to subscribe to events
- [ ] Update `ui/terminal-ui.ts` to show event log
- [ ] Add npm script: `"tutorial:03"`
- [ ] Test: Verify automatic updates across plugins

### Step 4: UI Provider Swap
- [ ] Copy step 3 to `04-ui-provider-swap/`
- [ ] Create `index.html` with styles
- [ ] Create `ui/react-ui.tsx` with React components
- [ ] Create `index.tsx` as React entry point
- [ ] Add React dependencies to package.json
- [ ] Configure Vite for React
- [ ] Add npm script: `"tutorial:04": "vite example/tutorial/04-ui-provider-swap"`
- [ ] Test: Same functionality in React UI

### Step 5: Custom Plugin
- [ ] Copy step 3 to `05-custom-plugin/`
- [ ] Create example `plugins/tags.ts`
- [ ] Update `index.ts` to include tags plugin
- [ ] Update UI to support tags
- [ ] Add npm script: `"tutorial:05"`
- [ ] Test: Add/remove tags, verify cleanup

## File Structure

```
example/tutorial/
├── README.md                           # Tutorial overview
├── TUTORIAL_GUIDE.md                   # This file
├── 01-basic-task-plugin/
│   ├── README.md                       # Step 1 guide
│   ├── index.ts
│   ├── plugins/
│   │   └── tasks.ts
│   └── ui/
│       └── terminal-ui.ts
├── 02-multiple-plugins/
│   ├── README.md                       # Step 2 guide
│   ├── index.ts
│   ├── plugins/
│   │   ├── tasks.ts
│   │   ├── filters.ts
│   │   └── stats.ts
│   └── ui/
│       └── terminal-ui.ts
├── 03-event-communication/
│   ├── README.md                       # Step 3 guide
│   ├── index.ts
│   ├── plugins/
│   │   ├── tasks.ts                    # + events
│   │   ├── filters.ts                  # + subscriptions
│   │   └── stats.ts                    # + subscriptions
│   └── ui/
│       └── terminal-ui.ts              # + event log
├── 04-ui-provider-swap/
│   ├── README.md                       # Step 4 guide
│   ├── index.html
│   ├── index.tsx
│   ├── plugins/                        # Same as step 3
│   │   ├── tasks.ts
│   │   ├── filters.ts
│   │   └── stats.ts
│   └── ui/
│       ├── terminal-ui.ts              # Original
│       └── react-ui.tsx                # NEW
└── 05-custom-plugin/
    ├── README.md                       # Step 5 guide
    ├── index.ts
    ├── plugins/
    │   ├── tasks.ts
    │   ├── filters.ts
    │   ├── stats.ts
    │   └── tags.ts                     # NEW example
    └── ui/
        └── terminal-ui.ts              # + tags support
```

## Package.json Updates

Add these scripts:

```json
{
  "scripts": {
    "tutorial:01": "node dist/example/tutorial/01-basic-task-plugin/index.js",
    "tutorial:02": "node dist/example/tutorial/02-multiple-plugins/index.js",
    "tutorial:03": "node dist/example/tutorial/03-event-communication/index.js",
    "tutorial:04": "vite example/tutorial/04-ui-provider-swap",
    "tutorial:05": "node dist/example/tutorial/05-custom-plugin/index.js"
  }
}
```

Add React dependencies (for step 4):

```json
{
  "devDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}
```

## Testing Each Step

### Manual Testing Checklist

**Step 1:**
- [ ] Can add tasks
- [ ] Can list tasks
- [ ] Can complete tasks
- [ ] Task IDs are generated

**Step 2:**
- [ ] Can navigate between screens
- [ ] Filter shows correct tasks
- [ ] Stats show correct numbers
- [ ] All screens accessible

**Step 3:**
- [ ] Events fire on task changes
- [ ] Stats update automatically
- [ ] Event log shows activity
- [ ] Plugins don't import each other

**Step 4:**
- [ ] React UI loads
- [ ] All functionality works
- [ ] Real-time updates work
- [ ] Same plugins as step 3

**Step 5:**
- [ ] Tags can be added
- [ ] Tags can be removed
- [ ] Tags cleaned up on task delete
- [ ] Tag screen shows all tags

## Common Issues

### Issue: Module resolution errors
**Solution:** Ensure all imports use `.js` extensions (ESM requirement)

### Issue: Runtime not initialized
**Solution:** Call `runtime.initialize()` before accessing context

### Issue: Events not firing
**Solution:** Verify event names match exactly (case-sensitive)

### Issue: React not rendering
**Solution:** Check Vite config includes React plugin

## Code Reuse Strategy

To minimize duplication:

1. **Steps 1-3:** Copy and modify incrementally
2. **Step 4:** Reuse plugins from step 3, only change UI
3. **Step 5:** Reuse plugins from step 3, add new plugin

## Documentation Standards

Each step's README should include:

1. **Learning Goals** - What concepts are taught
2. **What We're Building** - Feature overview
3. **Code Structure** - File organization
4. **Step-by-Step Guide** - Detailed implementation
5. **Running the Example** - How to execute
6. **Try It Out** - Example interaction
7. **Key Takeaways** - Summary of concepts
8. **Next Steps** - Link to next tutorial

## Maintenance Notes

- Keep tutorials in sync with core API changes
- Update if plugin patterns change
- Ensure all code examples are tested
- Maintain consistent style across steps
- Update screenshots if UI changes (step 4)

## Future Enhancements

Potential additions:

- Video walkthroughs for each step
- Interactive CodeSandbox versions
- Additional plugin examples
- Advanced patterns tutorial
- Performance optimization guide
- Testing strategies guide
