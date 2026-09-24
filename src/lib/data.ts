import type { IndexFile, LatestFile, MonthFile } from "../shared/types.ts";

const base = import.meta.env.BASE_URL;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}data/${path}?v=${encodeURIComponent(__BUILD_ID__)}`);
  if (!res.ok) throw new Error(`Could not load ${path} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

export function fetchIndex(): Promise<IndexFile> {
  return getJson<IndexFile>("index.json");
}

export function fetchLatest(): Promise<LatestFile> {
  return getJson<LatestFile>("latest.json");
}

export function fetchMonth(month: string): Promise<MonthFile> {
  return getJson<MonthFile>(`posts/${month}.json`);
}
