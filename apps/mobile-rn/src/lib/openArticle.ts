import { router } from 'expo-router';

import type { FeedItem } from '@correctiv/app-core/types/models';

/** Öffnet den Artikel-Reader für ein Feed-Item (URL + Titel als Params). */
export function openArticle(item: Pick<FeedItem, 'url' | 'title'>) {
  router.push({ pathname: '/artikel', params: { url: item.url, title: item.title } });
}
