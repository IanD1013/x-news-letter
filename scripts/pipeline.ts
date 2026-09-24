import { appendFileSync, readFileSync } from "node:fs";
import type { CreatorConfig, Post } from "../src/shared/types.ts";
import { comparePosts, postKey } from "../src/shared/posts.ts";
import { fxembed } from "./source/fxembed.ts";
import type { PostSource } from "./source/types.ts";
import { readAllPosts, writeStore } from "./store.ts";

const INCREMENTAL_PAGES = 10;
const OUTPUT_ID_LIMIT = 50;

/** Handles from creators.json. An empty list is valid: every account was unfollowed. */
function loadCreators(): string[] {
  const raw = JSON.parse(readFileSync("creators.json", "utf8")) as CreatorConfig[];
  return raw.map((c) => c.screen_name.trim()).filter(Boolean);
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1)
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  return n;
}

async function fetchNew(
  source: PostSource,
  creator: string,
  known: Set<string>,
  maxPages: number,
): Promise<Post[]> {
  const fresh: Post[] = [];
  let cursor: string | null = null;
  // created_at of the closest newer original post in timeline order, carried across pages.
  let newerOriginalAt: string | null = null;
  for (let page = 1; page <= maxPages; page++) {
    const result = await source.fetchPage(creator, cursor);
    let added = 0;
    for (const p of result.items) {
      if (p.reposted_by) p.sort_at = repostSortAt(newerOriginalAt, p.fetched_at);
      else newerOriginalAt = p.created_at;
      const key = postKey(p);
      if (known.has(key)) continue;
      known.add(key);
      fresh.push(p);
      added++;
    }
    console.log(
      `@${creator} page ${page}: ${result.items.length} items, ${added} new` +
        (result.nextCursor ? "" : ", end of timeline"),
    );
    if (result.items.length === 0 || added === 0 || !result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return fresh;
}

/**
 * The source does not say when a repost happened, only where it sits in the timeline.
 * Place it just below the nearest newer original post; at the very top, use the fetch time.
 */
function repostSortAt(newerOriginalAt: string | null, fetchedAt: string): string {
  if (!newerOriginalAt) return fetchedAt;
  return new Date(Date.parse(newerOriginalAt) - 1000).toISOString();
}

/** Point every new post at its thread root. Parents resolve before children (ascending id). */
function linkThreads(existing: Post[], fresh: Post[]): void {
  const byKey = new Map<string, Post>();
  for (const p of existing) byKey.set(postKey(p), p);
  for (const p of fresh) byKey.set(postKey(p), p);
  const ascending = [...fresh].sort((a, b) => -comparePosts(a, b));
  for (const p of ascending) {
    const parent = p.reply_to_id
      ? byKey.get(postKey({ creator: p.creator, id: p.reply_to_id }))
      : undefined;
    p.thread_root_id = parent ? parent.thread_root_id : p.id;
  }
}

function sameHandle(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function writeOutputs(fresh: Post[], dropped: string[]): void {
  const ids = [...fresh]
    .sort(comparePosts)
    .slice(0, OUTPUT_ID_LIMIT)
    .map((p) => p.id)
    .join(",");
  const parts = [`${fresh.length} new posts`];
  if (dropped.length > 0) parts.push(`unfollowed ${dropped.map((c) => `@${c}`).join(", ")}`);
  const lines = `new_count=${fresh.length}\nnew_ids=${ids}\nsummary=${parts.join(", ")}\n`;
  process.stdout.write(lines);
  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, lines);
}

async function main(): Promise<void> {
  const creators = loadCreators();
  const backfillPages = intEnv("BACKFILL_PAGES", 25);
  const source = fxembed;

  // Posts of accounts that are no longer in creators.json leave the store.
  const stored = readAllPosts();
  const existing = stored.filter((p) => creators.some((c) => sameHandle(c, p.creator)));
  const dropped = [
    ...new Set(
      stored.filter((p) => !creators.some((c) => sameHandle(c, p.creator))).map((p) => p.creator),
    ),
  ];
  const known = new Set(existing.map(postKey));
  console.log(
    `store: ${stored.length} posts, following ${creators.length}, source: ${source.name}`,
  );
  for (const c of dropped) console.log(`@${c}: unfollowed, dropping their posts`);

  const fresh: Post[] = [];
  for (const creator of creators) {
    const hasData = existing.some((p) => sameHandle(p.creator, creator));
    const maxPages = hasData ? INCREMENTAL_PAGES : backfillPages;
    if (!hasData) console.log(`@${creator}: first run, backfilling up to ${maxPages} pages`);
    fresh.push(...(await fetchNew(source, creator, known, maxPages)));
  }

  if (fresh.length > 0 || dropped.length > 0) {
    linkThreads(existing, fresh);
    writeStore([...existing, ...fresh], creators);
    console.log(`wrote store: ${fresh.length} new posts, ${dropped.length} accounts dropped`);
  } else {
    console.log("no changes");
  }
  writeOutputs(fresh, dropped);
}

await main();
