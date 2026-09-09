import type { LangMode, Theme } from "../lib/prefs.ts";
import { usePrefs } from "../lib/prefsContext.ts";
import { Icon } from "./Icon.tsx";

const LANG_OPTIONS: { value: LangMode; label: string; title: string }[] = [
  { value: "both", label: "双语", title: "中文译文 + 英文原文" },
  { value: "zh", label: "中", title: "只看中文译文" },
  { value: "en", label: "EN", title: "只看英文原文" },
];

const THEME_ORDER: Theme[] = ["system", "light", "dark"];
const THEME_LABEL: Record<Theme, string> = { system: "跟随系统", light: "浅色", dark: "深色" };

const ICON_BUTTON =
  "flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

export function Header() {
  const { prefs, update, openSettings } = usePrefs();
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2 sm:px-4">
        <h1 className="mr-auto truncate text-[15px] font-semibold tracking-tight sm:text-base">
          双语 X 阅读器
        </h1>
        <LangModeToggle value={prefs.langMode} onChange={(langMode) => update({ langMode })} />
        <ThemeToggle value={prefs.theme} onChange={(theme) => update({ theme })} />
        <button
          type="button"
          onClick={openSettings}
          className={ICON_BUTTON}
          aria-label="设置"
          title="设置"
        >
          <Icon.Settings className="h-[18px] w-[18px]" />
        </button>
        <a
          href={`${import.meta.env.BASE_URL}feed.xml`}
          className={`${ICON_BUTTON} hidden sm:flex`}
          aria-label="RSS 订阅"
          title="RSS 订阅"
        >
          <Icon.Rss className="h-[18px] w-[18px]" />
        </a>
      </div>
    </header>
  );
}

function LangModeToggle({ value, onChange }: { value: LangMode; onChange: (v: LangMode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="显示语言"
      className="flex rounded-lg bg-zinc-200/70 p-0.5 dark:bg-zinc-800"
    >
      {LANG_OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`min-w-11 whitespace-nowrap rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
              active
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ThemeToggle({ value, onChange }: { value: Theme; onChange: (v: Theme) => void }) {
  const next = THEME_ORDER[(THEME_ORDER.indexOf(value) + 1) % THEME_ORDER.length] ?? "system";
  const label = `主题：${THEME_LABEL[value]}，点击切换为${THEME_LABEL[next]}`;
  const ThemeIcon = value === "light" ? Icon.Sun : value === "dark" ? Icon.Moon : Icon.Monitor;
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className={ICON_BUTTON}
      aria-label={label}
      title={label}
    >
      <ThemeIcon className="h-[18px] w-[18px]" />
    </button>
  );
}
