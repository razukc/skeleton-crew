# Migration Proposals vs SCR Philosophy - Detailed Comparison

## Proposal-by-Proposal Analysis

### 1. Context Injection

| Aspect | Proposal | SCR Philosophy | Verdict |
|--------|----------|----------------|---------|
| **What** | Inject host services into runtime | Environment-neutral | ✅ ALIGNED |
| **How** | `new Runtime({ hostContext: {...} })` | Minimal API change | ✅ ALIGNED |
| **Why** | Enable host integration | Plugin-driven | ✅ ALIGNED |
| **Risk** | Could become DI framework | Keep simple | ⚠️ MONITOR |
| **Decision** | **ADOPT** | Additive, non-breaking | ✅ |

**Implementation:**
- Add optional `hostContext` parameter
- Expose as readonly `context.host`
- No lifecycle management
- No dependency injection magic

---

### 2. Action Wrappers

| Aspect | Proposal | SCR Philosophy | Verdict |
|--------|----------|----------------|---------|
| **What** | Helpers to wrap legacy code | Utility functions | ✅ ALIGNED |
| **How** | Separate package | External to core | ✅ ALIGNED |
| **Why** | Ease migration | Help adoption | ✅ ALIGNED |
| **Risk** | None (external package) | No core changes | ✅ SAFE |
| **Decision** | **ADOPT** | As separate package | ✅ |

**Implementation:**
- Create `@skeleton-crew/migration-utils`
- Pure utility functions
- No runtime dependencies
- Optional package

---

### 3. Module System

| Aspect | Proposal | SCR Philosophy | Verdict |
|--------|----------|----------------|---------|
| **What** | Built-in module registry | Minimal core | ❌ MISALIGNED |
| **How** | New subsystem in core | Adds complexity | ❌ MISALIGNED |
| **Why** | Share business logic | JS already has modules | ❌ UNNECESSARY |
| **Risk** | Scope creep | Violates minimalism | ❌ HIGH |
| **Decision** | **REJECT** | Use standard JS modules | ❌ |

**Why Reject:**
- JavaScript already has ESM/CommonJS
- Adds unnecessary abstraction
- Increases core complexity
- Out of scope for runtime

**Alternative:**
```typescript
// Just use regular imports!
import { validateEmail } from '../shared/validation.js';
```

---

### 4. Sandboxing & Permissions

| Aspect | Proposal | SCR Philosophy | Verdict |
|--------|----------|----------------|---------|
| **What** | Run plugins in isolation | Environment-neutral | ❌ MISALIGNED |
| **How** | Worker threads, permissions | Assumes capabilities | ❌ MISALIGNED |
| **Why** | Security for untrusted plugins | Internal tools focus | ❌ UNNECESSARY |
| **Risk** | Massive complexity | Violates minimalism | ❌ VERY HIGH |
| **Decision** | **REJECT** | Host app's responsibility | ❌ |

**Why Reject:**
- SCR is for internal tools, not public marketplaces
- Security is host application's concern
- Massive scope increase
- Environment-specific (assumes Node.js workers)

