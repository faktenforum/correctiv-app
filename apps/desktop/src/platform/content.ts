// `ContentBundle` — what this host ships in its own bundle.
//
// The same four generated TypeScript modules the phone reads, imported through the
// mobile app's own `@/` alias. That is deliberate and it is the cheapest half of this
// whole port: `npm run offline-articles` and `npm run offline-podcasts` already
// produce exactly what the core's cascades ask for, the collecting half of those
// scripts lives in `@correctiv/app-core/articles/offline-bundle` precisely so a
// second host can bundle the same content, and nothing here needs to re-derive
// anything.
//
// `image` matters more on this host than on the phone, and for a reason that is not
// obvious. `adoptBundledImages` in the core swaps a feed item's remote image URL for
// the bundled one because the remote URL cannot load when there is no network. Here
// the bundled one is ALSO the only form `Gtk.Picture` can be handed without a network
// round trip: the covers are inlined base64 `data:` URIs, which
// `src/shims/expo-image.tsx` decodes straight into a `Gdk.Texture`. So this entry is
// what makes an offline Home a page of covers rather than a page of empty frames.

import type { ContentBundle } from '@correctiv/app-core';
import type { Article } from '@correctiv/app-core/articles/types';

import { OFFLINE_ARTICLES, OFFLINE_FEEDS } from '@/lib/articles/offlineBundle.generated';
import { OFFLINE_COVERS } from '@/lib/articles/covers';
import { OFFLINE_PODCASTS } from '@/lib/podcasts/offlineBundle.generated';

export const content: ContentBundle = {
  feed: (key) => OFFLINE_FEEDS[key] ?? null,
  article: (url) => (OFFLINE_ARTICLES[url] as Article | undefined) ?? null,
  image: (url) => OFFLINE_COVERS[url] ?? null,
  podcastSeries: (id) => OFFLINE_PODCASTS[id] ?? null,
};
