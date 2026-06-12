import { knownFolders, path, File, Folder } from '@nativescript/core';

/**
 * Zwei Ebenen: In-Memory (Session) + Datei-Cache in documents/cache/<ns>/.
 * ApplicationSettings bleibt den kleinen Store-Persistenzen vorbehalten.
 */
const memory = new Map<string, { data: unknown; ts: number }>();

function fileKey(key: string): string {
  // djb2 — stabil und kurz genug für Dateinamen
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function cacheFolder(ns: string): Folder {
  return knownFolders.documents().getFolder(`cache/${ns}`);
}

export function getCached<T>(ns: string, key: string, ttlMs: number): T | null {
  const memKey = `${ns}:${key}`;
  const mem = memory.get(memKey);
  const now = Date.now();
  if (mem && now - mem.ts < ttlMs) return mem.data as T;

  try {
    const filePath = path.join(cacheFolder(ns).path, `${fileKey(key)}.json`);
    if (!File.exists(filePath)) return null;
    const raw = File.fromPath(filePath).readTextSync();
    const entry = JSON.parse(raw) as { data: T; ts: number };
    if (now - entry.ts >= ttlMs) return null;
    memory.set(memKey, entry);
    return entry.data;
  } catch {
    return null;
  }
}

/** Liefert auch abgelaufene Einträge — für stale-while-revalidate und Offline-Fallback. */
export function getStale<T>(ns: string, key: string): T | null {
  const mem = memory.get(`${ns}:${key}`);
  if (mem) return mem.data as T;
  try {
    const filePath = path.join(cacheFolder(ns).path, `${fileKey(key)}.json`);
    if (!File.exists(filePath)) return null;
    return (JSON.parse(File.fromPath(filePath).readTextSync()) as { data: T }).data;
  } catch {
    return null;
  }
}

export function setCached(ns: string, key: string, data: unknown): void {
  const entry = { data, ts: Date.now() };
  memory.set(`${ns}:${key}`, entry);
  try {
    const file = cacheFolder(ns).getFile(`${fileKey(key)}.json`);
    file.writeTextSync(JSON.stringify(entry));
  } catch {
    // Datei-Cache ist Komfort, kein Muss
  }
}
