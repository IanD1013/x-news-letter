import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Feed } from "./components/Feed.tsx";
import { FilterBar } from "./components/FilterBar.tsx";
import { Header } from "./components/Header.tsx";
import { SettingsDialog } from "./components/SettingsDialog.tsx";
import { fetchIndex, fetchLatest, fetchMonth } from "./lib/data.ts";
import {
  applyTheme,
  loadLastSeenAt,
  loadPrefs,
  saveLastSeenAt,
  savePrefs,
  type Prefs,
} from "./lib/prefs.ts";
import { PrefsContext, type PrefsContextValue } from "./lib/prefsContext.ts";
import { idToMonth } from "./lib/snowflake.ts";
import { groupThreads } from "./lib/threads.ts";
import { comparePosts, postKey } from "./shared/posts.ts";
import type { IndexFile, Post } from "./shared/types.ts";
import { postTranslationKey, quoteTranslationKey, translationQueue } from "./translate/queue.ts";
import { useTranslationVersion } from "./translate/useTranslation.ts";

type LoadStatus = { phase: "loading" } | { phase: "ready" } | { phase: "error"; message: string };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function targetIdFromHash(): string | null {
  const match = /^#p-(\d+)$/.exec(window.location.hash);
  return match?.[1] ?? null;
}

function matches(post: Post, needle: string): boolean {
  const zh = translationQueue.get(postTranslationKey(post.id));
  const quoteZh = post.quote ? translationQueue.get(quoteTranslationKey(post.quote.id)) : null;
  const haystack = [
    post.text,
    post.author.name,
    post.author.screen_name,
    post.quote?.text ?? "",
    zh.status === "done" ? zh.zh : "",
    quoteZh?.status === "done" ? quoteZh.zh : "",
  ]
    .join("\n")
    .toLowerCase();
  return haystack.includes(needle);
}

