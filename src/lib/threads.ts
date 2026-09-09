import type { Post } from "../shared/types.ts";
import { compareIdsDesc, comparePosts } from "../shared/posts.ts";

export type FeedItem =
  | { kind: "post"; id: string; sort_at: string; post: Post }
  | { kind: "thread"; id: string; sort_at: string; posts: Post[] };

/** Collapses posts sharing a thread root into one item. Input and output are newest first. */
export function groupThreads(sorted: Post[]): FeedItem[] {
  const groups = new Map<string, Post[]>();
  for (const p of sorted) {
    const key = `${p.creator}:${p.thread_root_id}`;
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }
  const items: FeedItem[] = [];
  for (const posts of groups.values()) {
    const newest = posts[0];
    if (!newest) continue;
    if (posts.length === 1) {
      items.push({ kind: "post", id: newest.id, sort_at: newest.sort_at, post: newest });
    } else {
      const ascending = [...posts].sort((a, b) => -comparePosts(a, b));
      items.push({ kind: "thread", id: newest.id, sort_at: newest.sort_at, posts: ascending });
    }
  }
  items.sort((a, b) =>
    a.sort_at !== b.sort_at ? (a.sort_at < b.sort_at ? 1 : -1) : compareIdsDesc(a.id, b.id),
  );
  return items;
}
