import Linkify from "linkify-react";
import type { Opts } from "linkifyjs";
import "linkify-plugin-mention";
import "linkify-plugin-hashtag";

const MAX_URL_LABEL = 64;

const options: Opts = {
  target: "_blank",
  rel: "noopener noreferrer",
  className: "text-sky-600 hover:underline dark:text-sky-400",
  formatHref: {
    mention: (href) => `https://x.com${href}`,
    hashtag: (href) => `https://x.com/hashtag/${href.slice(1)}`,
  },
  format: (value, type) =>
    type === "url" && value.length > MAX_URL_LABEL
      ? `${value.slice(0, MAX_URL_LABEL - 1)}…`
      : value,
};

type Props = { text: string; lang: string; className?: string };

/** Post text with URLs, @mentions and #hashtags linked. Rendered as React nodes, never as HTML. */
export function Linkified({ text, lang, className = "" }: Props) {
  return (
    <p lang={lang} className={`whitespace-pre-wrap break-words ${className}`}>
      <Linkify options={options}>{text}</Linkify>
    </p>
  );
}
