import { defineStore } from 'pinia';
import { knownFolders, path, File } from '@nativescript/core';
import type { FeedItem, FeedKey } from '../types/models';
import { FEEDS } from '../data/feeds.config';
import { fetchFeed } from '../services/rss.service';
import { getCached, getStale, setCached } from '../services/cache.service';
import { loadOgImage } from '../services/article.service';

const CACHE_NS = 'feeds';
const FEED_TTL_MS = 15 * 60 * 1000;

export type FeedStatus = 'idle' | 'loading' | 'ready' | 'offline' | 'error';

interface FeedState {
  items: FeedItem[];
  status: FeedStatus;
  lastFetched: number;
}

function emptyState(): FeedState {
  return { items: [], status: 'idle', lastFetched: 0 };
}

/** Gebündelter Feed-Snapshot aus assets/data/feeds/<key>.json (Offline-Fallback). */
function loadBundledSnapshot(key: FeedKey): FeedItem[] | null {
  try {
    const appRoot = knownFolders.currentApp().path;
    const file = path.join(appRoot, 'assets', 'data', 'feeds', `${key}.json`);
    if (!File.exists(file)) return null;
    const items = JSON.parse(File.fromPath(file).readTextSync()) as FeedItem[];
    // Lokale Titelbilder aus dem Offline-Artikel-Index übernehmen
    try {
      const indexFile = path.join(appRoot, 'assets', 'data', 'articles', 'index.json');
      if (File.exists(indexFile)) {
        const index = JSON.parse(File.fromPath(indexFile).readTextSync()) as {
          articles: { url: string; localImage: string | null }[];
        };
        const imageByUrl = new Map(index.articles.map((a) => [a.url, a.localImage]));
        for (const item of items) {
          const local = imageByUrl.get(item.url);
          if (local) item.imageUrl = local;
        }
      }
    } catch {
      // Bilder sind Komfort
    }
    return items;
  } catch {
    return null;
  }
}

export const useFeedsStore = defineStore('feeds', {
  state: () => ({
    byKey: {
      recherchen: emptyState(),
      faktencheck: emptyState(),
      klima: emptyState(),
      schweiz: emptyState(),
      lokal: emptyState(),
      salon5: emptyState(),
    } as Record<FeedKey, FeedState>,
  }),
  actions: {
    /**
     * Cache-Kaskade mit stale-while-revalidate: frischer Cache → sofort;
     * abgelaufener Cache → sofort anzeigen, Netz-Refresh im Hintergrund;
     * Netz-Fehler → gebündelter Snapshot (status 'offline').
     */
    async fetch(key: FeedKey, options: { force?: boolean } = {}) {
      const state = this.byKey[key];
      const cached = options.force ? null : getCached<FeedItem[]>(CACHE_NS, key, FEED_TTL_MS);
      if (cached) {
        state.items = cached;
        state.status = 'ready';
        return;
      }

      const stale = getStale<FeedItem[]>(CACHE_NS, key);
      if (stale && state.items.length === 0) {
        state.items = stale;
        state.status = 'ready';
      } else if (state.items.length === 0) {
        state.status = 'loading';
      }

      try {
        const items = await fetchFeed(key, FEEDS[key].url);
        // og:image-URLs aus früherer Anreicherung übernehmen
        const known = new Map(state.items.map((i) => [i.id, i.imageUrl]));
        for (const item of items) {
          const image = known.get(item.id);
          if (image) item.imageUrl = image;
        }
        state.items = items;
        state.status = 'ready';
        state.lastFetched = Date.now();
        setCached(CACHE_NS, key, items);
      } catch (err) {
        console.error(`Feed-Fetch '${key}' fehlgeschlagen:`, err instanceof Error ? err.message : err);
        if (state.items.length > 0) return; // stale Anzeige reicht
        const snapshot = loadBundledSnapshot(key);
        if (snapshot) {
          state.items = snapshot;
          state.status = 'offline';
        } else {
          state.status = 'error';
        }
      }
    },

    /** og:image eines Items lazy nachladen und reaktiv patchen. */
    async enrichImage(key: FeedKey, itemId: string) {
      const state = this.byKey[key];
      const item = state.items.find((i) => i.id === itemId);
      if (!item || item.imageUrl) return;
      const image = await loadOgImage(item.url);
      if (image) {
        item.imageUrl = image;
        setCached(CACHE_NS, key, state.items.map((i) => ({ ...i })));
      }
    },
  },
});
