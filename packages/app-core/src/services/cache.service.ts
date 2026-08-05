import { platform } from '../ports';

/**
 * Two layers: in-memory (session) + a namespaced blob cache behind the FileStore
 * port. The KeyValueStore port stays reserved for the small store persistences
 * (see stores/persist.ts).
 *
 * On NativeScript the FileStore writes to documents/cache/<ns>/; in a browser it
 * would be backed by IndexedDB/Cache API; in tests it is in-memory.
 */
const memory = new Map<string, { data: unknown; ts: number }>();

function fileKey(key: string): string {
  // djb2 — stable and short enough for file names
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function readEntry<T>(ns: string, key: string): { data: T; ts: number } | null {
  try {
    const raw = platform().files.read(ns, `${fileKey(key)}.json`);
    if (raw === null) return null;
    return JSON.parse(raw) as { data: T; ts: number };
  } catch {
    return null;
  }
}

export function getCached<T>(ns: string, key: string, ttlMs: number): T | null {
  const memKey = `${ns}:${key}`;
  const mem = memory.get(memKey);
  const now = Date.now();
  if (mem && now - mem.ts < ttlMs) return mem.data as T;

  const entry = readEntry<T>(ns, key);
  if (!entry) return null;
  if (now - entry.ts >= ttlMs) return null;
  memory.set(memKey, entry);
  return entry.data;
}

/** Also returns expired entries — for stale-while-revalidate and offline fallback. */
export function getStale<T>(ns: string, key: string): T | null {
  const mem = memory.get(`${ns}:${key}`);
  if (mem) return mem.data as T;
  return readEntry<T>(ns, key)?.data ?? null;
}

export function setCached(ns: string, key: string, data: unknown): void {
  const entry = { data, ts: Date.now() };
  memory.set(`${ns}:${key}`, entry);
  try {
    platform().files.write(ns, `${fileKey(key)}.json`, JSON.stringify(entry));
  } catch {
    // the blob cache is a nicety, not a must
  }
}

/** Test helper — clears the session layer (the FileStore is owned by the host). */
export function clearMemoryCache(): void {
  memory.clear();
}
