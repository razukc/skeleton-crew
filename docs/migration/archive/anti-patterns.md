“Anti-patterns” section to avoid bad migrations

Below is a **clean, opinionated “Anti-patterns” section** you can drop straight into your docs.
It focuses *specifically* on traps developers fall into when migrating existing applications to Skeleton Crew Runtime (SCR).

---

# **❌ Migration Anti-Patterns (and What to Do Instead)**

Adopting Skeleton Crew Runtime incrementally is powerful — but there are several traps that can make your migration painful, fragile, or even break the purpose of SCR entirely.
This section lists **real-world anti-patterns**, explains **why they’re bad**, and shows the **correct alternative**.

---

# **1. ❌ Treating SCR Actions as Big “God Scripts”**

### **Anti-pattern**

Turning an entire legacy script into one massive SCR action:

```js
export async function migrateAllData() {
  await step1();
  await step2();
  await step3();
  await step4();
  await step5();
  ...
}
```

### **Why this is bad**

* No observability
* No reusability
* Can’t compose into workflows
* Hard to test
* If it fails, you restart from scratch

### ✔ **Correct approach**

Break logic into **small actions**:

```js
actions: {
  "data:extract": extractData,
  "data:transform": transformData,
  "data:load": loadData
}
```

And a workflow:

```js
workflows: {
  migrateAll: {
    steps: [
      "data:extract",
      "data:transform",
      "data:load"
    ]
  }
}
```

---

# **2. ❌ Rewriting Everything at Once**

### **Anti-pattern**

Throwing away existing code and trying to rebuild the entire toolchain inside SCR.

### **Why this is bad**

* Huge migration risk
* Multiple unknowns at once
* Loses feature parity
* Delays shipping by months

### ✔ Correct approach

Adopt SCR in **layers**:

1. Wrap old scripts → SCR actions
2. Gradually replace parts
3. Extract shared logic into modules
4. Introduce workflows
5. Introduce browser-runtime last (if needed)

---

# **3. ❌ Using SCR as an RPC Replacement**

### **Anti-pattern**

Trying to move *all* server calls into SCR actions and treat SCR like gRPC or tRPC:

```js
await scr.run("getUserFromDatabase");
```

### **Why this is bad**

* SCR is not a networking layer
* You lose backend’s existing infra
* Complicates deployment
* Breaks separation of concerns

### ✔ Correct approach

Use SCR for **business logic + workflows**, not for replacing backend APIs.

---

# **4. ❌ Duplicating Logic Between App + SCR**

### **Anti-pattern**

Migrating to SCR but leaving versions of logic across codebases:

```
/src/utils/validate.js
/scr/modules/validate.js
/components/validate.js
```

### **Why this is bad**

* Drift occurs
* Bugs appear in one place only
* Developers get confused which version to import

### ✔ Correct approach

Always keep shared logic **inside SCR modules**, imported everywhere:

```js
import { validateUser } from "scr/modules/validate-user.js";
```

---

# **5. ❌ Calling CLI Actions From CLI Scripts**

### **Anti-pattern**

Using shell scripts that call SCR CLI which themselves call other shell scripts.

Example:

```
deploy.sh → npx skeleton deploy → deploy script → calls shell
```

This causes:

* Recursion
* Surprise failures
* Lost context/logging
* Hard debugging

### ✔ Correct approach

Convert the shell steps into SCR actions, then compose:

```js
actions: {
  build,
  upload,
  restart
}
```

Workflow:

```js
release: { steps: ["build", "upload", "restart"] }
```

---

# **6. ❌ Treating SCR as a Framework**

### **Anti-pattern**

Trying to build the whole app UI, API, auth, routing, networking inside SCR.

### **Why this is bad**

* SCR becomes heavy and opinionated
* Not portable
* Harder to adopt for existing apps
* Kills the “lightweight skeleton” vision

### ✔ Correct approach

SCR = **runtime engine for actions/workflows/modules**
Your app = **anything you want**

Use SCR where it excels:

