import { clear, createStore, getMany, set } from "idb-keyval";

export type CachedTranslation = { zh: string; model: string; at: string };

const store = createStore("x-news-letter", "translations");

export async function getCachedMany(keys: string[]): Promise<Map<string, CachedTranslation>> {
  const out = new Map<string, CachedTranslation>();
  try {
    const values = await getMany<CachedTranslation | undefined>(keys, store);
    values.forEach((value, i) => {
      const key = keys[i];
      if (value && key) out.set(key, value);
    });
  } catch {
    // IndexedDB unavailable: behave as a cache miss.
  }
  return out;
}

export async function setCached(key: string, value: CachedTranslation): Promise<void> {
  try {
    await set(key, value, store);
  } catch {
    // Best effort only.
  }
}

export async function clearCache(): Promise<void> {
  await clear(store);
}
