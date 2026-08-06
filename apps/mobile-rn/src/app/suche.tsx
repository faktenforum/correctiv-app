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
import { colors, typography } from '@/lib/theme';
import { useDebounced } from '@/lib/useDebounced';

/** Unter zwei Zeichen sucht niemand sinnvoll — und der Server auch nicht. */
const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

/**
 * Volltextsuche über correctiv.org, mit lokalem Rückfall.
 *
 * Reihenfolge: WordPress-REST (`searchArticles`, im Core) → bei Fehler ODER
 * leerem Ergebnis die schon geladenen Feeds (`searchFeedCorpus`). Der Rückfall
 * ist kein Notnagel, sondern die Zusage aus dem Cache-Konzept: die Demo darf nie
 * am WLAN hängen. Auf dem Web-Target ist er sogar der Normalfall, weil
 * correctiv.org keinen CORS-Header sendet (ADR 0004).
 *
 * Die Projekttreffer (Podcasts, Aufrufe, Backstage, Verlag) stehen nicht in den
 * Feeds und werden lokal gefiltert — ohne Debounce, weil das nichts kostet.
 */
export default function SucheScreen() {
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

    // setState steht im inneren async-Lauf, nicht im Effekt-Rumpf — dasselbe
    // Muster wie useAsyncData in lib/feeds/useFeed.ts (React-Compiler-fest).
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
        // offline, API-Fehler oder auf Web der CORS-Block — beides derselbe Weg.
      }
      const local = await searchFeedCorpus(debounced);
      if (active) setArticles(local);
    };

    run().finally(() => {
      if (active) setSearching(false);
    });

    return () => {
      // Ein überholter Lauf schreibt nichts mehr: die letzte Eingabe gewinnt.
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
    <View className="flex-1 bg-grey-100">
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
          className="rounded-s bg-grey-200 px-s py-xs"
          style={[typography['text-m'], { color: colors['grey-700'] }]}
        />
      </ScreenHeader>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-m pt-s pb-2xl"
        showsVerticalScrollIndicator={false}
        // Ohne „handled" verschluckt der erste Tipp auf ein Ergebnis nur die
        // Tastatur, statt den Artikel zu öffnen.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {tooShort && (
          <Typo variant="text-m" color="grey-600">
            Suchen Sie über Recherchen, Faktenchecks, Projekte, Podcasts und Mitmach-Aktionen.
          </Typo>
        )}

        {searching && articles.length === 0 && (
          <View className="py-l">
            <ActivityIndicator color={colors.emphasis} />
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
          <Typo variant="text-m" color="grey-600">
            Keine Treffer für „{debounced}“.
          </Typo>
        )}
      </ScrollView>
    </View>
  );
}