* task automation
* workflows
* shared logic
* portable logic
* browser/CLI integration
* plugin ecosystem

Not:

* routing
* server rendering
* state management
* backend frameworks
* large UI abstractions

---

# **7. ❌ Passing Huge Payloads to Actions**

### **Anti-pattern**

Dumping entire objects/images/files into the action payload:

```js
scr.run("process", { file: hugeFile });
```

### **Why this is bad**

* Payloads get serialized
* Memory spikes
* Performance degrades
* Browser → CLI becomes extremely slow

### ✔ Correct approach

Pass **handles**, not full data:

```js
scr.run("process", { filePath: "/tmp/image.png" });
```

OR in browser:

```js
scr.run("process", { fileId });
```

Let the action read from disk or indexDB.

---

# **8. ❌ Mixing UI Logic Inside Actions**

### **Anti-pattern**

Actions should never render components or manipulate DOM:

```js
export async function submit({ payload }) {
  showToast("Done!");  // ❌ UI inside action
}
```

### **Why this is bad**

* Actions are runtime-agnostic: CLI, browser, server
* UI logic breaks portability
* Headless execution no longer possible

### ✔ Correct approach

Return a signal and let UI handle it:

```js
return { ok: true, message: "Done!" };
```

Browser:

```js
const result = await scr.run("submit");
toast(result.message);
```

---

# **9. ❌ Forcing UI Framework Choice Into SCR Core**

### **Anti-pattern**

Building SCR assuming React, Vue, Svelte, Shadcn, etc.

### **Why this is bad**

* Makes SCR not framework-agnostic
* Blocks ecosystem growth
* Makes plugins incompatible with multiple environments

### ✔ Correct approach

Frameworks belong in **plugins**, not the runtime.

SCR Core = headless
Plugin = UI integration

---

# **10. ❌ Creating Global State in Actions**

### **Anti-pattern**

Actions sharing mutable global state:

```js
let cache = {};

export async function step1() { cache.a = 1; }
export async function step2() { return cache.a; }
```

### **Why this is bad**

* Race conditions
* Hard-to-debug bugs
* Environment-dependent (browser vs CLI)

### ✔ Correct approach

Use explicit payload passing:

```js
export async function step1() { return { a: 1 }; }
export async function step2({ payload }) { return payload.a; }
```

Or store state in an SCR Module:

```js
import { globalState } from "scr/modules/state.js";
```

---

# **11. ❌ Embedding SCR Runtime Inside Libraries**

### **Anti-pattern**

Bundling SCR during library builds so your tools depend on it implicitly.

### **Why this is bad**

* Version mismatch risk
* Impossible to upgrade safely
* Causes “ghost runtimes” in node_modules

### ✔ Correct approach

Library should **accept** SCR context, not create it.

Example:

```js
export function createJobHandler(scr) {
  return async function handler() {
    return scr.run("job:run");
  }
}
```

Not this:

```js
import { createRuntime } from "skeleton-crew";
const scr = createRuntime(); // ❌ hidden runtime
```

---

# **12. ❌ Using SCR to Replace Build Tools (Vite, Turborepo, NX)**

SCR is **not**:

* a bundler
* a dev server
* an asset pipeline
* a monorepo orchestrator

### **Anti-pattern**

Trying to rebuild Vite-like or Turbo-like features inside SCR actions.

### **Why this is bad**

* Slow
* Hard to maintain
* Reinventing existing mature ecosystems

### ✔ Correct approach

SCR should orchestrate tools, not replace them:

```js
await exec("vite build");
await exec("turbo run lint");
await exec("nx print-affected");
```

---

# Ready for More?

I can also add:

✅ Anti-patterns specific to **browser usage**
✅ Anti-patterns for **plugin authors**
✅ Anti-patterns for **large enterprise migrations**
✅ Anti-patterns for **performance**
✅ Anti-patterns for **security**
✅ A "Migration LINt Tool" that detects anti-patterns automatically

Which one should we generate next?
