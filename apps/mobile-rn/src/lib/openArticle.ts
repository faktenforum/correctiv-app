import { router } from 'expo-router';

import type { FeedItem } from '@/lib/models';

/** Öffnet den Artikel-Reader für ein Feed-Item (URL + Titel als Params). */
export function openArticle(item: Pick<FeedItem, 'link' | 'title'>) {
  router.push({ pathname: '/artikel', params: { url: item.link, title: item.title } });
}
