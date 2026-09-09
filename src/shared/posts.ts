import type { Post } from "./types.ts";

export function postKey(p: Pick<Post, "creator" | "id">): string {
  return `${p.creator}:${p.id}`;
}

export function compareIdsDesc(a: string, b: string): number {
  const x = BigInt(a);
  const y = BigInt(b);
  return x === y ? 0 : x < y ? 1 : -1;
}

/** Newest first: sort_at desc, then snowflake id desc. */
export function comparePosts(a: Post, b: Post): number {
  if (a.sort_at !== b.sort_at) return a.sort_at < b.sort_at ? 1 : -1;
  return compareIdsDesc(a.id, b.id);
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}
