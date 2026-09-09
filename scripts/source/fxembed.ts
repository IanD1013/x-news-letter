import type { Author, Media, Post, QuotePost } from "../../src/shared/types.ts";
import type { PostSource } from "./types.ts";

type FxAuthor = {
  id: string;
  screen_name: string;
  name: string;
  avatar_url: string;
  protected?: boolean;
};

type FxFormat = { url: string; container: string; bitrate?: number };

type FxMedia = {
  id: string;
  type: "photo" | "video" | "gif";
  url: string;
  thumbnail_url?: string;
  width: number;
  height: number;
  duration?: number;
  formats?: FxFormat[];
};

type FxStatus = {
  id: string;
  url: string;
  text: string;
  /** Missing on stubs for deleted or protected statuses (seen on quoted posts). */
  author?: FxAuthor;
  created_timestamp: number;
  is_note_tweet?: boolean;
  lang?: string;
  replies: number;
  reposts: number;
  likes: number;
  quotes: number;
  views?: number | null;
  replying_to: { screen_name: string; status: string } | null;
  media?: { all?: FxMedia[] };
  quote?: FxStatus | null;
  reposted_by?: FxAuthor | null;
};

type FxPage = {
  code: number;
  message?: string;
  results?: FxStatus[];
  cursor?: { top?: string; bottom?: string };
};

const API = "https://api.fxtwitter.com/2/profile";
const USER_AGENT = "x-news-letter/1.0 (personal bilingual reader; GitHub Actions)";

export const fxembed: PostSource = {
  name: "fxembed",
  async fetchPage(creator, cursor) {
    const url = new URL(`${API}/${encodeURIComponent(creator)}/statuses`);
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
    });
    if (!res.ok) throw new Error(`FxEmbed responded ${res.status} for @${creator}`);
    const page = (await res.json()) as FxPage;
    if (page.code !== 200 || !page.results) {
      throw new Error(`FxEmbed code ${page.code} for @${creator}: ${page.message ?? "no results"}`);
    }
    const now = new Date().toISOString();
    const items = page.results
      .filter((s): s is FxStatus & { author: FxAuthor } => keep(s, creator))
      .map((s) => normalize(s, creator, now));
    return { items, nextCursor: page.cursor?.bottom ?? null };
  },
};

function sameHandle(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Keep originals, the creator's own thread replies, and reposts. Drop replies to other people. */
function keep(s: FxStatus, creator: string): boolean {
  if (!s.author || s.author.protected) return false;
  if (s.reposted_by) return true;
  if (s.replying_to && !sameHandle(s.replying_to.screen_name, creator)) return false;
  return true;
}

function author(a: FxAuthor): Author {
  return { screen_name: a.screen_name, name: a.name, avatar_url: a.avatar_url };
}

function bestMp4(m: FxMedia): string {
  const mp4s = (m.formats ?? []).filter((f) => f.container === "mp4");
  if (mp4s.length === 0) return m.url;
  return mp4s.reduce((best, f) => ((f.bitrate ?? 0) > (best.bitrate ?? 0) ? f : best)).url;
}

function media(s: FxStatus): Media[] {
  return (s.media?.all ?? []).map((m) => {
    const isPhoto = m.type === "photo";
    const item: Media = {
      id: m.id,
      type: m.type,
      url: isPhoto ? m.url : bestMp4(m),
      thumbnail_url: isPhoto ? null : (m.thumbnail_url ?? null),
      width: m.width,
      height: m.height,
    };
    if (m.type === "video" && m.duration !== undefined) item.duration = m.duration;
    return item;
  });
}

function isoTime(s: FxStatus): string {
  return new Date(s.created_timestamp * 1000).toISOString();
}

function statusUrl(s: FxStatus, a: FxAuthor): string {
  return `https://x.com/${a.screen_name}/status/${s.id}`;
}

/** Null when the quoted status is a stub (deleted, protected or otherwise unavailable). */
function quote(s: FxStatus | null | undefined): QuotePost | null {
  if (!s?.author || !s.id) return null;
  return {
    id: s.id,
    url: statusUrl(s, s.author),
    author: author(s.author),
    created_at: isoTime(s),
    text: s.text ?? "",
    media: media(s),
  };
}

function normalize(s: FxStatus & { author: FxAuthor }, creator: string, now: string): Post {
  // A creator reposting their own post is just the original post, not a repost.
  const repostedBy =
    s.reposted_by && !sameHandle(s.reposted_by.screen_name, s.author.screen_name)
      ? s.reposted_by
      : null;
  const replyToSelf =
    !repostedBy && s.replying_to && sameHandle(s.replying_to.screen_name, creator)
      ? s.replying_to.status
      : null;
  return {
    id: s.id,
    url: statusUrl(s, s.author),
    creator,
    author: author(s.author),
    reposted_by: repostedBy ? author(repostedBy) : null,
    created_at: isoTime(s),
    // Reposts are repositioned by the pipeline, which knows their place in the timeline.
    sort_at: isoTime(s),
    text: s.text ?? "",
    media: media(s),
    quote: quote(s.quote),
    reply_to_id: replyToSelf,
    thread_root_id: s.id,
    is_note_tweet: Boolean(s.is_note_tweet),
    lang: s.lang ?? "und",
    metrics: {
      replies: s.replies,
      reposts: s.reposts,
      likes: s.likes,
      quotes: s.quotes,
      views: s.views ?? null,
    },
    fetched_at: now,
  };
}
