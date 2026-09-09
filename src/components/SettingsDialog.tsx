import { useEffect, useRef, useState, type FormEvent } from "react";
import { DEFAULT_GEMINI_MODEL } from "../lib/prefs.ts";
import { usePrefs } from "../lib/prefsContext.ts";
import { clearCache } from "../translate/cache.ts";
import { translationQueue } from "../translate/queue.ts";

const INPUT =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
const BUTTON = "rounded-lg px-3.5 py-2 text-sm font-medium";
const SECONDARY = `${BUTTON} border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800`;
const PRIMARY = `${BUTTON} bg-sky-600 text-white hover:bg-sky-700`;

type Props = { open: boolean; onClose: () => void };

export function SettingsDialog({ open, onClose }: Props) {
  const { prefs, update } = usePrefs();
  const dialog = useRef<HTMLDialogElement>(null);
  const [key, setKey] = useState(prefs.geminiApiKey);
  const [model, setModel] = useState(prefs.geminiModel);
  const [reveal, setReveal] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      setKey(prefs.geminiApiKey);
      setModel(prefs.geminiModel);
      setReveal(false);
      setCleared(false);
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open, prefs.geminiApiKey, prefs.geminiModel]);

  const save = (e: FormEvent) => {
    e.preventDefault();
    update({ geminiApiKey: key.trim(), geminiModel: model.trim() || DEFAULT_GEMINI_MODEL });
    onClose();
  };

  const clearTranslations = async () => {
    await clearCache();
    translationQueue.reset();
    setCleared(true);
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
        <h2 className="text-lg font-semibold">设置</h2>

        <label htmlFor="gemini-key" className="mt-4 block text-sm font-medium">
          Gemini API key
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="gemini-key"
            type={reveal ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="AIza…"
            className={INPUT}
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className={`${SECONDARY} shrink-0 whitespace-nowrap`}
          >
            {reveal ? "隐藏" : "显示"}
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          在{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-sky-600"
          >
            Google AI Studio
          </a>{" "}
          免费获取。key 只保存在此浏览器的本地存储中，翻译请求直接发往
          Google，不经过任何中间服务器。
        </p>

        <label htmlFor="gemini-model" className="mt-4 block text-sm font-medium">
          模型
        </label>
        <input
          id="gemini-model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={DEFAULT_GEMINI_MODEL}
          className={`${INPUT} mt-1`}
        />

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void clearTranslations()}
            className="text-sm text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
          >
            {cleared ? "已清空翻译缓存" : "清空翻译缓存"}
          </button>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className={SECONDARY}>
              取消
            </button>
            <button type="submit" className={PRIMARY}>
              保存
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
