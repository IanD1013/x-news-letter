export type Theme = "system" | "light" | "dark";

export type Prefs = {
  theme: Theme;
  /** Fine-grained GitHub token with Contents read/write on this repository. Empty when not set. */
  githubToken: string;
};

const PREFS_KEY = "xnl.prefs";
const LAST_SEEN_KEY = "xnl.lastSeenAt";

const DEFAULTS: Prefs = { theme: "system", githubToken: "" };

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, quota). Preferences simply do not persist.
  }
}

const THEMES: readonly Theme[] = ["system", "light", "dark"];

export function loadPrefs(): Prefs {
  const raw = read(PREFS_KEY);
  if (!raw) return DEFAULTS;
  try {
    const p = JSON.parse(raw) as Partial<Record<keyof Prefs, unknown>>;
    return {
      theme: THEMES.find((t) => t === p.theme) ?? DEFAULTS.theme,
      githubToken: typeof p.githubToken === "string" ? p.githubToken.trim() : "",
    };
  } catch {
    return DEFAULTS;
  }
}

export function savePrefs(prefs: Prefs): void {
  write(PREFS_KEY, JSON.stringify(prefs));
}

export function loadLastSeenAt(): string | null {
  return read(LAST_SEEN_KEY);
}

export function saveLastSeenAt(iso: string): void {
  write(LAST_SEEN_KEY, iso);
}

/** Applies the theme to <html> and keeps following the OS while theme is "system". Returns a cleanup. */
export function applyTheme(theme: Theme): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = (): void => {
    const dark = theme === "dark" || (theme === "system" && media.matches);
    document.documentElement.classList.toggle("dark", dark);
  };
  apply();
  if (theme !== "system") return () => {};
  media.addEventListener("change", apply);
  return () => media.removeEventListener("change", apply);
}
