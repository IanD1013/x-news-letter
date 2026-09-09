import type { Post } from "../shared/types.ts";
import { usePrefs } from "../lib/prefsContext.ts";
import { absoluteTime, relativeTime } from "../lib/time.ts";
import { useInView } from "../lib/useInView.ts";
import { translationItemsFor, useAutoTranslate } from "../translate/useTranslation.ts";
import { CARD_CLASS, HIGHLIGHT_CLASS, PostBody, PostHeader } from "./PostParts.tsx";

type Props = { posts: Post[]; highlightId: string | null };

/** A self-thread. `posts` is oldest first. */
export function ThreadCard({ posts, highlightId }: Props) {
  const { prefs } = usePrefs();
  const { ref, inView } = useInView<HTMLElement>();
  useAutoTranslate(
    inView && prefs.langMode !== "en" && prefs.geminiApiKey !== "",
    translationItemsFor(posts),
  );
  const root = posts[0];
  if (!root) return null;
  const badges = [`线程 · ${posts.length} 段`];
  if (posts.some((p) => p.is_note_tweet)) badges.push("长文");
  return (
    <article ref={ref} className={CARD_CLASS}>
      <PostHeader author={root.author} time={root.created_at} url={root.url} badges={badges} />
      <ol className="mt-3 space-y-5">
        {posts.map((p, i) => (
          <li
            key={p.id}
            id={`p-${p.id}`}
            className={`rounded-md border-l-2 border-zinc-200 pl-4 dark:border-zinc-800 ${
              p.id === highlightId ? HIGHLIGHT_CLASS : ""
            }`}
          >
            <div className="mb-1.5 flex items-center gap-2 text-xs text-zinc-500">
              <span className="font-medium tabular-nums">
                {i + 1}/{posts.length}
              </span>
              {i > 0 && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={absoluteTime(p.created_at)}
                  className="hover:underline"
                >
                  {relativeTime(p.created_at)}
                </a>
              )}
            </div>
            <PostBody post={p} />
          </li>
        ))}
      </ol>
    </article>
  );
}
