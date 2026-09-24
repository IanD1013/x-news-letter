import type { Theme } from "../lib/prefs.ts";
import { usePrefs } from "../lib/prefsContext.ts";
import { Icon } from "./Icon.tsx";

const THEME_ORDER: Theme[] = ["system", "light", "dark"];
const THEME_LABEL: Record<Theme, string> = { system: "system", light: "light", dark: "dark" };

export const ICON_BUTTON =
  "flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

type Props = { onOpenMenu: () => void };

export function Header({ onOpenMenu }: Props) {
  const { prefs, update, openSettings } = usePrefs();
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex max-w-[60rem] items-center gap-1 px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className={`${ICON_BUTTON} -ml-1.5 lg:hidden`}
          aria-label="Subscriptions"
          title="Subscriptions"
        >
          <Icon.Menu className="h-5 w-5" />
        </button>
        <h1 className="mr-auto truncate text-[15px] font-semibold tracking-tight sm:text-base">
          X Reader
        </h1>
        <ThemeToggle value={prefs.theme} onChange={(theme) => update({ theme })} />
        <button
          type="button"
          onClick={openSettings}
          className={ICON_BUTTON}
          aria-label="Settings"
          title="Settings"
        >
          <Icon.Settings className="h-[18px] w-[18px]" />
        </button>
        <a
          href={`${import.meta.env.BASE_URL}feed.xml`}
          className={`${ICON_BUTTON} hidden sm:flex`}
          aria-label="RSS feed"
          title="RSS feed"
        >
          <Icon.Rss className="h-[18px] w-[18px]" />
        </a>
      </div>
    </header>
  );
}

function ThemeToggle({ value, onChange }: { value: Theme; onChange: (v: Theme) => void }) {
  const next = THEME_ORDER[(THEME_ORDER.indexOf(value) + 1) % THEME_ORDER.length] ?? "system";
  const label = `Theme: ${THEME_LABEL[value]}. Switch to ${THEME_LABEL[next]}`;
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
