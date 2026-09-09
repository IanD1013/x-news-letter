import type { Post } from "../shared/types.ts";
import { usePrefs } from "../lib/prefsContext.ts";
import { useInView } from "../lib/useInView.ts";
import { translationItemsFor, useAutoTranslate } from "../translate/useTranslation.ts";
import { CARD_CLASS, HIGHLIGHT_CLASS, PostBody, PostHeader, RepostLine } from "./PostParts.tsx";

type Props = { post: Post; highlighted: boolean };

export function PostCard({ post, highlighted }: Props) {
  const { prefs } = usePrefs();
  const { ref, inView } = useInView<HTMLElement>();
  useAutoTranslate(
    inView && prefs.langMode !== "en" && prefs.geminiApiKey !== "",
    translationItemsFor([post]),
  );
  return (
    <article
      ref={ref}
      id={`p-${post.id}`}
      className={highlighted ? `${CARD_CLASS} ${HIGHLIGHT_CLASS}` : CARD_CLASS}
    >
      {post.reposted_by && <RepostLine by={post.reposted_by} author={post.author} />}
      <PostHeader
        author={post.author}
        time={post.created_at}
        url={post.url}
        badges={post.is_note_tweet ? ["长文"] : []}
      />
      <div className="mt-3">
        <PostBody post={post} />
      </div>
    </article>
  );
}
