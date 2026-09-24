import { Fragment, useEffect, useRef } from "react";
import type { FeedItem } from "../lib/threads.ts";
import { PostCard } from "./PostCard.tsx";
import { ThreadCard } from "./ThreadCard.tsx";

type Props = {
  items: FeedItem[];
  /** sort_at of the newest post at the previous visit, or null on the first visit. */
  lastSeenAt: string | null;
  /** Post id to highlight, from a #p-<id> deep link. */
  highlightId: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadError: string | null;
  /** Shown when everything is loaded and nothing is left to display. */
  emptyMessage: string;
  onLoadMore: () => void;
};

export function Feed({
  items,
  lastSeenAt,
  highlightId,
  hasMore,
  loadingMore,
  loadError,
  emptyMessage,
  onLoadMore,
}: Props) {
  const sentinel = useRef<HTMLDivElement>(null);

  // Re-observe after every load and every change in length: when a filter hides everything that
  // was loaded, or content is inserted above the sentinel (deep link into an old month), the
  // sentinel never leaves the viewport, so it must fire again by itself.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore, items.length]);

  // Index of the first item that was already there last time. Everything above it is new.
  const firstOld = lastSeenAt ? items.findIndex((i) => i.sort_at <= lastSeenAt) : -1;
  const newCount = firstOld > 0 ? firstOld : 0;

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <Fragment key={`${item.kind}:${item.id}`}>
          {newCount > 0 && i === firstOld && <NewDivider count={newCount} />}
          {item.kind === "post" ? (
            <PostCard post={item.post} highlighted={item.post.id === highlightId} />
          ) : (
            <ThreadCard posts={item.posts} highlightId={highlightId} />
          )}
        </Fragment>
      ))}
      <div ref={sentinel} className="py-8 text-center text-sm text-zinc-500">
        {loadError ? (
          <button
            type="button"
            onClick={onLoadMore}
            className="text-sky-600 hover:underline dark:text-sky-400"
          >
            {loadError}. Tap to retry
          </button>
        ) : loadingMore ? (
          "Loading…"
        ) : hasMore ? (
          ""
        ) : items.length > 0 ? (
          "You have reached the oldest post"
        ) : (
          <p className="mx-auto max-w-sm text-balance leading-relaxed">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

function NewDivider({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3 py-1 text-xs font-medium text-sky-600 dark:text-sky-400">
      <span className="h-px flex-1 bg-sky-200 dark:bg-sky-900" />
      <span>↑ {count} new since your last visit</span>
      <span className="h-px flex-1 bg-sky-200 dark:bg-sky-900" />
    </div>
  );
}
