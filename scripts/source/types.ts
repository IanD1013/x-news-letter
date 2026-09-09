import type { Post } from "../../src/shared/types.ts";

export type SourcePage = { items: Post[]; nextCursor: string | null };

/** A timeline provider. Swap implementations here if FxEmbed goes away. */
export interface PostSource {
  readonly name: string;
  /** Newest first, already filtered and normalized for the given creator. */
  fetchPage(creator: string, cursor: string | null): Promise<SourcePage>;
}
