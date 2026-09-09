import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { IndexFile, LatestFile, MonthFile, Post } from "../src/shared/types.ts";
import { SCHEMA_VERSION } from "../src/shared/types.ts";
import { comparePosts, monthOf } from "../src/shared/posts.ts";

export const DATA_DIR = "public/data";
export const POSTS_DIR = join(DATA_DIR, "posts");
const LATEST_COUNT = 100;

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function readAllPosts(): Post[] {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR)
    .filter((f) => /^\d{4}-\d{2}\.json$/.test(f))
    .flatMap((f) => readJson<MonthFile>(join(POSTS_DIR, f)).posts);
}

function sameHandle(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function writeStore(posts: Post[], creatorNames: string[]): void {
  mkdirSync(POSTS_DIR, { recursive: true });
  const sorted = [...posts].sort(comparePosts);
  const now = new Date().toISOString();

  const byMonth = new Map<string, Post[]>();
  for (const p of sorted) {
    const m = monthOf(p.sort_at);
    const list = byMonth.get(m);
    if (list) list.push(p);
    else byMonth.set(m, [p]);
  }
  for (const [month, list] of byMonth) {
    const file: MonthFile = { month, posts: list };
    writeFileSync(join(POSTS_DIR, `${month}.json`), toJson(file));
  }

  const creators = creatorNames.map((name) => {
    const own = sorted.find((p) => sameHandle(p.author.screen_name, name))?.author;
    const viaRepost = sorted.find(
      (p) => p.reposted_by && sameHandle(p.reposted_by.screen_name, name),
    )?.reposted_by;
    const a = own ?? viaRepost ?? { screen_name: name, name, avatar_url: "" };
    return { ...a, url: `https://x.com/${a.screen_name}` };
  });

  const index: IndexFile = {
    schemaVersion: SCHEMA_VERSION,
    generated_at: now,
    creators,
    months: [...byMonth.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([month, list]) => ({ month, count: list.length })),
    total: sorted.length,
    newest_id: sorted[0]?.id ?? null,
  };
  writeFileSync(join(DATA_DIR, "index.json"), toJson(index));

  const latest: LatestFile = { generated_at: now, posts: sorted.slice(0, LATEST_COUNT) };
  writeFileSync(join(DATA_DIR, "latest.json"), toJson(latest));
}
