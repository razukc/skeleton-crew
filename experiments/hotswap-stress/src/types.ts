// Shared types for the hot-swap stress harness.

/** A blog post resource. `tag` is added by the posts v2 "clean swap" variant. */
export interface Post {
  id: string;
  title: string;
  views: number;
  tag?: string; // present only after the clean-swap v2
}

/** A comment resource, linked to a post. */
export interface Comment {
  id: string;
  postId: string;
  text: string;
}

/**
 * The in-memory store handle, registered as the `store` service.
 * Map-backed so reads/writes are synchronous — no file-I/O async noise to
 * confound the swap-window timing signal.
 */
export interface Store {
  posts: Map<string, Post>;
  comments: Map<string, Comment>;
  /** Monotonic id source for created posts/comments — never reused, so a
   *  delete-then-create cannot collide with a surviving id. */
  nextId: number;
}

/** Runtime config. `pageSize` is the value scenario 5 mutates mid-swap. */
export interface StressConfig {
  pageSize: number;
}

/** Factory for a fresh, seeded store. */
export function createStore(): Store {
  const posts = new Map<string, Post>();
  const comments = new Map<string, Comment>();
  for (let i = 1; i <= 100; i++) {
    posts.set(String(i), { id: String(i), title: `Post ${i}`, views: i });
  }
  comments.set('1', { id: '1', postId: '1', text: 'first' });
  return { posts, comments, nextId: 101 };
}
