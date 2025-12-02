# Skeleton Crew Runtime - Developer-Focused Storybook

## Story 1: The Boilerplate Problem
**Visual:** Split screen - left shows 500+ lines of boilerplate code scrolling, right shows frustrated developer

**Narration:** "You're building a CLI dev tool. Before writing any business logic, you need 500 lines of boilerplate: readline setup, command parsing, process management, error handling."

**Visual:** Code editor showing traditional approach

```typescript
const readline = require('readline');
const { spawn } = require('child_process');

const rl = readline.createInterface({ /* 50+ lines */ });
const commands = new Map();

function executeCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stdout = '', stderr = '';
    
    proc.stdout.on('data', (data) => stdout += data);
    proc.stderr.on('data', (data) => stderr += data);
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr));
    });
  });
}

// ... 400+ more lines
```

**Narration:** "You spend 80% of your time on infrastructure, 20% on features."

---

## Story 2: The 70% Reduction
**Visual:** Same screen, code shrinking dramatically

**Narration:** "With Skeleton Crew Runtime, that 500 lines becomes 150. Here's how."

**Visual:** Code editor showing Skeleton Crew approach

```typescript
import { Runtime } from 'skeleton-crew-runtime';

const runtime = new Runtime({
  hostContext: {
    exec: (cmd, args) => execSync(`${cmd} ${args.join(' ')}`)
  }
});

const gitPlugin = {
  name: 'git',
  version: '1.0.0',
  setup(ctx) {
    ctx.actions.registerAction({
      id: 'git:status',
      handler: async (_, ctx) => {
        const { exec } = ctx.host;
        return exec('git', ['status']);
      }
    });
  }
};

await runtime.initialize();
```

**Narration:** "150 lines. Fully testable. Easily extensible. 70% less code."

---

## Story 3: Demo 1 - Dev Tool Launcher
**Visual:** Terminal showing CLI command palette

**Narration:** "Let's build a real dev tool launcher. You juggle Git, npm, and Docker commands daily. Let's make it easier."

**Visual:** Code editor showing plugin structure

```typescript
const gitPlugin = {
  name: 'git',
  version: '1.0.0',
  setup(ctx) {
    ctx.actions.registerAction({
      id: 'git:status',
      handler: async () => {
        const { exec } = ctx.host;
        return exec('git', ['status', '--short']);
      }
    });
    
    ctx.actions.registerAction({
      id: 'git:commit',
      handler: async ({ message }) => {
        const { exec } = ctx.host;
        exec('git', ['add', '.']);
        return exec('git', ['commit', '-m', message]);
      }
    });
  }
};
```

**Visual:** Terminal showing commands running

**Narration:** "Git status. Commit. Push. All through a simple command palette."

**Visual:** Code showing npm plugin

```typescript
const npmPlugin = {
  name: 'npm',
  version: '1.0.0',
  setup(ctx) {
    ctx.actions.registerAction({
      id: 'npm:test',
      handler: async () => {
        const { exec } = ctx.host;
        return exec('npm', ['test']);
      }
    });
  }
};
```

**Narration:** "Add npm commands. Docker commands. Any command you need. Each plugin is 30 lines."

---

## Story 4: The Plugin Architecture
**Visual:** Diagram showing plugins as building blocks

**Narration:** "Here's why this works. Each feature is an isolated plugin. Add features without touching other code."

**Visual:** Code showing event-driven communication

```typescript
// Git plugin emits event
ctx.events.emit('git:committed', { hash, message });

// Slack plugin reacts (doesn't know about git plugin)
ctx.events.on('git:committed', async ({ hash, message }) => {
  await ctx.actions.runAction('slack:notify', {
    channel: '#deployments',
    text: `New commit: ${message} (${hash})`
  });
});
```

**Narration:** "Plugins communicate via events. Zero coupling. Zero state management. Zero race conditions."

---

## Story 5: Demo 2 - Real-Time Collaboration Hub
**Visual:** Multiple terminal windows showing real-time sync

