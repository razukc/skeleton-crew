// The monolith's shared, mutable store. Every feature imports this module
// directly and mutates it — this is the coupling the experiment measures.
// `activity` is THE HOTSPOT: every feature appends to it.

export interface Member { id: string; name: string }
export interface Task { id: string; title: string; done: boolean }
export interface ActivityEntry { id: string; kind: string; at: number; data: Record<string, unknown> }

export interface Store {
  members: Map<string, Member>;
  tasks: Map<string, Task>;
  activity: ActivityEntry[];
  nextId: number;
}

let store: Store = freshStore();

function freshStore(): Store {
  return { members: new Map(), tasks: new Map(), activity: [], nextId: 1 };
}

/** Reset to a clean state — used by tests and between sandboxed runs. */
export function resetStore(): void {
  store = freshStore();
}

export function getStore(): Store {
  return store;
}

/** The hotspot writer. Monotonic id via the shared counter. */
export function recordActivity(kind: string, data: Record<string, unknown>): ActivityEntry {
  const s = getStore();
  const entry: ActivityEntry = { id: String(s.nextId++), kind, at: 0, data };
  s.activity.push(entry);
  return entry;
}
