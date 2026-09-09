import type { LatestFile } from "../src/shared/types.ts";
import { comparePosts } from "../src/shared/posts.ts";
import { DATA_DIR, readJson } from "./store.ts";

const SNIPPET_LENGTH = 200;

function snippet(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function ensureSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

async function main(): Promise<void> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.log("NTFY_TOPIC not set, skipping notification");
    return;
  }
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) throw new Error("SITE_URL is required");
  const server = (process.env.NTFY_SERVER ?? "https://ntfy.sh").replace(/\/+$/, "");

  const ids = new Set((process.env.NEW_IDS ?? "").split(",").filter(Boolean));
  if (ids.size === 0) {
    console.log("NEW_IDS is empty, nothing to announce");
    return;
  }

  const latest = readJson<LatestFile>(`${DATA_DIR}/latest.json`);
  const posts = latest.posts.filter((p) => ids.has(p.id)).sort(comparePosts);
  const newest = posts[0];
  if (!newest) {
    console.log("none of NEW_IDS are in latest.json, nothing to announce");
    return;
  }

  const creators = [...new Set(posts.map((p) => p.creator))];
  const n = posts.length;
  const title =
    creators.length === 1
      ? n === 1
        ? `@${creators[0]} 发布了新帖`
        : `@${creators[0]} 发布了 ${n} 条新帖`
      : `${n} 条新帖 · ${creators.map((c) => `@${c}`).join(", ")}`;

  const prefix = !newest.reposted_by
    ? ""
    : newest.reposted_by.screen_name === newest.author.screen_name
      ? "🔁 转发了自己的帖子\n"
      : `🔁 转发自 @${newest.author.screen_name}\n`;
  const body = newest.text.trim() ? snippet(newest.text, SNIPPET_LENGTH) : "(媒体帖)";
  const click = `${ensureSlash(siteUrl)}#p-${newest.id}`;

  const res = await fetch(server, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ topic, title, message: prefix + body, click, tags: ["bird"] }),
  });
  if (!res.ok) throw new Error(`ntfy responded ${res.status}: ${await res.text()}`);
  console.log(`notified ${server}/${topic}: ${title}`);
}

await main();
