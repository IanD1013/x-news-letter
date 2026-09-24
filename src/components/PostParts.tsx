import type { ReactNode } from "react";
import type { Author, Post } from "../shared/types.ts";
import { absoluteTime, compactNumber, relativeTime } from "../lib/time.ts";
import { Icon } from "./Icon.tsx";
import { MediaGrid } from "./MediaGrid.tsx";
import { PostText } from "./PostText.tsx";
import { QuoteCard } from "./QuoteCard.tsx";

export const CARD_CLASS =
  "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

/** Ring drawn around the post a deep link points at. */
export const HIGHLIGHT_CLASS =
  "ring-2 ring-sky-400/70 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-950";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  );
}

export function RepostLine({ by, author }: { by: Author; author: Author }) {
  const self = by.screen_name === author.screen_name;
  return (
    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
      <Icon.Repost className="h-3.5 w-3.5" />
      <span>{self ? `${by.name} reposted their own post` : `${by.name} reposted`}</span>
    </div>
  );
}

type HeaderProps = { author: Author; time: string; url: string; badges: string[] };

export function PostHeader({ author, time, url, badges }: HeaderProps) {
  return (
    <header className="flex items-center gap-3">
      <a
        href={`https://x.com/${author.screen_name}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
      >
        <img
          src={author.avatar_url}
          alt=""
          loading="lazy"
          className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700"
        />
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-x-1.5 leading-tight">
          <span className="truncate font-semibold">{author.name}</span>
          <span className="truncate text-sm text-zinc-500">@{author.screen_name}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-500">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={absoluteTime(time)}
            className="hover:underline"
          >
            {relativeTime(time)}
          </a>
          {badges.map((b) => (
            <Badge key={b}>{b}</Badge>
          ))}
        </div>
      </div>
    </header>
  );
}

/** Text, media, quote and metrics of one post. Shared by standalone cards and thread parts. */
export function PostBody({ post }: { post: Post }) {
  return (
    <>
      <PostText text={post.text} lang={post.lang} />
      <MediaGrid media={post.media} />
      {post.quote && <QuoteCard quote={post.quote} />}
      <Metrics post={post} />
    </>
  );
}

function Metrics({ post }: { post: Post }) {
  const m = post.metrics;
  const item = "flex items-center gap-1";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
      <span className={item} title="Replies">
        <Icon.Reply className="h-3.5 w-3.5" />
        {compactNumber(m.replies)}
      </span>
      <span className={item} title="Reposts">
        <Icon.Repost className="h-3.5 w-3.5" />
        {compactNumber(m.reposts + m.quotes)}
      </span>
      <span className={item} title="Likes">
        <Icon.Heart className="h-3.5 w-3.5" />
        {compactNumber(m.likes)}
      </span>
      {m.views !== null && (
        <span className={item} title="Views">
          <Icon.Eye className="h-3.5 w-3.5" />
          {compactNumber(m.views)}
        </span>
      )}
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${item} ml-auto hover:text-zinc-700 dark:hover:text-zinc-300`}
        title="Open on X"
      >
        <Icon.External className="h-3.5 w-3.5" />
        <span>X</span>
      </a>
    </div>
  );
}
