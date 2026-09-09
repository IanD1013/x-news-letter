import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { Feed } from "feed";
import type { IndexFile, LatestFile, Post, QuotePost } from "../src/shared/types.ts";
import { DATA_DIR, readJson } from "./store.ts";

const DIST = "dist";
const FEED_ITEMS = 50;

function ensureSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function paragraph(text: string, lang: string): string {
  return `<p lang="${lang}">${escapeHtml(text).replaceAll("\n", "<br/>")}</p>`;
}

function mediaHtml(post: Post | QuotePost): string {
  return post.media
    .map((m) =>
      m.type === "photo"
        ? `<p><img src="${m.url}" width="${m.width}" height="${m.height}" alt=""/></p>`
        : `<p><a href="${post.url}">▶ ${m.type === "gif" ? "GIF" : "视频"}</a></p>`,
    )
    .join("");
}

function itemHtml(post: Post): string {
  const parts: string[] = [];
  if (post.reposted_by) parts.push(`<p>${escapeHtml(repostLabel(post))}</p>`);
  if (post.text.trim()) parts.push(paragraph(post.text, post.lang));
  parts.push(mediaHtml(post));
  if (post.quote) {
    const q = post.quote;
    parts.push(
      `<blockquote><p><a href="${q.url}">${escapeHtml(q.author.name)} @${escapeHtml(q.author.screen_name)}</a></p>` +
        paragraph(q.text, "en") +
        mediaHtml(q) +
        `</blockquote>`,
    );
  }
  parts.push(`<p><a href="${post.url}">在 X 上查看</a></p>`);
  return parts.join("");
}

function repostLabel(post: Post): string {
  const by = post.reposted_by;
  if (!by) return "";
  return by.screen_name === post.author.screen_name
    ? `🔁 @${by.screen_name} 转发了自己的帖子`
    : `🔁 @${by.screen_name} 转发自 @${post.author.screen_name}`;
}

function itemTitle(post: Post): string {
  const firstLine = post.text.split("\n").find((l) => l.trim()) ?? "(媒体帖)";
  const short = firstLine.length > 80 ? `${firstLine.slice(0, 79)}…` : firstLine;
  return post.reposted_by ? `🔁 ${short}` : short;
}

function main(): void {
  if (!existsSync(`${DIST}/index.html`)) {
    throw new Error(`${DIST}/index.html missing, run vite build first`);
  }
  const site = ensureSlash(process.env.SITE_URL ?? "http://localhost:4173/");

  const latestPath = `${DATA_DIR}/latest.json`;
  const latest: LatestFile = existsSync(latestPath)
    ? readJson<LatestFile>(latestPath)
    : { generated_at: new Date().toISOString(), posts: [] };
  const indexPath = `${DATA_DIR}/index.json`;
  const index: IndexFile | null = existsSync(indexPath) ? readJson<IndexFile>(indexPath) : null;
  const handles = (index?.creators ?? []).map((c) => `@${c.screen_name}`).join(", ");

  const feed = new Feed({
    title: "双语 X 阅读器",
    description: handles ? `Posts by ${handles}` : "Posts from X",
    id: site,
    link: site,
    language: "en",
    favicon: `${site}icons/favicon.svg`,
    updated: new Date(latest.generated_at),
    generator: "x-news-letter",
    copyright: "Posts belong to their original authors.",
    feedLinks: { rss: `${site}feed.xml`, atom: `${site}atom.xml`, json: `${site}feed.json` },
  });

  for (const post of latest.posts.slice(0, FEED_ITEMS)) {
    feed.addItem({
      title: itemTitle(post),
      id: post.url,
      link: post.url,
      date: new Date(post.sort_at),
      author: [
        {
          name: `${post.author.name} (@${post.author.screen_name})`,
          link: `https://x.com/${post.author.screen_name}`,
        },
      ],
      content: itemHtml(post),
    });
  }

  writeFileSync(`${DIST}/feed.xml`, feed.rss2());
  writeFileSync(`${DIST}/atom.xml`, feed.atom1());
  writeFileSync(`${DIST}/feed.json`, feed.json1());
  copyFileSync(`${DIST}/index.html`, `${DIST}/404.html`);
  console.log(
    `postbuild: ${Math.min(latest.posts.length, FEED_ITEMS)} feed items, 404.html copied`,
  );
}

main();