**Alternative:**
- Host app controls what's in context
- Don't load untrusted plugins
- Use Node workers if needed (host's choice)

---

### 5. Plugin Installer & Registry

| Aspect | Proposal | SCR Philosophy | Verdict |
|--------|----------|----------------|---------|
| **What** | Built-in plugin installation | Minimal core | ❌ MISALIGNED |
| **How** | Download, verify, install | Package manager | ❌ MISALIGNED |
| **Why** | Manage plugins | npm exists | ❌ UNNECESSARY |
| **Risk** | Huge scope increase | Violates minimalism | ❌ VERY HIGH |
| **Decision** | **REJECT** | Use npm/yarn/pnpm | ❌ |

**Why Reject:**
- npm/yarn/pnpm already exist
- Package management is solved
- Adds massive complexity
- Out of scope for runtime

**Alternative:**
```bash
npm install @mycompany/scr-plugin-analytics
```

---

### 6. CLI Integration

| Aspect | Proposal | SCR Philosophy | Verdict |
|--------|----------|----------------|---------|
| **What** | Built-in CLI framework | UI-agnostic | ⚠️ BORDERLINE |
| **How** | Core CLI subsystem | CLI is a UI | ⚠️ BORDERLINE |
| **Why** | Help CLI apps | Plugin can do this | ⚠️ BORDERLINE |
| **Risk** | Becoming CLI framework | Violates UI-agnostic | ⚠️ MEDIUM |
| **Decision** | **DEFER** | Build as plugin if needed | ⚠️ |

**Why Defer:**
- CLI is a type of UI
- Should be plugin, not core
- Can be external package
- Wait for community demand

**Alternative:**
- Create `@skeleton-crew/cli-adapter` plugin
- Keep out of core
- Optional package

---

### 7. Browser Adapter

| Aspect | Proposal | SCR Philosophy | Verdict |
|--------|----------|----------------|---------|
| **What** | Built-in browser integration | Environment-neutral | ⚠️ BORDERLINE |
| **How** | Core browser subsystem | Assumes browser | ⚠️ BORDERLINE |
| **Why** | Help browser apps | Plugin can do this | ⚠️ BORDERLINE |
| **Risk** | Environment-specific | Violates neutrality | ⚠️ MEDIUM |
| **Decision** | **DEFER** | Build as plugin if needed | ⚠️ |

**Why Defer:**
- Should be plugin, not core
- Can be external package
- Wait for community demand
- Avoid browser assumptions in core

**Alternative:**
- Create `@skeleton-crew/browser-adapter` plugin
- Keep out of core
- Optional package

---

### 8. Introspection API

| Aspect | Proposal | SCR Philosophy | Verdict |
|--------|----------|----------------|---------|
| **What** | Query registered resources | Minimal core | ✅ ALIGNED |
| **How** | Expose existing methods | Already implemented | ✅ ALIGNED |
| **Why** | Enable tooling | Help developers | ✅ ALIGNED |
| **Risk** | None (already exists) | Just exposing | ✅ SAFE |
| **Decision** | **ADOPT** | Make internal methods public | ✅ |

**Implementation:**
- Expose `getAllActions()`, `getAllPlugins()`, etc.
- Add to RuntimeContext
- Return copies (prevent mutation)
- Zero breaking changes

---

### 9. Migration Wizard CLI

| Aspect | Proposal | SCR Philosophy | Verdict |
|--------|----------|----------------|---------|
| **What** | CLI tool to scan/migrate code | Minimal core | ❌ MISALIGNED |
| **How** | Built-in CLI command | External tool | ❌ MISALIGNED |
| **Why** | Ease migration | Not runtime concern | ❌ UNNECESSARY |
| **Risk** | Scope creep | Violates minimalism | ❌ MEDIUM |
| **Decision** | **REJECT** | Build as separate tool | ❌ |

**Why Reject:**
- Not part of runtime functionality
- Should be external tool
- Can be community project
- Out of scope

**Alternative:**
- Create `scr-migrate` CLI tool (separate repo)
- Or community-built tool
- Not in core runtime

---

### 10. Adapter System (as Core Concept)

| Aspect | Proposal | SCR Philosophy | Verdict |
|--------|----------|----------------|---------|
| **What** | New "Adapter" subsystem | Minimal core | ❌ MISALIGNED |
| **How** | 5th core subsystem | Adds complexity | ❌ MISALIGNED |
| **Why** | Environment integration | Plugins can do this | ⚠️ BORDERLINE |
| **Risk** | New core concept | Violates minimalism | ⚠️ MEDIUM |
| **Decision** | **REJECT** | Use plugin system instead | ❌ |

**Why Reject:**
- Adapters can be plugins
- No need for new core concept
- Increases complexity
- Plugin system already handles this

**Alternative:**
```typescript
// Adapter is just a plugin!
const cliAdapter: PluginDefinition = {
  name: 'cli-adapter',
  setup(context) {
    // CLI-specific logic
  }
};
```

---

## Summary Table

| Proposal | Alignment | Risk | Decision | Reason |
|----------|-----------|------|----------|--------|
| Context Injection | ✅ HIGH | LOW | **ADOPT** | Natural extension |
| Action Wrappers | ✅ HIGH | LOW | **ADOPT** | External package |
| Introspection API | ✅ HIGH | LOW | **ADOPT** | Expose existing |
| Module System | ❌ LOW | HIGH | **REJECT** | Use JS modules |
| Sandboxing | ❌ LOW | VERY HIGH | **REJECT** | Out of scope |
| Plugin Registry | ❌ LOW | VERY HIGH | **REJECT** | Use npm |
| CLI Integration | ⚠️ MEDIUM | MEDIUM | **DEFER** | Plugin if needed |
| Browser Adapter | ⚠️ MEDIUM | MEDIUM | **DEFER** | Plugin if needed |
| Migration Wizard | ❌ LOW | MEDIUM | **REJECT** | External tool |
| Adapter System | ❌ LOW | MEDIUM | **REJECT** | Use plugins |

---

## Philosophy Scorecard

### ✅ Maintains Philosophy (3 proposals)

1. Context Injection
2. Action Wrappers (external)
3. Introspection API

**Impact:** AMPLIFIES core strengths

---

### ⚠️ Borderline (2 proposals)

1. CLI Integration (as plugin)
2. Browser Adapter (as plugin)

**Impact:** NEUTRAL if kept as plugins

---

### ❌ Violates Philosophy (5 proposals)

1. Module System
2. Sandboxing
3. Plugin Registry
4. Migration Wizard
5. Adapter System (as core concept)

**Impact:** Would DEGRADE core philosophy

---

## Conclusion

**Out of 10 proposals:**
- ✅ **3 should be ADOPTED** (30%)
- ⚠️ **2 should be DEFERRED** (20%)
- ❌ **5 should be REJECTED** (50%)

**The migration documentation contains valuable ideas, but most proposals would violate SCR's core philosophy. Selective adoption is critical.**

