import { CONTENT_FEEDS } from '@correctiv/app-core/data/feeds.config';
import type { FeedItem } from '@correctiv/app-core/types/models';

import { getFeeds } from './client';

/**
 * Der Offline-Rückfall der Suche: alles, was dieses Gerät ohne Netz über
 * correctiv.org weiß.
 *
 * Die Volltextsuche läuft serverseitig (WordPress REST). Wenn die nicht
 * erreichbar ist — oder auf Web gar nicht erst darf, siehe die CORS-Notiz in
 * ADR 0004 —, sucht die App in den bereits geladenen Feeds. `getFeeds` fällt
 * pro Feed auf den AsyncStorage-Cache zurück, der Rückfall trägt also auch im
 * Flugmodus.
 *
 * Der NativeScript-Stand hat dafür beim Öffnen der Suche alle sechs Feeds
 * angestoßen. Hier passiert das erst, wenn der Rückfall wirklich gebraucht
 * wird: der Normalfall (Server antwortet) kostet dann keine sechs Requests.
 */
let pending: Promise<FeedItem[]> | null = null;

async function feedCorpus(): Promise<FeedItem[]> {
  const items = await (pending ??= getFeeds(CONTENT_FEEDS));
  // Leeres Ergebnis nicht festschreiben: das heißt „alle sechs Feeds sind
  // fehlgeschlagen und es lag nichts im Cache", und beim nächsten Versuch kann
  // das Netz wieder da sein. `getFeeds` selbst wirft nie (allSettled).
  if (items.length === 0) pending = null;
  return items;
}

/** Titel- und Teasersuche über den lokalen Bestand, neueste zuerst. */
export async function searchFeedCorpus(query: string, limit = 12): Promise<FeedItem[]> {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const items = await feedCorpus();
  return items
    .filter(
      (item) =>
        item.title.toLowerCase().includes(needle) || item.teaser.toLowerCase().includes(needle),
    )
    .slice(0, limit);
}

/** Nur für Tests: erzwingt beim nächsten Aufruf ein frisches Laden. */
export function resetFeedCorpus(): void {
  pending = null;
}