export default function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const update = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const prefsContext = useMemo<PrefsContextValue>(
    () => ({ prefs, update, openSettings }),
    [prefs, update, openSettings],
  );

  useEffect(() => savePrefs(prefs), [prefs]);
  useEffect(() => applyTheme(prefs.theme), [prefs.theme]);
  useEffect(() => {
    translationQueue.configure({ apiKey: prefs.geminiApiKey, model: prefs.geminiModel });
  }, [prefs.geminiApiKey, prefs.geminiModel]);

  const [index, setIndex] = useState<IndexFile | null>(null);
  const [posts, setPosts] = useState<ReadonlyMap<string, Post>>(() => new Map());
  const [status, setStatus] = useState<LoadStatus>({ phase: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedMonths, setLoadedMonths] = useState<ReadonlySet<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [selectedCreators, setSelectedCreators] = useState<ReadonlySet<string>>(() => new Set());

  const lastSeenAt = useRef<string | null>(loadLastSeenAt());
  const knownKeys = useRef(new Set<string>());
  const loadedRef = useRef(new Set<string>());
  const loadingRef = useRef(false);
  const [targetId, setTargetId] = useState<string | null>(targetIdFromHash);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const scrolledToTarget = useRef(false);

  // A notification tapped while the app is already open only changes the hash.
  useEffect(() => {
    const onHashChange = () => {
      scrolledToTarget.current = false;
      setTargetId(targetIdFromHash());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  /** Adds posts not seen before. Returns how many were new. */
  const addPosts = useCallback((list: Post[]): number => {
    const fresh = list.filter((p) => !knownKeys.current.has(postKey(p)));
    if (fresh.length === 0) return 0;
    for (const p of fresh) knownKeys.current.add(postKey(p));
    setPosts((prev) => {
      const next = new Map(prev);
      for (const p of fresh) next.set(postKey(p), p);
      return next;
    });
    return fresh.length;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [idx, latest] = await Promise.all([fetchIndex(), fetchLatest()]);
        if (cancelled) return;
        setIndex(idx);
        addPosts(latest.posts);
        setStatus({ phase: "ready" });
        const newest = latest.posts[0];
        if (newest) saveLastSeenAt(newest.sort_at);
      } catch (err) {
        if (!cancelled) setStatus({ phase: "error", message: errorMessage(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addPosts]);

  const loadMonth = useCallback(
    async (month: string): Promise<number> => {
      if (loadedRef.current.has(month)) return 0;
      const file = await fetchMonth(month);
      loadedRef.current.add(month);
      setLoadedMonths(new Set(loadedRef.current));
      return addPosts(file.posts);
    },
    [addPosts],
  );

  /** Loads older months in order. "one" stops as soon as the feed actually grows, "all" drains. */
  const loadMore = useCallback(
    async (mode: "one" | "all"): Promise<void> => {
      if (loadingRef.current || !index) return;
      loadingRef.current = true;
      setLoadingMore(true);
      setLoadError(null);
      try {
        for (const { month } of index.months) {
          if (loadedRef.current.has(month)) continue;
          const added = await loadMonth(month);
          if (mode === "one" && added > 0) break;
        }
      } catch (err) {
        setLoadError(errorMessage(err));
      } finally {
        loadingRef.current = false;
        setLoadingMore(false);
      }
    },
    [index, loadMonth],
  );
  const loadOne = useCallback(() => void loadMore("one"), [loadMore]);

  const hasMore = index !== null && index.months.some((m) => !loadedMonths.has(m.month));
  const searching = query.trim() !== "";

  // Search must cover the whole archive, so pull in every month while a query is active.
  useEffect(() => {
    if (searching && hasMore) void loadMore("all");
  }, [searching, hasMore, loadMore]);

  // Deep link #p-<id>: load the month the id points at, then keep walking back until found.
  useEffect(() => {
    if (!targetId || scrolledToTarget.current || status.phase !== "ready" || !index) return;
    const el = document.getElementById(`p-${targetId}`);
    if (el) {
      scrolledToTarget.current = true;
      setHighlightId(targetId);
      el.scrollIntoView({ block: "start" });
      return;
    }
    const guess = idToMonth(targetId);
    if (index.months.some((m) => m.month === guess) && !loadedRef.current.has(guess)) {
      void loadMonth(guess).catch((err: unknown) => setLoadError(errorMessage(err)));
    } else if (hasMore) {
      void loadMore("one");
    }
  }, [targetId, status, index, posts, hasMore, loadMonth, loadMore]);

  const translationVersion = useTranslationVersion();
  const sorted = useMemo(() => [...posts.values()].sort(comparePosts), [posts]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sorted.filter(
      (p) =>
        (selectedCreators.size === 0 || selectedCreators.has(p.creator)) &&
        (needle === "" || matches(p, needle)),
    );
    // translationVersion re-runs the search when new translations arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, query, selectedCreators, translationVersion]);
  const items = useMemo(() => groupThreads(filtered), [filtered]);

  const toggleCreator = useCallback((name: string) => {
    setSelectedCreators((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  return (
    <PrefsContext.Provider value={prefsContext}>
      <div className="min-h-dvh">
        <Header />
        <main className="mx-auto max-w-2xl px-3 pb-16 pt-3 sm:px-4">
          {index && (
            <FilterBar
              creators={index.creators}
              selected={selectedCreators}
              onToggleCreator={toggleCreator}
              query={query}
              onQuery={setQuery}
              total={filtered.length}
              newestAt={sorted[0]?.sort_at ?? null}
              loadingAll={searching && hasMore}
            />
          )}
          {status.phase === "loading" && <LoadingCards />}
          {status.phase === "error" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              加载失败：{status.message}
            </div>
          )}
          {status.phase === "ready" && (
            <Feed
              items={items}
              lastSeenAt={lastSeenAt.current}
              highlightId={highlightId}
              hasMore={hasMore}
              loadingMore={loadingMore}
              loadError={loadError}
              onLoadMore={loadOne}
            />
          )}
        </main>
        <SettingsDialog open={settingsOpen} onClose={closeSettings} />
      </div>
    </PrefsContext.Provider>
  );
}

function LoadingCards() {
  return (
    <div className="space-y-3" role="status" aria-label="加载中">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-3.5 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="h-4 w-11/12 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
