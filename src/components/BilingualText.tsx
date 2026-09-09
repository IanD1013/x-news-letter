import { useState } from "react";
import { usePrefs } from "../lib/prefsContext.ts";
import { translationQueue, type TranslationState } from "../translate/queue.ts";
import { useTranslationState } from "../translate/useTranslation.ts";
import { Linkified } from "./Linkified.tsx";

const COLLAPSE_AFTER_CHARS = 600;

type Props = {
  text: string;
  lang: string;
  translationKey: string;
  /** Smaller type, no collapsing. Used inside quote cards. */
  compact?: boolean;
};

export function BilingualText({ text, lang, translationKey, compact = false }: Props) {
  const { prefs, openSettings } = usePrefs();
  const state = useTranslationState(translationKey);
  const [expanded, setExpanded] = useState(false);

  if (text.trim() === "") return null;

  const showZh = prefs.langMode !== "en";
  const showEn = prefs.langMode !== "zh";
  const hasKey = prefs.geminiApiKey !== "";
  const collapsible = !compact && text.length > COLLAPSE_AFTER_CHARS;
  const collapsed = collapsible && !expanded;

  const zhClass = compact ? "text-[15px] leading-relaxed" : "text-[17px] leading-[1.75]";
  const enOnlyClass = compact ? "text-[15px] leading-relaxed" : "text-[16px] leading-[1.7]";
  const enSecondaryClass = `${
    compact ? "mt-2 text-[13.5px]" : "mt-3 text-[15px]"
  } border-l-2 border-zinc-200 pl-3 leading-relaxed text-zinc-500 dark:border-zinc-700 dark:text-zinc-400`;

  return (
    <div>
      <div className="relative">
        <div className={collapsed ? "max-h-80 overflow-hidden" : undefined}>
          {showZh && (
            <ZhBlock
              state={state}
              hasKey={hasKey}
              lines={Math.min(4, Math.max(1, Math.ceil(text.length / 70)))}
              className={zhClass}
              onOpenSettings={openSettings}
              onRetry={() => translationQueue.retry([translationKey])}
            />
          )}
          {showEn && (
            <Linkified
              text={text}
              lang={lang}
              className={showZh ? enSecondaryClass : enOnlyClass}
            />
          )}
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
          {expanded ? "收起" : "展开全文"}
        </button>
      )}
    </div>
  );
}

type ZhBlockProps = {
  state: TranslationState;
  hasKey: boolean;
  lines: number;
  className: string;
  onOpenSettings: () => void;
  onRetry: () => void;
};

function ZhBlock({ state, hasKey, lines, className, onOpenSettings, onRetry }: ZhBlockProps) {
  switch (state.status) {
    case "done":
      return <Linkified text={state.zh} lang="zh-Hans" className={className} />;
    case "error":
      return (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          title={state.detail}
        >
          <span>{state.message}</span>
          {!state.rateLimited && (
            <button
              type="button"
              onClick={onRetry}
              className="font-medium text-sky-600 hover:underline dark:text-sky-400"
            >
              重试
            </button>
          )}
        </div>
      );
    case "idle":
      if (!hasKey) {
        return (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-left text-sm text-zinc-500 hover:border-sky-400 hover:text-sky-600 dark:border-zinc-700 dark:hover:border-sky-500 dark:hover:text-sky-400"
          >
            设置 Gemini API key 以启用中文翻译 →
          </button>
        );
      }
      return <Skeleton lines={lines} />;
    case "queued":
    case "loading":
      return <Skeleton lines={lines} />;
  }
}

function Skeleton({ lines }: { lines: number }) {
  const widths = ["w-11/12", "w-4/5", "w-full", "w-2/3"];
  return (
    <div className="animate-pulse space-y-2.5 py-1" role="status" aria-label="翻译中">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-4 rounded bg-zinc-200 dark:bg-zinc-800 ${widths[i % widths.length]}`}
        />
      ))}
    </div>
  );
}
