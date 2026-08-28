import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { ReaderView } from '@/components/reader/ReaderView';
import { Button, SafeAreaView, Typo } from '@/components/ui';
import { isInternalArticleUrl } from '@/lib/articles/articleUrl';
import { loadArticle } from '@correctiv/app-core/articles/load';
import type { Article } from '@correctiv/app-core/articles/types';
import { readerHtml } from '@/lib/articles/reader';
import { goBack } from '@/lib/navigation/goBack';
import { shareArticle } from '@/lib/shareArticle';
import { useCoreActions, useIsMember, useIsSaved, useTextScale } from '@/lib/store/core';
import { sizes, useColors, useIsDark } from '@/lib/theme';

/**
 * Article reader: full-page webview over cleaned-up article HTML (token CSS and
 * embedded fonts, so it works offline). Native overlay header for back and save.
 *
 * Links are intercepted: a correctiv.org article pushes another reader,
 * `correctiv://join` opens the join flow, anything else goes to the system browser.
 */
export default function ArtikelScreen() {
  const colors = useColors();
  const actions = useCoreActions();
  const { url, title, badge } = useLocalSearchParams<{
    url?: string;
    title?: string;
    badge?: string;
  }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState(false);
  /** Bumped to retry: the effect depends on it, so a tap re-runs the load. */
  const [attempt, setAttempt] = useState(0);
  // Subscribes to just this one article's saved flag, so bookmarking another
  // article does not re-render the reader.
  const saved = useIsSaved(url ?? '');
  // Both are read per render, never snapshotted: the membership flip has to reach
  // the reader's support footer, and the text-size setting its root font size.
  const isMember = useIsMember();
  const textScale = useTextScale();
  const isDark = useIsDark();

  useEffect(() => {
    if (!url) return;
    let active = true;
    const load = async () => {
      setArticle(null);
      setError(false);
      try {
        const a = await loadArticle(url, { kicker: badge });
        if (active) setArticle(a);
      } catch {
        if (active) setError(true);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [url, badge, attempt]);

  const onNavigate = (target: string): boolean => {
    if (target === 'about:blank' || target.startsWith('data:') || target.startsWith('file:'))
      return true;
    if (target.startsWith('correctiv://join')) {
      router.push('/(tabs)/profil');
      return false;
    }
    if (isInternalArticleUrl(target)) {
      router.push({ pathname: '/artikel', params: { url: target } });
      return false;
    }
    // Everything else external → system browser.
    if (/^https?:/.test(target)) {
      Linking.openURL(target);
      return false;
    }
    return true;
  };

  return (
    <View className="flex-1 bg-grey-100">
      {article ? (
        <ReaderView
          html={readerHtml(article, { isMember, textScale, isDark })}
          onNavigate={onNavigate}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-m">
          {error ? (
            <>
              <Typo variant="headline-s" className="text-center">
                Artikel konnte nicht geladen werden
              </Typo>
              <Typo variant="text-m" color="grey-600" className="mt-2xs text-center">
                {title ?? 'Vielleicht hilft ein zweiter Versuch.'}
              </Typo>
              <View className="mt-m flex-row gap-s">
                <Button title="Erneut versuchen" onPress={() => setAttempt((n) => n + 1)} />
                {url && (
                  <Button
                    title="Im Browser öffnen"
                    variant="outline"
                    onPress={() => Linking.openURL(url)}
                  />
                )}
              </View>
            </>
          ) : (
            <ActivityIndicator color={colors.emphasis} />
          )}
        </View>
      )}

      {/* Overlay header: it floats over the hero image rather than pushing it down,
          and the article scrolls underneath it. */}
      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0">
        <View className="flex-row items-center justify-between px-s py-2xs">
          <HeaderButton icon="chevron-back" label="Zurück" onPress={goBack} />
          {url && (
            <View className="flex-row gap-2xs">
              {/* Sharing a piece of journalism is the point of publishing it — the
                  one action here that works on the article rather than on the app. */}
              <HeaderButton
                icon="share-outline"
                label="Artikel teilen"
                onPress={() => shareArticle(url, title ?? article?.title)}
              />
              <HeaderButton
                icon={saved ? 'bookmark' : 'bookmark-outline'}
                label={saved ? 'Gespeichert, entfernen' : 'Artikel speichern'}
                onPress={() =>
                  actions.savedArticles.toggle({
                    url,
                    title: title ?? article?.title ?? '',
                    kicker: article?.kicker ?? null,
                    rating: article?.rating ?? null,
                    savedAt: new Date().toISOString(),
                  })
                }
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

/**
 * Opaque with a hairline, not translucent.
 *
 * This was `opacity: 0.92` and no border, which is invisible against the article's
 * white background — the surface vanished and the icon stayed, so once the hero had
 * scrolled past, the chevron sat inside a word ("CSD-Anschlag" read as a chevron
 * plus "D-Anschlag"). Only visible below the fold, which is why every emulator
 * screenshot of the reader missed it. Opaque, the control covers what passes under
 * it instead of mixing with it, and the border keeps it readable as a control on a
 * white page too.
 */
function HeaderButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** Spoken name — the button has no text, so without it a screen reader says nothing. */
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="items-center justify-center rounded-full border border-grey-300 bg-grey-100 active:opacity-70"
      style={{ width: sizes.iconButton, height: sizes.iconButton }}
    >
      <Ionicons name={icon} size={22} color={colors['grey-700']} />
    </Pressable>
  );
}
