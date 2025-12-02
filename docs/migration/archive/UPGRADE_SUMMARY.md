# SCR Upgrade Plan - Executive Summary

## TL;DR

**Verdict:** ⚠️ **SELECTIVE ADOPTION** - Implement 4 high-value features, reject 8 scope-creep proposals.

**Timeline:** 6-8 weeks
**Risk:** LOW (with selective approach)
**Impact:** AMPLIFIES core philosophy

---

## What to Build

### ✅ Phase 1: Core Enhancements (2 weeks)

1. **Context Injection** - Let host apps inject services
2. **Introspection API** - Expose existing internal methods

### ✅ Phase 2: Migration Utils (1 week)

3. **@skeleton-crew/migration-utils** - Separate package with wrappers

### ✅ Phase 4: Documentation (2 weeks)

4. **Enhanced Migration Guide** - Real examples, best practices

### ⚠️ Phase 3: Adapter Plugins (3 weeks) - OPTIONAL

5. **CLI/Browser Adapters** - Build if community requests

---

## What NOT to Build

### ❌ Rejected (Violate Philosophy)

1. **Module System** - Use JavaScript modules
2. **Sandboxing** - Host app's responsibility  
3. **Plugin Registry** - Use npm
4. **CLI Framework** - Out of scope
5. **Migration Wizard** - External tool
6. **State Management** - Out of scope
7. **Routing** - Out of scope
8. **Auth System** - Host app's responsibility

---

## Philosophy Impact

### ✅ AMPLIFIES Core Philosophy

- Makes SCR MORE embeddable
- Maintains minimal core
- Preserves UI-agnostic design
- Keeps environment-neutral
- Zero breaking changes

### Key Principles Maintained

1. **Minimal Core** - Only 2 small additions
2. **Plugin-Driven** - Adapters are plugins
3. **Environment-Neutral** - No assumptions
4. **UI-Agnostic** - No UI opinions
5. **Zero Lock-In** - Easy to adopt/remove

---

## Code Changes Summary

### Core Runtime Changes (Minimal)

```typescript
// NEW: Host context injection
const runtime = new Runtime({
  hostContext: { db, cache, logger }
});

// NEW: Access host services
context.host.db.query('...');

// NEW: Introspection
context.introspect.listActions();
context.introspect.listPlugins();
```

### Everything Else is External

- Migration utils → Separate package
- CLI adapter → Separate package
- Browser adapter → Separate package
- Examples → Documentation
- Wizard → Community tool

---

## Success Metrics

### Technical
- Core runtime stays < 5KB gzipped
- Zero breaking changes
- 90%+ test coverage

### Adoption
- 10+ successful migrations in 6 months
- Clear documentation
- Real-world examples

### Philosophy
- Core stays minimal
- No framework features
- Maintains simplicity

---

## Next Steps

1. **Review** this plan with team
2. **Prioritize** Phase 1 features
3. **Implement** context injection first
4. **Test** with real migration
5. **Document** as you build
6. **Release** v0.3.0

---

## Key Takeaway

**The migration documentation proposes many features. Most should be REJECTED to preserve SCR's philosophy. Only 4 core features should be implemented, with everything else as optional external packages.**

**This selective approach will AMPLIFY SCR's strengths while enabling legacy app integration.**

