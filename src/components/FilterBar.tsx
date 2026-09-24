import type { Subscription } from "../lib/useSubscriptions.ts";
import { relativeTime } from "../lib/time.ts";
import { Avatar } from "./Avatar.tsx";
import { Icon } from "./Icon.tsx";

type Props = {
  /** The account the feed is narrowed to, or null for all posts. */
  selected: Subscription | null;
  onClearSelection: () => void;
  query: string;
  onQuery: (q: string) => void;
  total: number;
  newestAt: string | null;
  loadingAll: boolean;
};

export function FilterBar({
  selected,
  onClearSelection,
  query,
  onQuery,
  total,
  newestAt,
  loadingAll,
}: Props) {
  return (
    <div className="mb-3 space-y-2">
      {selected && (
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
          <Avatar subscription={selected} className="h-9 w-9" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate font-semibold">{selected.name}</div>
            <a
              href={`https://x.com/${selected.screen_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 hover:underline"
            >
              @{selected.screen_name}
            </a>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            All posts
          </button>
        </div>
      )}
      <div className="relative">
        <Icon.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search posts…"
          aria-label="Search"
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {query !== "" && (
          <button
            type="button"
            onClick={() => onQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          >
            <Icon.Close className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="px-1 text-xs text-zinc-500">
        {total} {total === 1 ? "post" : "posts"}
        {newestAt && ` · newest ${relativeTime(newestAt)}`}
        {loadingAll && " · loading the whole archive for search…"}
      </p>
    </div>
  );
}
