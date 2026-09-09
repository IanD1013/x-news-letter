const TWITTER_EPOCH_MS = 1288834974657n;

export function idToDate(id: string): Date {
  return new Date(Number((BigInt(id) >> 22n) + TWITTER_EPOCH_MS));
}

export function idToMonth(id: string): string {
  return idToDate(id).toISOString().slice(0, 7);
}
