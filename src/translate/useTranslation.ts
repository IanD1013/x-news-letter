import { useEffect, useSyncExternalStore } from "react";
import type { Post } from "../shared/types.ts";
import {
  postTranslationKey,
  quoteTranslationKey,
  translationQueue,
  type TranslationItem,
  type TranslationState,
} from "./queue.ts";

export function useTranslationState(key: string): TranslationState {
  return useSyncExternalStore(translationQueue.subscribe, () => translationQueue.get(key));
}

/** Changes whenever any translation changes. Search depends on it. */
export function useTranslationVersion(): number {
  return useSyncExternalStore(translationQueue.subscribe, translationQueue.getVersion);
}

/** Everything translatable in these posts, thread parts adjacent so terminology stays consistent. */
export function translationItemsFor(posts: Post[]): TranslationItem[] {
  const items: TranslationItem[] = [];
  for (const p of posts) {
    items.push({ key: postTranslationKey(p.id), text: p.text });
    if (p.quote) items.push({ key: quoteTranslationKey(p.quote.id), text: p.quote.text });
  }
  return items;
}

/** Queues the items once `active` becomes true, typically when the card scrolls into view. */
export function useAutoTranslate(active: boolean, items: TranslationItem[]): void {
  const signature = items.map((i) => i.key).join("|");
  useEffect(() => {
    if (!active || signature === "") return;
    void translationQueue.request(items);
    // `signature` fully identifies `items`: the text behind a key never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, signature]);
}
