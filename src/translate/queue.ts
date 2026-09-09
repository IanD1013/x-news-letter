import { getCachedMany, setCached } from "./cache.ts";
import { translateBatch } from "./gemini.ts";

export type TranslationState =
  | { status: "idle" }
  | { status: "queued" }
  | { status: "loading" }
  | { status: "done"; zh: string }
  | { status: "error"; message: string; detail: string; rateLimited: boolean };

export type TranslationItem = { key: string; text: string };
export type TranslatorConfig = { apiKey: string; model: string };

const MAX_ITEMS_PER_REQUEST = 8;
const MAX_CHARS_PER_REQUEST = 6000;
const GAP_MS = 1500;
const BACKOFF_START_MS = 4000;
const BACKOFF_MAX_MS = 120_000;
const IDLE: TranslationState = { status: "idle" };

type Failure = { message: string; detail: string; rateLimited: boolean; fatal: boolean };

function describe(err: unknown): Failure {
  const detail = err instanceof Error ? err.message : String(err);
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status: unknown }).status)
      : Number.NaN;
  const rateLimited = status === 429 || /\b429\b|RESOURCE_EXHAUSTED|quota|rate limit/i.test(detail);
  const fatal =
    !rateLimited &&
    (status === 400 ||
      status === 401 ||
      status === 403 ||
      status === 404 ||
      /API key|API_KEY_INVALID|PERMISSION_DENIED|NOT_FOUND|not found|INVALID_ARGUMENT/i.test(
        detail,
      ));
  const message = rateLimited
    ? "额度受限，稍后自动重试"
    : fatal
      ? "Gemini 拒绝了请求，请检查 API key 与模型名"
      : "翻译失败";
  return { message, detail, rateLimited, fatal };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pageHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}

class TranslationQueue {
  private readonly states = new Map<string, TranslationState>();
  private readonly texts = new Map<string, string>();
  private readonly listeners = new Set<() => void>();
  private pending: string[] = [];
  private running = false;
  private backoffMs = 0;
  private config: TranslatorConfig | null = null;
  private version = 0;

  constructor() {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) this.kick();
      });
    }
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly get = (key: string): TranslationState => this.states.get(key) ?? IDLE;

  readonly getVersion = (): number => this.version;

  configure(config: TranslatorConfig | null): void {
    const next =
      config && config.apiKey.trim() ? { apiKey: config.apiKey.trim(), model: config.model } : null;
    if (JSON.stringify(next) === JSON.stringify(this.config)) return;
    this.config = next;
    this.backoffMs = 0;
    if (next) {
      // A new key or model deserves a fresh attempt at everything that failed.
      for (const [key, state] of this.states) {
        if (state.status === "error") {
          this.states.set(key, { status: "queued" });
          this.pending.push(key);
        }
      }
    }
    this.emit();
    this.kick();
  }

  async request(items: TranslationItem[]): Promise<void> {
    const fresh = items.filter((i) => i.text.trim() !== "" && !this.states.has(i.key));
    if (fresh.length === 0) return;
    for (const i of fresh) {
      this.texts.set(i.key, i.text);
      this.states.set(i.key, { status: "queued" });
    }
    this.emit();
    const cached = await getCachedMany(fresh.map((i) => i.key));
    for (const i of fresh) {
      const hit = cached.get(i.key);
      if (hit) this.states.set(i.key, { status: "done", zh: hit.zh });
      else this.pending.push(i.key);
    }
    this.emit();
    this.kick();
  }

  retry(keys: string[]): void {
    for (const key of keys) {
      if (this.states.get(key)?.status === "error" && this.texts.has(key)) {
        this.states.set(key, { status: "queued" });
        this.pending.push(key);
      }
    }
    this.backoffMs = 0;
    this.emit();
    this.kick();
  }

  /** Forget everything in memory, used after the persistent cache was cleared. */
  reset(): void {
    this.states.clear();
    this.texts.clear();
    this.pending = [];
    this.emit();
  }

  private emit(): void {
    this.version++;
    for (const listener of this.listeners) listener();
  }

  private kick(): void {
    if (this.running || !this.config || this.pending.length === 0 || pageHidden()) return;
    void this.run();
  }

  private takeBatch(): string[] {
    const batch: string[] = [];
    let chars = 0;
    while (this.pending.length > 0 && batch.length < MAX_ITEMS_PER_REQUEST) {
      const key = this.pending[0];
      if (key === undefined) break;
      const length = this.texts.get(key)?.length ?? 0;
      if (batch.length > 0 && chars + length > MAX_CHARS_PER_REQUEST) break;
      this.pending.shift();
      if (this.states.get(key)?.status !== "queued") continue;
      batch.push(key);
      chars += length;
    }
    return batch;
  }

  private setAll(keys: string[], state: TranslationState): void {
    for (const key of keys) this.states.set(key, state);
  }

  private async run(): Promise<void> {
    this.running = true;
    try {
      while (this.config && this.pending.length > 0 && !pageHidden()) {
        const config = this.config;
        const batch = this.takeBatch();
        if (batch.length === 0) continue;
        this.setAll(batch, { status: "loading" });
        this.emit();
        try {
          const result = await translateBatch(
            config.apiKey,
            config.model,
            batch.map((key) => ({ id: key, text: this.texts.get(key) ?? "" })),
          );
          const at = new Date().toISOString();
          for (const key of batch) {
            const zh = result.get(key);
            if (zh === undefined) {
              this.states.set(key, {
                status: "error",
                message: "模型漏掉了这一条",
                detail: "missing id in response",
                rateLimited: false,
              });
            } else {
              this.states.set(key, { status: "done", zh });
              void setCached(key, { zh, model: config.model, at });
            }
          }
          this.backoffMs = 0;
        } catch (err) {
          const failure = describe(err);
          const errorState: TranslationState = {
            status: "error",
            message: failure.message,
            detail: failure.detail,
            rateLimited: failure.rateLimited,
          };
          this.setAll(batch, errorState);
          if (failure.rateLimited) {
            // Show the notice, wait, then put the batch back at the front of the line.
            this.emit();
            this.backoffMs = Math.min(
              this.backoffMs ? this.backoffMs * 2 : BACKOFF_START_MS,
              BACKOFF_MAX_MS,
            );
            await sleep(this.backoffMs);
            this.setAll(batch, { status: "queued" });
            this.pending.unshift(...batch);
            continue;
          }
          if (failure.fatal) {
            // The same key and model will fail for everything else too. Fail fast instead of hammering.
            this.setAll(this.pending, errorState);
            this.pending = [];
          }
        }
        this.emit();
        if (this.pending.length > 0) await sleep(GAP_MS);
      }
    } finally {
      this.running = false;
    }
  }
}

export const translationQueue = new TranslationQueue();

export function postTranslationKey(id: string): string {
  return `p:${id}`;
}

export function quoteTranslationKey(id: string): string {
  return `q:${id}`;
}