**Narration:** "Second demo: real-time collaboration. Traditional approach? Firebase at 150KB or Socket.io plus Redux at 100KB. That's 500+ lines of boilerplate."

**Visual:** Code editor showing Skeleton Crew approach

```typescript
const presencePlugin = {
  name: 'presence',
  version: '1.0.0',
  setup(ctx) {
    const users = new Map();
    
    ctx.actions.registerAction({
      id: 'presence:join',
      handler: async ({ userId, name }) => {
        users.set(userId, { name, joinedAt: Date.now() });
        ctx.events.emit('presence:updated', Array.from(users.values()));
        return { success: true };
      }
    });
    
    ctx.actions.registerAction({
      id: 'presence:leave',
      handler: async ({ userId }) => {
        users.delete(userId);
        ctx.events.emit('presence:updated', Array.from(users.values()));
        return { success: true };
      }
    });
  }
};
```

**Narration:** "130 lines total. 75% reduction. WebSocket server, state sync, message routing - all handled."

---

## Story 6: The Testing Win
**Visual:** Code editor showing test file

**Narration:** "One of the biggest wins: plugins are trivial to test."

**Visual:** Test code

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { gitPlugin } from './git-plugin.js';

describe('GitPlugin', () => {
  let runtime, mockExec;
  
  beforeEach(async () => {
    mockExec = vi.fn().mockResolvedValue('success');
    
    runtime = new Runtime({
      hostContext: { exec: mockExec }
    });
    
    await runtime.initialize();
    runtime.getContext().plugins.registerPlugin(gitPlugin);
  });
  
  it('executes git status', async () => {
    const ctx = runtime.getContext();
    await ctx.actions.runAction('git:status');
    
    expect(mockExec).toHaveBeenCalledWith('git', ['status', '--short']);
  });
});
```

**Narration:** "No need to set up the entire app. Mock only what you need. Fast, isolated tests."

---

## Story 7: The Migration Strategy
**Visual:** Diagram showing legacy app with plugins on top

**Narration:** "You don't need to rewrite your app. Skeleton Crew runs alongside your existing code."

**Visual:** Code showing host context injection

```typescript
// Your legacy app
class LegacyApp {
  constructor() {
    this.db = new Database();
    this.auth = new AuthService();
  }
}

// Inject into runtime
const runtime = new Runtime({
  hostContext: {
    db: legacyApp.db,
    auth: legacyApp.auth
  }
});

