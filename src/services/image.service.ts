/**
 * Remote images load through ImageSource.fromUrl (the JS HTTP stack) instead
 * of the native widgets fetcher. That fetcher stores downloads under
 * <externalCacheDir>/http — a directory Android may clear at any time — and
 * silently drops every remote image with ENOENT when it is missing.
 * The JS HTTP stack is the same proven path the feed loading uses.
 */
import { File, ImageSource, knownFolders, path } from '@nativescript/core';

const cache = new Map<string, ImageSource>();
const pending = new Map<string, Promise<ImageSource | null>>();
const MAX_ENTRIES = 80;

let localCovers: Map<string, string> | null | undefined;

/** Local cover from the offline article bundle, keyed by article URL —
    the render-time fallback when a remote cover cannot be loaded. */
export function localCoverFor(url: string): string | null {
  if (localCovers === undefined) {
    try {
      const indexFile = path.join(knownFolders.currentApp().path, 'assets', 'data', 'articles', 'index.json');
      if (File.exists(indexFile)) {
        const index = JSON.parse(File.fromPath(indexFile).readTextSync()) as {
          articles: { url: string; localImage: string | null }[];
        };
        localCovers = new Map();
        for (const article of index.articles) {
          if (article.localImage) localCovers.set(article.url, article.localImage);
        }
      } else {
        localCovers = null;
      }
    } catch {
      localCovers = null;
    }
  }
  return localCovers?.get(url) ?? null;
}

export function getCachedRemoteImage(url: string): ImageSource | null {
  return cache.get(url) ?? null;
}

export function loadRemoteImage(url: string): Promise<ImageSource | null> {
  const hit = cache.get(url);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(url);
  if (inflight) return inflight;

  const request = ImageSource.fromUrl(url)
    .then((source) => {
      // Simple FIFO eviction — thumbnails are small, 80 entries suffice per session
      if (cache.size >= MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      cache.set(url, source);
      return source;
    })
    .catch(() => null)
    .finally(() => {
      pending.delete(url);
    });
  pending.set(url, request);
  return request;
}
