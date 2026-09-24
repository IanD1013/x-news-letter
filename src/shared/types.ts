export const SCHEMA_VERSION = 1;

/** One entry of creators.json: an X account whose timeline the pipeline follows. */
export type CreatorConfig = { screen_name: string };

export type Author = {
  screen_name: string;
  name: string;
  avatar_url: string;
};

export type Media = {
  id: string;
  type: "photo" | "video" | "gif";
  /** Photo URL, or the best MP4 for video and gif. */
  url: string;
  /** Poster image for video and gif, null for photos. */
  thumbnail_url: string | null;
  width: number;
  height: number;
  /** Seconds, video only. */
  duration?: number;
};

export type QuotePost = {
  id: string;
  url: string;
  author: Author;
  created_at: string;
  text: string;
  media: Media[];
};

export type Post = {
  id: string;
  url: string;
  /** Followed account (screen_name from creators.json) whose timeline produced this post. */
  creator: string;
  /** Original author. Differs from creator on reposts. */
  author: Author;
  reposted_by: Author | null;
  /** ISO time of the original status. */
  created_at: string;
  /** created_at for originals, first-seen time for reposts. Feed order key. */
  sort_at: string;
  /** Full text, long posts included. */
  text: string;
  media: Media[];
  quote: QuotePost | null;
  /** Parent status id when this is part of the author's own thread. */
  reply_to_id: string | null;
  /** Equals id for standalone posts and thread roots. */
  thread_root_id: string;
  is_note_tweet: boolean;
  lang: string;
  metrics: {
    replies: number;
    reposts: number;
    likes: number;
    quotes: number;
    views: number | null;
  };
  fetched_at: string;
};

export type IndexFile = {
  schemaVersion: number;
  generated_at: string;
  creators: (Author & { url: string })[];
  /** "YYYY-MM" newest first. */
  months: { month: string; count: number }[];
  total: number;
  newest_id: string | null;
};

export type LatestFile = { generated_at: string; posts: Post[] };

export type MonthFile = { month: string; posts: Post[] };
