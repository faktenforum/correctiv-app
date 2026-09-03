import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';

import { SampleHitRow, sampleTarget } from '@/components/discover/SampleHitRow';
import { ArticleRow } from '@/components/feed/ArticleRow';
import { Hairline, Overline, ScreenHeader, Typo } from '@/components/ui';
import { searchSamples } from '@correctiv/app-core/data/search-samples';
import { searchArticles } from '@correctiv/app-core/services/search.service';
import type { FeedItem } from '@correctiv/app-core/types/models';
import { searchFeedCorpus } from '@/lib/feeds/corpus';
import { openArticle } from '@/lib/openArticle';
import { typography, useColors } from '@/lib/theme';
import { useDebounced } from '@/lib/useDebounced';

/** Below two characters nobody is searching meaningfully — nor is the server. */
const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

/**
 * Full-text search over correctiv.org, with a local fallback.
 *
 * The order: WordPress REST (`searchArticles`, in the core) → on an error OR an
 * empty result, the feeds already loaded (`searchFeedCorpus`). The fallback is not
 * a stopgap but the promise the cache design makes: the demo must never hang on
 * Wi-Fi. It is the exception rather than the rule even on the web target: this
 * search has always run on `wp/v2`, which sends a CORS header, so the note that
 * used to stand here — that a browser is blocked and the fallback is normal — was
 * never true of the search. [ADR 0015](../../../../adr/0015-reading-correctiv-org-through-its-rest-api.md).
 *
 * The project hits (podcasts, callouts, backstage, publishing) are not in the feeds
 * and are filtered locally — without a debounce, because that costs nothing.
 */
export default function SucheScreen() {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const debounced = useDebounced(trimmed, DEBOUNCE_MS);

  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (debounced.length < MIN_QUERY) {
      setArticles([]);
      setSearching(false);
      return;
    }
    let active = true;

    // setState sits in the inner async run, not in the effect body — the same
    // pattern as useAsyncData in lib/feeds/useFeed.ts (safe for the React compiler).
    const run = async () => {
      setSearching(true);
      try {
        const live = await searchArticles(debounced, 15);
        if (!active) return;
        if (live.length > 0) {
          setArticles(live);
          return;
        }
      } catch {
        // Offline, an API error, or the CORS block on web — all the same path.
      }
      const local = await searchFeedCorpus(debounced);
      if (active) setArticles(local);
    };

    run().finally(() => {
      if (active) setSearching(false);
    });

    return () => {
      // A superseded run writes nothing: the latest input wins.
      active = false;
    };
  }, [debounced]);

  const sampleHits = useMemo(() => {
    if (trimmed.length < MIN_QUERY) return [];
    const needle = trimmed.toLowerCase();
    return searchSamples.filter(
      (s) => s.title.toLowerCase().includes(needle) || s.subtitle.toLowerCase().includes(needle),
    );
  }, [trimmed]);

  const tooShort = debounced.length < MIN_QUERY;
  const nothingFound = !tooShort && !searching && articles.length === 0 && sampleHits.length === 0;

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Suchen …"
          placeholderTextColor={colors['grey-500']}
          accessibilityLabel="Suchbegriff"
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          className="rounded-s bg-surface px-s py-xs"
          style={[typography['text-m'], { color: colors['on-canvas'] }]}
        />
      </ScreenHeader>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-m pt-s pb-2xl"
        showsVerticalScrollIndicator={false}
        // Without "handled", the first tap on a result only swallows the keyboard
        // instead of opening the article.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {tooShort && (
          <Typo variant="text-m" color="on-canvas-muted">
            Suchen Sie über Recherchen, Faktenchecks, Projekte, Podcasts und Mitmach-Aktionen.
          </Typo>
        )}

        {searching && articles.length === 0 && (
          <View className="py-l">
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {articles.length > 0 && (
          <View>
            <Overline label="Artikel" />
            <View className="mt-2xs">
              {articles.map((item, i) => (
                <View key={item.id}>
                  {i > 0 && <Hairline />}
                  <ArticleRow item={item} onPress={openArticle} />
                </View>
              ))}
            </View>
          </View>
        )}

        {sampleHits.length > 0 && (
          <View className="mt-m">
            <Overline label="Aus den Projekten" />
            <View className="mt-2xs">
              {sampleHits.map((hit) => {
                const target = sampleTarget(hit.kind);
                return (
                  <SampleHitRow
                    key={hit.id}
                    hit={hit}
                    onPress={target ? () => router.push(target) : undefined}
                  />
                );
              })}
            </View>
          </View>
        )}

        {nothingFound && (
          <Typo variant="text-m" color="on-canvas-muted">
            Keine Treffer für „{debounced}“.
          </Typo>
        )}
      </ScrollView>
    </View>
  );
}