// New features as plugins
const analyticsPlugin = {
  name: 'analytics',
  version: '1.0.0',
  setup(ctx) {
    const { db } = ctx.host;  // Use legacy services
    
    ctx.actions.registerAction({
      id: 'analytics:track',
      handler: async (event) => {
        await db.insert('analytics', event);
      }
    });
  }
};
```

**Narration:** "Legacy services flow up through host context. New features are clean plugins. No rewrite needed."

---

## Story 8: The Real Numbers
**Visual:** Table showing before/after comparisons

**Narration:** "These aren't theoretical numbers. These are real projects."

**Visual:** Stats appearing

```
CLI Dev Tools:     500 lines → 150 lines (70% reduction)
Real-time Collab:  500 lines → 130 lines (75% reduction)
Browser Extension: 550 lines → 190 lines (65% reduction)
Bundle Size:       50-150KB → 4-8KB (90%+ reduction)
Build Time:        1-7 days → 1-3 hours (95%+ reduction)
```

**Narration:** "Ship in hours, not days. Write 150 lines instead of 500."

---

## Story 9: When to Use It
**Visual:** Checklist appearing

**Narration:** "Perfect for internal tools, browser extensions, CLI applications, real-time features, and legacy modernization."

**Visual:** Anti-checklist appearing

**Narration:** "Not ideal for public-facing apps with complex routing or heavy state management. Use Next.js or Remix for those."

---

## Story 10: The Core Philosophy
**Visual:** Minimal code on screen, clean and focused

**Narration:** "Skeleton Crew. The bare minimum crew needed to run a ship. Four subsystems. Under 5KB. Zero framework lock-in."

**Visual:** Four boxes appearing

```
Plugin Registry  →  Manage plugin lifecycle
Screen Registry  →  Store UI definitions
Action Engine    →  Execute business logic
Event Bus        →  Coordinate features
```

**Narration:** "Just enough structure. Nothing more."

---

## Story 11: Try It Now
**Visual:** Terminal with npm install

```bash
npm install skeleton-crew-runtime
```

**Narration:** "Install it. Run the demos. See the code reduction yourself."

**Visual:** Terminal showing demo commands

```bash
cd demo/dev-launcher && npm start
cd demo/collab-hub && npm run server
```

**Narration:** "30 minutes to see it in action. 70% less code. Built for developers who need to ship fast."

**Visual:** Fade to Skeleton Crew logo

**Text on screen:** "skeleton-crew-runtime - Write 150 lines instead of 500"

---

## Production Notes

### Visual Style
- **Code-first approach** - Show real code, not abstract diagrams
- **Split screens** - Before/after comparisons, side-by-side code
- **Syntax highlighting** - TypeScript with clear, readable fonts
- **Terminal recordings** - Real demos running, not mockups
- **Minimal animations** - Code typing out, line counts shrinking
- **Dark theme** - Developer-friendly color scheme

### Narration Style
- **Technical but accessible** - Speak to developers, not beginners
- **Numbers-driven** - "70% reduction", "150 lines", "5KB"
- **Show, don't tell** - Let code speak, narration adds context
- **Confident, not salesy** - State facts, demonstrate value
- **Pacing** - Pause for code comprehension (3-5 seconds per snippet)
- **45-60 seconds per story** - More time for code examples

### Code Display Guidelines
- **Font size** - Large enough to read on mobile (16-18pt minimum)
- **Line numbers** - Show for context
- **Highlighting** - Emphasize key lines (actions, events, host context)
- **Diff view** - Use for before/after comparisons
- **Complete examples** - No "..." placeholders, show real working code

### Music
- **Minimal electronic** - Subtle, tech-focused
- **No vocals** - Don't compete with narration
- **Consistent tempo** - Matches code typing rhythm
- **Fades during demos** - Let terminal output be heard

### Total Runtime
- 11 stories × 50 seconds average = ~9-10 minutes
- Can be split into 3 chapters:
  - Chapter 1: Problem & Solution (Stories 1-2)
  - Chapter 2: Demos (Stories 3-5)
  - Chapter 3: Real-World Usage (Stories 6-11)

### Key Themes
1. **Boilerplate elimination** - 500 lines → 150 lines
2. **Real demos** - Dev launcher, real-time collab
3. **Plugin architecture** - Isolated, testable, composable
4. **Testing wins** - Easy to mock, fast to run
5. **Migration strategy** - No rewrite needed
6. **Real numbers** - Actual project metrics
7. **When to use** - Clear use cases and anti-patterns
8. **Core philosophy** - Minimal, focused, just enough

### Call to Action
- **Primary:** `npm install skeleton-crew-runtime`
- **Secondary:** Run the demos (`cd demo/dev-launcher && npm start`)
- **Tertiary:** GitHub repo, documentation links
- **Tagline:** "Write 150 lines instead of 500. Ship in hours, not days."

### Target Audience
- **Senior developers** - Dealing with legacy code
- **Tech leads** - Making architecture decisions
- **Indie developers** - Building internal tools quickly
- **Extension developers** - Need minimal boilerplate
- **CLI tool builders** - Want plugin architecture

### What Makes This Different
- **Code-heavy** - 60% code, 40% narration
- **Real metrics** - Actual line counts, bundle sizes
- **Working demos** - Not mockups or prototypes
- **Migration focus** - Don't rewrite, extend
- **Developer empathy** - We know boilerplate pain
