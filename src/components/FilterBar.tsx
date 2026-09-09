import type { IndexFile } from "../shared/types.ts";
import { relativeTime } from "../lib/time.ts";
import { Icon } from "./Icon.tsx";

type Props = {
  creators: IndexFile["creators"];
  selected: ReadonlySet<string>;
  onToggleCreator: (screenName: string) => void;
  query: string;
  onQuery: (q: string) => void;
  total: number;
  newestAt: string | null;
  loadingAll: boolean;
};

export function FilterBar({
  creators,
  selected,
  onToggleCreator,
  query,
  onQuery,
  total,
  newestAt,
  loadingAll,
}: Props) {
  return (
    <div className="mb-3 space-y-2">
      {creators.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {creators.map((c) => {
            const active = selected.has(c.screen_name);
            return (
              <button
                key={c.screen_name}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleCreator(c.screen_name)}
                className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${
                  active
                    ? "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                <img
                  src={c.avatar_url}
                  alt=""
                  className="h-6 w-6 rounded-full bg-zinc-200"
                  loading="lazy"
                />
                <span>@{c.screen_name}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="relative">
        <Icon.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="搜索原文与已翻译内容…"
          aria-label="搜索"
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {query !== "" && (
          <button
            type="button"
            onClick={() => onQuery("")}
            aria-label="清除搜索"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          >
            <Icon.Close className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="px-1 text-xs text-zinc-500">
        共 {total} 条{newestAt && ` · 最新 ${relativeTime(newestAt)}`}
        {loadingAll && " · 正在加载全部帖子以便搜索…"}
      </p>
    </div>
  );
}
