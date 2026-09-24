import { useCallback, useEffect, useMemo, useState } from "react";
import type { CreatorConfig, IndexFile } from "../shared/types.ts";
import {
  normalizeHandle,
  readCreatorsFile,
  REPO,
  sameHandle,
  writeCreatorsFile,
} from "./github.ts";

export type Subscription = {
  screen_name: string;
  name: string;
  avatar_url: string;
  /** False until the pipeline has fetched this account at least once. */
  ready: boolean;
};

export type Subscriptions = {
  list: Subscription[];
  /** Lower-cased handles from creators.json, or null while the repository state is unknown. */
  followed: ReadonlySet<string> | null;
  /** A token and a repository are configured, so add and remove can work. */
  canManage: boolean;
  /** An add or remove is in flight. */
  busy: boolean;
  /** Message from the last failed GitHub call, cleared by the next successful one. */
  error: string | null;
  add: (input: string) => Promise<boolean>;
  remove: (screenName: string) => Promise<void>;
  /** Drops the current error, for when the form that caused it is dismissed. */
  clearError: () => void;
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * The accounts the site follows. Metadata comes from the built index; the authoritative list
 * comes from creators.json on GitHub whenever a token is available, so an account added a
 * minute ago shows up as pending instead of vanishing until the next deploy.
 */
export function useSubscriptions(index: IndexFile | null, token: string): Subscriptions {
  const canManage = token !== "" && REPO !== "";
  const [remote, setRemote] = useState<CreatorConfig[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRemote(null);
    setError(null);
    if (!canManage) return;
    let cancelled = false;
    void readCreatorsFile(token)
      .then((file) => {
        if (!cancelled) setRemote(file.creators);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [canManage, token]);

  const list = useMemo<Subscription[]>(() => {
    const known = index?.creators ?? [];
    if (!remote) return known.map((c) => ({ ...c, ready: true }));
    return remote.map(({ screen_name }) => {
      const meta = known.find((c) => sameHandle(c.screen_name, screen_name));
      return meta
        ? { ...meta, ready: true }
        : { screen_name, name: screen_name, avatar_url: "", ready: false };
    });
  }, [index, remote]);

  const followed = useMemo(
    () => (remote ? new Set(remote.map((c) => c.screen_name.toLowerCase())) : null),
    [remote],
  );

  /** Re-reads creators.json, applies `change`, commits, and mirrors the result locally. */
  const commit = useCallback(
    async (
      change: (current: CreatorConfig[]) => CreatorConfig[] | string,
      message: string,
    ): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        const file = await readCreatorsFile(token);
        const next = change(file.creators);
        if (typeof next === "string") {
          setError(next);
          return false;
        }
        await writeCreatorsFile(token, next, file.sha, message);
        setRemote(next);
        return true;
      } catch (err) {
        setError(errorMessage(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  const add = useCallback(
    (input: string): Promise<boolean> => {
      const handle = normalizeHandle(input);
      if (!handle) {
        setError("Enter an X handle like @name or a profile URL");
        return Promise.resolve(false);
      }
      return commit((current) => {
        const existing = current.find((c) => sameHandle(c.screen_name, handle));
        if (existing) return `Already following @${existing.screen_name}`;
        return [...current, { screen_name: handle }];
      }, `chore: follow @${handle}`);
    },
    [commit],
  );

  const remove = useCallback(
    async (screenName: string): Promise<void> => {
      await commit(
        (current) => current.filter((c) => !sameHandle(c.screen_name, screenName)),
        `chore: unfollow @${screenName}`,
      );
    },
    [commit],
  );

  const clearError = useCallback(() => setError(null), []);

  return { list, followed, canManage, busy, error, add, remove, clearError };
}
