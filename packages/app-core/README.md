# @correctiv/app-core

The behaviour of the CORRECTIV app, with no UI framework and no platform SDK in it.

Both apps in this repo import it: `apps/mobile-rn` (Expo / React Native) and
`apps/mobile` (NativeScript / Vue). Anything that is not a screen and not an SDK call
belongs here — the model, the parsers, the services, the caches and **all** of the
state.

## The rule

No `react`, `react-native`, `expo`, `vue`, `pinia`, `zustand`, `@nativescript/*` or
`node:*` import, ever. `test/boundary.test.ts` checks every source file on every PR
and names the offender.

If something needs a platform, it becomes a **port**: an interface in
`src/ports/index.ts` that the host implements. There are four, and that file is the
whole cost of adding a host — see [ARCHITECTURE.md](../../ARCHITECTURE.md#the-four-ports).

## Layout

Subpath imports mirror the source tree; there is no barrel:

```ts
import { configurePlatform } from '@correctiv/app-core';            // ports only
import { loadArticle } from '@correctiv/app-core/articles/load';
import { feedsStore } from '@correctiv/app-core/stores/feeds';
import { formatDateDe } from '@correctiv/app-core/lib/format';
import type { Article } from '@correctiv/app-core/articles/types';
```

```
src/ports/       KeyValueStore · BlobStore · ContentBundle · AudioBackend
src/types/       FeedItem, Video, AudioTrack, MediaChannel
src/articles/    the Article model, the fact-check vocabulary, page meta,
                 the reader document, the load cascade, the offline collector
  extract/       string.ts (no dependencies) and dom.ts (htmlparser2)
src/services/    http · cache (network-first / cache-first) · rss · search ·
                 podcast · peertube
src/stores/      feeds · audio · podcasts · media · video · membership · interests ·
                 savedArticles · participation · settings · create-store · persist
src/data/        feeds.config and the typed sample data
src/lib/         html · rss-parse · format
src/media/       exclusive-playback — only one medium plays at a time
```

## Two things that will surprise you

**`stores/create-store.ts` is not zustand,** although its API is shaped like it.
zustand's package exports resolve to a CommonJS build under `@nativescript/vite`,
which broke the Android bundle while typecheck and the Expo build both passed. The
file header has the full story. Hosts may still use zustand's `useStore` for their
own binding — it only needs `subscribe`, `getState` and `getInitialState`.

**Derived state is an exported selector taking state, never a store method.** A
method reads past Vue's dependency tracking, and the template then silently stops
updating — a class of bug that is invisible until a demo.

```ts
export function isSaved(state: Pick<SavedArticlesState, 'items'>, url: string): boolean
```

## Tests

```bash
npm test -w @correctiv/app-core        # vitest, ~0.5 s
npm run test:watch                     # from the repo root
```

197 tests against real captured correctiv.org pages and feeds, plus two
architectural guards: the platform boundary, and the agreement between the two
extraction backends (they must produce the same article from the same page, or the
choice of backend has become a fork).
