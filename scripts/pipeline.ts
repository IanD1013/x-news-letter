import { appendFileSync, readFileSync } from "node:fs";
import type { Post } from "../src/shared/types.ts";
import { comparePosts, postKey } from "../src/shared/posts.ts";
import { fxembed } from "./source/fxembed.ts";
import type { PostSource } from "./source/types.ts";
import { readAllPosts, writeStore } from "./store.ts";

const INCREMENTAL_PAGES = 10;
const OUTPUT_ID_LIMIT = 50;

type CreatorConfig = { screen_name: string };

function loadCreators(): string[] {
  const raw = JSON.parse(readFileSync("creators.json", "utf8")) as CreatorConfig[];
  const names = raw.map((c) => c.screen_name.trim()).filter(Boolean);
  if (names.length === 0) throw new Error("creators.json has no screen_name entries");
  return names;
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

function writeOutputs(fresh: Post[]): void {
  const ids = [...fresh]
    .sort(comparePosts)
    .slice(0, OUTPUT_ID_LIMIT)
    .map((p) => p.id)
    .join(",");
  const lines = `new_count=${fresh.length}\nnew_ids=${ids}\n`;
  process.stdout.write(lines);
  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, lines);
}

async function main(): Promise<void> {
  const creators = loadCreators();
  const backfillPages = intEnv("BACKFILL_PAGES", 25);
  const source = fxembed;

  const existing = readAllPosts();
  const known = new Set(existing.map(postKey));
  console.log(`store: ${existing.length} posts, source: ${source.name}`);

  const fresh: Post[] = [];
  for (const creator of creators) {
    const hasData = existing.some((p) => p.creator === creator);
    const maxPages = hasData ? INCREMENTAL_PAGES : backfillPages;
    if (!hasData) console.log(`@${creator}: first run, backfilling up to ${maxPages} pages`);
    fresh.push(...(await fetchNew(source, creator, known, maxPages)));
  }

  if (fresh.length > 0) {
    linkThreads(existing, fresh);
    writeStore([...existing, ...fresh], creators);
    console.log(`wrote ${fresh.length} new posts`);
  } else {
    console.log("no new posts");
  }
  writeOutputs(fresh);
}

await main();
