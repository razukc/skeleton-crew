# SCR Upgrade - Decision Matrix

## Visual Decision Guide

```
                    PHILOSOPHY ALIGNMENT
                    
    HIGH    │  ✅ ADOPT      │  ⚠️ EVALUATE  │
            │                │               │
            │  • Context     │  • CLI        │
            │    Injection   │    Adapter    │
            │  • Introspect  │  • Browser    │
            │  • Wrappers    │    Adapter    │
            │                │               │
    ────────┼────────────────┼───────────────┤
            │                │               │
    MEDIUM  │  ⚠️ MONITOR    │  ❌ REJECT    │
            │                │               │
            │                │  • Module     │
            │                │    System     │
            │                │  • Sandboxing │
    ────────┼────────────────┼───────────────┤
            │                │               │
    LOW     │  ❌ REJECT     │  ❌ REJECT    │
            │                │               │
            │                │  • Plugin     │
            │                │    Registry   │
            │                │  • Migration  │
            │                │    Wizard     │
            │                │               │
            └────────────────┴───────────────┘
              LOW          MEDIUM         HIGH
                    COMPLEXITY / RISK
```

---

## Decision Criteria

### ✅ ADOPT if:
- ✓ Aligns with SCR philosophy
- ✓ Low complexity/risk
- ✓ High value for users
- ✓ No breaking changes
- ✓ Minimal core impact

### ⚠️ EVALUATE if:
- ⚠️ Borderline alignment
- ⚠️ Medium complexity
- ⚠️ Unclear demand
- ⚠️ Can be external
- ⚠️ Wait for feedback

### ❌ REJECT if:
- ✗ Violates philosophy
- ✗ High complexity
- ✗ Scope creep
- ✗ Already solved elsewhere
- ✗ Out of scope

---

## Feature Scoring

| Feature | Philosophy | Complexity | Value | Decision | Score |
|---------|-----------|------------|-------|----------|-------|
| Context Injection | 10/10 | 2/10 | 10/10 | ✅ ADOPT | 18/20 |
| Introspection API | 10/10 | 1/10 | 8/10 | ✅ ADOPT | 17/20 |
| Migration Wrappers | 10/10 | 3/10 | 9/10 | ✅ ADOPT | 16/20 |
| CLI Adapter | 6/10 | 5/10 | 6/10 | ⚠️ DEFER | 7/20 |
| Browser Adapter | 6/10 | 5/10 | 6/10 | ⚠️ DEFER | 7/20 |
| Module System | 2/10 | 8/10 | 4/10 | ❌ REJECT | -2/20 |
| Sandboxing | 2/10 | 10/10 | 3/10 | ❌ REJECT | -5/20 |
| Plugin Registry | 1/10 | 10/10 | 2/10 | ❌ REJECT | -7/20 |
| Migration Wizard | 4/10 | 7/10 | 5/10 | ❌ REJECT | 2/20 |
| Adapter System | 3/10 | 6/10 | 5/10 | ❌ REJECT | 2/20 |

**Scoring:**
- Philosophy: 0-10 (alignment with SCR principles)
- Complexity: 0-10 (lower is better)
- Value: 0-10 (user benefit)
- Score: Philosophy + Value - Complexity

**Threshold:**
- Score ≥ 15: ADOPT
- Score 10-14: EVALUATE
- Score < 10: REJECT

---

## Impact Analysis

### Core Runtime Impact

```
BEFORE (v0.2.x)          AFTER (v0.3.0)
─────────────────        ─────────────────
Runtime                  Runtime
├── PluginRegistry       ├── PluginRegistry
├── ScreenRegistry       ├── ScreenRegistry
├── ActionEngine         ├── ActionEngine
├── EventBus             ├── EventBus
└── UIBridge             ├── UIBridge
                         └── RuntimeContext
                             ├── host ← NEW
                             └── introspect ← NEW

Size: ~4.5KB             Size: ~5KB (+0.5KB)
Concepts: 5              Concepts: 5 (no change)
```

### Package Ecosystem

```
BEFORE                   AFTER
─────────────────        ─────────────────
skeleton-crew            skeleton-crew (core)
                         @skeleton-crew/migration-utils
                         @skeleton-crew/cli-adapter (optional)
                         @skeleton-crew/browser-adapter (optional)
```

---

## Risk Assessment

### Low Risk (✅ Safe to Implement)

**Context Injection**
- Risk: Could become DI framework
- Mitigation: Keep simple, readonly object
- Probability: LOW
- Impact: LOW

**Introspection API**
- Risk: Exposing internals
- Mitigation: Return copies, prevent mutation
- Probability: VERY LOW
- Impact: VERY LOW

**Migration Wrappers**
- Risk: None (external package)
- Mitigation: N/A
- Probability: NONE
- Impact: NONE

