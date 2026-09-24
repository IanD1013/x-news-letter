import type { QuotePost } from "../shared/types.ts";
import { absoluteTime, relativeTime } from "../lib/time.ts";
import { PostText } from "./PostText.tsx";
import { MediaGrid } from "./MediaGrid.tsx";

export function QuoteCard({ quote }: { quote: QuotePost }) {
  return (
    <div className="mt-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <img
          src={quote.author.avatar_url}
          alt=""
          loading="lazy"
          className="h-5 w-5 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700"
        />
        <span className="truncate font-medium">{quote.author.name}</span>
        <span className="truncate text-zinc-500">@{quote.author.screen_name}</span>
        <a
          href={quote.url}
          target="_blank"
          rel="noopener noreferrer"
          title={absoluteTime(quote.created_at)}
          className="ml-auto shrink-0 text-zinc-500 hover:underline"
        >
          {relativeTime(quote.created_at)}
        </a>
      </div>
      <div className="mt-1.5">
        <PostText text={quote.text} lang="en" compact />
      </div>
      <MediaGrid media={quote.media} compact />
    </div>
  );
}
