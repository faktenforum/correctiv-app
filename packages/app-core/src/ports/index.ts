/**
 * Platform ports.
 *
 * `@correctiv/app-core` must never import a platform SDK. Everything the core needs
 * from the host — device storage, the file system — is declared here as an
 * interface and supplied by the host at startup via `configurePlatform()`.
 *
 * Hosts:
 *   - apps/mobile  → NativeScript (ApplicationSettings, knownFolders/File)
 *   - apps/web     → browser (localStorage, IndexedDB/Cache API)
 *   - vitest       → the in-memory default below, so tests need no setup
 *
 * The in-memory default is deliberate: both consumers of these ports treat
 * persistence as best-effort (the file cache "is a nicety, not a must"), so an
 * unconfigured core degrades to session-only behaviour instead of throwing.
 */

/** Small string key/value store — used for Pinia state persistence. */
export interface KeyValueStore {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  remove(key: string): void;
}

/**
 * Namespaced text blob store — used for the HTTP/feed cache.
 * `namespace` groups entries (one per feed kind); `name` is an opaque file-safe key.
 */
export interface FileStore {
  read(namespace: string, name: string): string | null;
  write(namespace: string, name: string, contents: string): void;
}

export interface CorePlatform {
  keyValue: KeyValueStore;
  files: FileStore;
}

/** Session-only fallback. Used by tests and by any host that has not registered yet. */
export function createMemoryPlatform(): CorePlatform {
  const kv = new Map<string, string>();
  const blobs = new Map<string, string>();
  return {
    keyValue: {
      getString: (key) => kv.get(key) ?? null,
      setString: (key, value) => void kv.set(key, value),
      remove: (key) => void kv.delete(key),
    },
    files: {
      read: (namespace, name) => blobs.get(`${namespace}/${name}`) ?? null,
      write: (namespace, name, contents) => void blobs.set(`${namespace}/${name}`, contents),
    },
  };
}

let current: CorePlatform = createMemoryPlatform();

/** Called once by the host before any store or service is used. */
export function configurePlatform(next: CorePlatform): void {
  current = next;
}

export function platform(): CorePlatform {
  return current;
}

/** Test helper — drops any host registration and returns to session-only storage. */
export function resetPlatform(): void {
  current = createMemoryPlatform();
}
