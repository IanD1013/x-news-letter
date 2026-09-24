import { useState } from "react";
import { Linkified } from "./Linkified.tsx";

const COLLAPSE_AFTER_CHARS = 600;

type Props = {
  text: string;
  lang: string;
  /** Smaller type, no collapsing. Used inside quote cards. */
  compact?: boolean;
};

/** The text of a post, collapsed behind a "Show more" button when it is long. */
export function PostText({ text, lang, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (text.trim() === "") return null;

  const collapsible = !compact && text.length > COLLAPSE_AFTER_CHARS;
  const collapsed = collapsible && !expanded;
  const textClass = compact ? "text-[15px] leading-relaxed" : "text-[16px] leading-[1.7]";

  return (
    <div>
      <div className="relative">
        <div className={collapsed ? "max-h-80 overflow-hidden" : undefined}>
          <Linkified text={text} lang={lang} className={textClass} />
        </div>
        {collapsed && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent dark:from-zinc-900" />
        )}
      </div>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
