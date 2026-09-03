import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Pressable, View } from 'react-native';

import { ReaderView } from '@/components/reader/ReaderView';
import { Button, SafeAreaView, Typo } from '@/components/ui';
import { isInternalArticleUrl } from '@/lib/articles/articleUrl';
import { type HeaderState, nextHeaderState } from '@/lib/articles/readerChrome';
import { loadArticle } from '@correctiv/app-core/articles/load';
import type { Article } from '@correctiv/app-core/articles/types';
import { readerHtml } from '@/lib/articles/reader';
import { goBack } from '@/lib/navigation/goBack';
import { shareArticle } from '@/lib/shareArticle';
import { useCoreActions, useIsSaved, useTextScale } from '@/lib/store/core';
import { sizes, useColors, useIsDark } from '@/lib/theme';

/**
 * Article reader: full-page webview over cleaned-up article HTML (token CSS and
 * embedded fonts, so it works offline). Native overlay header for back and save.
 *
 * Links are intercepted: a correctiv.org article pushes another reader, anything
 * else goes to the system browser. There used to be a third case, `correctiv://join`,
 * for a button in the reader's second footer; ADR 0018 removed the footer, and a test
 * in the core now asserts the scheme never reaches a document again.
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
  // Both are read per render, never snapshotted: the appearance has to reach the
  // reader's colour block, and the text-size setting its root font size.
  const textScale = useTextScale();
  const isDark = useIsDark();

  /**
   * The overlay header gets out of the way when the reader scrolls down, and comes
   * back on the way up.
   *
   * It floats over the article rather than pushing it down, which is deliberate and
   * right for the hero image. Past the hero it was covering the text instead: a
   * headline read "zeniert" because the back chevron sat on "insz", in both colour
   * schemes and at every scroll position, which is the reading state rather than an
   * edge case.
   */
  const [header, setHeader] = useState<HeaderState>('floating');
  const headerHidden = header === 'hidden';
  const lastOffset = useRef(0);
  const headerOpacity = useRef(new Animated.Value(1)).current;

  const onReaderScroll = useCallback((offsetY: number) => {
    const previous = lastOffset.current;
    lastOffset.current = offsetY;
    setHeader((current) => nextHeaderState(current, previous, offsetY));
  }, []);

  // A new article starts at the top, so the header starts visible.
  useEffect(() => {
    lastOffset.current = 0;
    setHeader('floating');
  }, [url, attempt]);

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: headerHidden ? 0 : 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [headerHidden, headerOpacity]);

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
    <View className="flex-1 bg-canvas">
      {article ? (
        <ReaderView
          html={readerHtml(article, { textScale, isDark })}
          onNavigate={onNavigate}
          onScroll={onReaderScroll}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-m">
          {error ? (
            <>
              <Typo variant="headline-s" className="text-center">
                Artikel konnte nicht geladen werden
              </Typo>
              <Typo variant="text-m" color="on-canvas-muted" className="mt-2xs text-center">
                {title ?? 'Vielleicht hilft ein zweiter Versuch.'}
              </Typo>
              <View className="mt-m flex-row gap-s">
                <Button title="Erneut versuchen" onPress={() => setAttempt((n) => n + 1)} />
                {url ? (
                  <Button
                    title="Im Browser öffnen"
                    variant="outline"
                    onPress={() => Linking.openURL(url)}
                  />
                ) : null}
              </View>
            </>
          ) : (
            <ActivityIndicator color={colors.accent} />
          )}
        </View>
      )}

      {/* Overlay header: it floats over the hero image rather than pushing it down.
          Past the hero it would sit on the text instead, so two things happen there.
          It fades out on the way down and back in on the way up, and while it is on
          text it carries the page surface instead of floating on it. `pointerEvents`
          follows the fade, or an invisible header would still swallow taps meant for
          the article. */}
      <Animated.View
        style={{ opacity: headerOpacity }}
        pointerEvents={headerHidden ? 'none' : 'box-none'}
        className="absolute left-0 right-0 top-0"
      >
        <SafeAreaView
          edges={['top']}
          className={header === 'onSurface' ? 'bg-canvas border-b border-stroke' : ''}
        >
          <View className="flex-row items-center justify-between px-s py-2xs">
            <HeaderButton icon="chevron-back" label="Zurück" onPress={goBack} />
            {url ? (
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
            ) : null}
          </View>
        </SafeAreaView>
      </Animated.View>
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
      className="items-center justify-center rounded-full border border-stroke bg-canvas active:opacity-70"
      style={{ width: sizes.iconButton, height: sizes.iconButton }}
    >
      <Ionicons name={icon} size={22} color={colors['on-canvas']} />
    </Pressable>
  );
}
