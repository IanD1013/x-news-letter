import { useEffect, useRef, useState, type FormEvent } from "react";
import { CREATORS_PATH, REPO } from "../lib/github.ts";
import { usePrefs } from "../lib/prefsContext.ts";

const INPUT =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
const BUTTON = "rounded-lg px-3.5 py-2 text-sm font-medium";
const SECONDARY = `${BUTTON} border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800`;
const PRIMARY = `${BUTTON} bg-sky-600 text-white hover:bg-sky-700`;
const LINK = "underline hover:text-sky-600 dark:hover:text-sky-400";

type Props = { open: boolean; onClose: () => void };

export function SettingsDialog({ open, onClose }: Props) {
  const { prefs, update } = usePrefs();
  const dialog = useRef<HTMLDialogElement>(null);
  const [token, setToken] = useState(prefs.githubToken);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      setToken(prefs.githubToken);
      setReveal(false);
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open, prefs.githubToken]);

  const save = (e: FormEvent) => {
    e.preventDefault();
    update({ githubToken: token.trim() });
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <form onSubmit={save} className="p-5">
        <h2 className="text-lg font-semibold">Settings</h2>

        <h3 className="mt-4 text-sm font-semibold">Manage subscriptions from this site</h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Following and unfollowing edits <code>{CREATORS_PATH}</code> in{" "}
          {REPO ? (
            <a
              href={`https://github.com/${REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              {REPO}
            </a>
          ) : (
            <span className="text-red-600 dark:text-red-400">
              an unknown repository (this build has no VITE_REPO)
            </span>
          )}
          . That needs a{" "}
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK}
          >
            fine-grained personal access token
          </a>{" "}
          limited to that repository with <strong>Contents: Read and write</strong>. The token is
          stored only in this browser and sent only to api.github.com.
        </p>

        <label htmlFor="github-token" className="mt-4 block text-sm font-medium">
          GitHub token
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="github-token"
            type={reveal ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="github_pat_…"
            className={INPUT}
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className={`${SECONDARY} shrink-0 whitespace-nowrap`}
          >
            {reveal ? "Hide" : "Show"}
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {prefs.githubToken !== "" && (
            <button
              type="button"
              onClick={() => setToken("")}
              className="text-sm text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
            >
              Forget token
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className={SECONDARY}>
              Cancel
            </button>
            <button type="submit" className={PRIMARY}>
              Save
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
