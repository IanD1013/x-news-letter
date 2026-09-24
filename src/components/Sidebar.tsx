import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { REPO } from "../lib/github.ts";
import type { Subscription, Subscriptions } from "../lib/useSubscriptions.ts";
import { Avatar } from "./Avatar.tsx";
import { Icon } from "./Icon.tsx";

type Props = {
  subscriptions: Subscriptions;
  /** screen_name of the account the feed is narrowed to, or null for all posts. */
  selected: string | null;
  onSelect: (screenName: string | null) => void;
  onOpenSettings: () => void;
};

const ROW =
  "flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors";
const ROW_IDLE = "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/80";
const ROW_ACTIVE = "bg-zinc-200/80 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50";
const SMALL_BUTTON = "rounded-md px-2.5 py-1 text-xs font-medium";

/** The list of followed accounts, YouTube-guide style. Rendered in the desktop column and the mobile drawer. */
export function Sidebar({ subscriptions, selected, onSelect, onOpenSettings }: Props) {
  const { list, canManage, busy, error, add, remove, clearError } = subscriptions;
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <nav aria-label="Subscriptions" className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-current={selected === null ? "page" : undefined}
        className={`${ROW} ${selected === null ? ROW_ACTIVE : ROW_IDLE}`}
      >
        <Icon.Home className="h-5 w-5 shrink-0" />
        <span>All posts</span>
      </button>

      <h2 className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Subscriptions
      </h2>

      {list.length === 0 && (
        <p className="px-3 py-2 text-sm text-zinc-500">Not following anyone yet.</p>
      )}
      {list.map((s) =>
        confirming === s.screen_name ? (
          <ConfirmRow
            key={s.screen_name}
            subscription={s}
            busy={busy}
            onConfirm={() => void remove(s.screen_name).then(() => setConfirming(null))}
            onCancel={() => {
              setConfirming(null);
              clearError();
            }}
          />
        ) : (
          <SubscriptionRow
            key={s.screen_name}
            subscription={s}
            active={selected !== null && selected.toLowerCase() === s.screen_name.toLowerCase()}
            onSelect={() => onSelect(s.screen_name)}
            onRemove={canManage ? () => setConfirming(s.screen_name) : null}
          />
        ),
      )}

      <div className="mt-2">
        {canManage ? (
          <AddForm busy={busy} onAdd={add} onDismiss={clearError} />
        ) : (
          <ConnectHint onOpenSettings={onOpenSettings} />
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 px-3 text-xs leading-relaxed text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </nav>
  );
}

type RowProps = {
  subscription: Subscription;
  active: boolean;
  onSelect: () => void;
  /** Null hides the unfollow control. */
  onRemove: (() => void) | null;
};

function SubscriptionRow({ subscription: s, active, onSelect, onRemove }: RowProps) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className={`${ROW} ${active ? ROW_ACTIVE : ROW_IDLE} ${onRemove ? "pr-10" : ""}`}
      >
        <Avatar subscription={s} className="h-7 w-7" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate">{s.name}</span>
          <span
            className={`block truncate text-xs font-normal ${
              s.ready ? "text-zinc-500" : "text-sky-600 dark:text-sky-400"
            }`}
          >
            {s.ready ? `@${s.screen_name}` : "Fetching posts…"}
          </span>
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Unfollow @${s.screen_name}`}
          title="Unfollow"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-300/60 hover:text-zinc-800 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
        >
          <Icon.Close className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

type ConfirmProps = {
  subscription: Subscription;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmRow({ subscription: s, busy, onConfirm, onCancel }: ConfirmProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="leading-snug">
        Unfollow <span className="font-medium">@{s.screen_name}</span>? Their posts are removed on
        the next pipeline run.
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={`${SMALL_BUTTON} text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`${SMALL_BUTTON} flex items-center gap-1.5 bg-red-600 text-white hover:bg-red-700 disabled:opacity-60`}
        >
          {busy && <Icon.Spinner className="h-3.5 w-3.5 animate-spin" />}
          Unfollow
        </button>
      </div>
    </div>
  );
}

type AddFormProps = {
  busy: boolean;
  onAdd: (input: string) => Promise<boolean>;
  onDismiss: () => void;
};

function AddForm({ busy, onAdd, onDismiss }: AddFormProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    onDismiss();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || draft.trim() === "") return;
    if (await onAdd(draft)) {
      setDraft("");
      setOpen(false);
    } else {
      // The submit button is disabled while busy and drops focus; put it back on the handle.
      input.current?.focus();
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${ROW} ${ROW_IDLE}`}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-400 dark:border-zinc-500">
          <Icon.Plus className="h-4 w-4" />
        </span>
        <span>Follow an account</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
      className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <label htmlFor="follow-handle" className="sr-only">
        X handle
      </label>
      <input
        id="follow-handle"
        ref={input}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="@handle or profile URL"
        className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={close}
          disabled={busy}
          className={`${SMALL_BUTTON} text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || draft.trim() === ""}
          className={`${SMALL_BUTTON} flex items-center gap-1.5 bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60`}
        >
          {busy && <Icon.Spinner className="h-3.5 w-3.5 animate-spin" />}
          Follow
        </button>
      </div>
    </form>
  );
}

function ConnectHint({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-2.5 text-xs leading-relaxed text-zinc-500 dark:border-zinc-700">
      {REPO === "" ? (
        <>
          This build has no repository configured, so accounts can only be edited in creators.json.
        </>
      ) : (
        <>
          To follow or unfollow accounts from here,{" "}
          <button
            type="button"
            onClick={onOpenSettings}
            className="font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            add a GitHub token in Settings
          </button>
          .
        </>
      )}
    </div>
  );
}

type DrawerProps = { open: boolean; onClose: () => void; children: ReactNode };

/** Off-canvas home for the sidebar on small screens. */
export function SidebarDrawer({ open, onClose, children }: DrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      className="m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r border-zinc-200 bg-zinc-50 p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 lg:hidden"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-1 border-b border-zinc-200/70 px-3 py-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <Icon.Close className="h-5 w-5" />
          </button>
          <span className="text-[15px] font-semibold tracking-tight">X Reader</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </dialog>
  );
}