### Medium Risk (⚠️ Monitor Carefully)

**CLI Adapter**
- Risk: Becoming CLI framework
- Mitigation: Keep as plugin, defer until needed
- Probability: MEDIUM
- Impact: MEDIUM

**Browser Adapter**
- Risk: Environment-specific assumptions
- Mitigation: Keep as plugin, defer until needed
- Probability: MEDIUM
- Impact: MEDIUM

### High Risk (❌ Do Not Implement)

**Module System**
- Risk: Scope creep, unnecessary abstraction
- Mitigation: REJECT
- Probability: HIGH
- Impact: HIGH

**Sandboxing**
- Risk: Massive complexity, environment-specific
- Mitigation: REJECT
- Probability: VERY HIGH
- Impact: VERY HIGH

**Plugin Registry**
- Risk: Reinventing npm, huge scope
- Mitigation: REJECT
- Probability: VERY HIGH
- Impact: VERY HIGH

---

## Trade-off Analysis

### Context Injection

**Pros:**
- ✅ Enables host integration
- ✅ Minimal code change
- ✅ No breaking changes
- ✅ High value for users

**Cons:**
- ⚠️ Could be misused as DI framework
- ⚠️ Adds small complexity

**Decision:** ADOPT (pros outweigh cons)

---

### Module System

**Pros:**
- ✓ Centralized business logic
- ✓ Reduces duplication

**Cons:**
- ✗ JavaScript already has modules
- ✗ Adds unnecessary abstraction
- ✗ Increases core complexity
- ✗ Out of scope for runtime

**Decision:** REJECT (cons outweigh pros)

---

### Sandboxing

**Pros:**
- ✓ Security for untrusted plugins

**Cons:**
- ✗ Massive complexity
- ✗ Environment-specific
- ✗ SCR is for internal tools
- ✗ Host app's responsibility
- ✗ Out of scope

**Decision:** REJECT (cons heavily outweigh pros)

---

### CLI/Browser Adapters

**Pros:**
- ✓ Helps specific environments
- ✓ Can be plugins

**Cons:**
- ⚠️ Risk of environment-specific code
- ⚠️ Unclear demand
- ⚠️ Can be community-built

**Decision:** DEFER (wait for demand)

---

## Success Metrics

### Technical Metrics

| Metric | Target | Current | After v0.3.0 |
|--------|--------|---------|--------------|
| Core Size | < 5KB | 4.5KB | ~5KB ✅ |
| Core Concepts | ≤ 5 | 5 | 5 ✅ |
| Breaking Changes | 0 | N/A | 0 ✅ |
| Test Coverage | > 90% | 95% | > 90% ✅ |
| Dependencies | 0 | 0 | 0 ✅ |

### Philosophy Metrics

| Principle | Before | After | Status |
|-----------|--------|-------|--------|
| Minimal Core | ✅ | ✅ | Maintained |
| UI-Agnostic | ✅ | ✅ | Maintained |
| Environment-Neutral | ✅ | ✅ | Maintained |
| Plugin-Driven | ✅ | ✅ | Maintained |
| Zero Assumptions | ✅ | ✅ | Maintained |

### Adoption Metrics

| Metric | 3 Months | 6 Months | 12 Months |
|--------|----------|----------|-----------|
| Migrations | 3+ | 10+ | 25+ |
| Downloads | +20% | +50% | +100% |
| Issues | < 5 | < 10 | < 20 |
| Community Plugins | 1+ | 3+ | 10+ |

---

## Decision Tree

```
Is the feature needed?
│
├─ NO → REJECT
│
└─ YES → Does it align with SCR philosophy?
    │
    ├─ NO → REJECT
    │
    └─ YES → Can it be external?
        │
        ├─ YES → Make it external package
        │
        └─ NO → Is complexity low?
            │
            ├─ NO → REJECT or DEFER
            │
            └─ YES → Is value high?
                │
                ├─ NO → DEFER
                │
                └─ YES → ADOPT ✅
```

---

## Final Recommendation

### Implement (4 features)
1. ✅ Context Injection
2. ✅ Introspection API
3. ✅ Migration Utils (external)
4. ✅ Documentation

### Defer (2 features)
1. ⚠️ CLI Adapter (if requested)
2. ⚠️ Browser Adapter (if requested)

### Reject (6 features)
1. ❌ Module System
2. ❌ Sandboxing
3. ❌ Plugin Registry
4. ❌ CLI Framework
5. ❌ Migration Wizard
6. ❌ Adapter System (as core)

**Total:** 4 ADOPT + 2 DEFER + 6 REJECT = 12 proposals evaluated

**Adoption Rate:** 33% (4/12)

**Philosophy Preservation:** 100%

