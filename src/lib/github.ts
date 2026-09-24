import type { CreatorConfig } from "../shared/types.ts";

/** "owner/name" of the repository this site is built from. Injected at build time. */
export const REPO: string = import.meta.env.VITE_REPO ?? "";
export const CREATORS_PATH = "creators.json";

const API = "https://api.github.com";

export class GitHubError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ContentsResponse = { sha: string; content: string; encoding: string };

/** The current creators.json on the default branch, with the blob sha needed to update it. */
export type CreatorsFile = { creators: CreatorConfig[]; sha: string };

function headers(token: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
}

async function fail(res: Response): Promise<never> {
  let detail = "";
  try {
    detail = ((await res.json()) as { message?: string }).message ?? "";
  } catch {
    // Non-JSON body, keep the status only.
  }
  const message =
    res.status === 401
      ? "GitHub rejected the token"
      : res.status === 403
        ? "The token has no write access to this repository"
        : res.status === 404
          ? `Repository ${REPO} or ${CREATORS_PATH} not found`
          : `GitHub responded ${res.status}${detail ? `: ${detail}` : ""}`;
  throw new GitHubError(message, res.status);
}

function decode(base64: string): string {
  const bytes = Uint8Array.from(atob(base64.replaceAll("\n", "")), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encode(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}

export async function readCreatorsFile(token: string): Promise<CreatorsFile> {
  if (!REPO) throw new GitHubError("VITE_REPO is not set for this build", 0);
  const res = await fetch(`${API}/repos/${REPO}/contents/${CREATORS_PATH}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) await fail(res);
  const body = (await res.json()) as ContentsResponse;
  const parsed = JSON.parse(decode(body.content)) as unknown;
  if (!Array.isArray(parsed)) throw new GitHubError(`${CREATORS_PATH} is not a JSON array`, 0);
  const creators = parsed
    .map((c: unknown) => normalizeHandle(String((c as CreatorConfig)?.screen_name ?? "")))
    .filter((name): name is string => name !== null)
    .map((screen_name) => ({ screen_name }));
  return { creators, sha: body.sha };
}

export async function writeCreatorsFile(
  token: string,
  creators: CreatorConfig[],
  sha: string,
  message: string,
): Promise<void> {
  const content = JSON.stringify(creators, null, 2) + "\n";
  const res = await fetch(`${API}/repos/${REPO}/contents/${CREATORS_PATH}`, {
    method: "PUT",
    headers: { ...headers(token), "content-type": "application/json" },
    body: JSON.stringify({ message, content: encode(content), sha }),
  });
  if (!res.ok) await fail(res);
}

const HANDLE = /^[A-Za-z0-9_]{1,15}$/;

/**
 * Accepts "name", "@name" or an x.com / twitter.com profile URL and returns the bare handle,
 * or null when the input is not a valid X screen name.
 */
export function normalizeHandle(input: string): string | null {
  let s = input.trim();
  const url = /^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/([^/?#]+)/i.exec(s);
  if (url?.[1]) s = url[1];
  if (s.startsWith("@")) s = s.slice(1);
  return HANDLE.test(s) ? s : null;
}

export function sameHandle(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
