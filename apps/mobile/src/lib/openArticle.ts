import { router } from 'expo-router';

import type { FeedItem } from '@correctiv/app-core/types/models';

/** Opens the article reader for a feed item (url and title as params). */
export function openArticle(item: Pick<FeedItem, 'url' | 'title'>) {
  router.push({ pathname: '/artikel', params: { url: item.url, title: item.title } });
}
