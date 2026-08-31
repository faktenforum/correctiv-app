// The article reader, on the desktop.
//
// One of three routes that differ from the phone, and the ONLY reason it differs is
// `Animated`. Everything else in this file is `apps/mobile/src/app/artikel.tsx`
// verbatim, deliberately kept line-for-line so a `diff` between the two is short
// enough to read in a review.
//
// ## Why a whole variant for one prop
//
// `@gjsify/react-native` exports `Animated` as a refusing value: ADR 0032 puts it at
// tier P3 with the reason "genuinely mappable, but it is a subsystem rather than a
// component — doing it badly is worse than not doing it" (the GTK counterparts are
// `Adw.TimedAnimation` and `Adw.SpringAnimation`). There is no prop-level shim that
// helps, because the import itself is what has no implementation, and this app's whole
// use of the subsystem is one value driving one opacity:
//
//   const headerOpacity = useRef(new Animated.Value(1)).current;
//   Animated.timing(headerOpacity, { toValue: headerHidden ? 0 : 1, duration: 160 })
//   <Animated.View style={{ opacity: headerOpacity }} …>
//
// ## What is different, exactly
//
// THE HEADER STILL HIDES AND COMES BACK. That behaviour lives in
// `nextHeaderState()` in the core-adjacent `lib/articles/readerChrome.ts`, which is
// pure logic and unchanged — the overlay header still gets out of the text's way when
// the article scrolls down, which is the fault it exists to fix (a headline reading
// "zeniert" because the back chevron sat on "insz").
//
// WHAT IS MISSING IS THE 160 ms FADE. It cuts instead. `pointerEvents` still follows
// the state, so a hidden header does not swallow taps meant for the article — that was
// never the animation's job, and dropping it would have been the silent half of this
// change.
//
// An `Adw.TimedAnimation` on the widget's `opacity` would be the faithful mapping and
// it belongs upstream, in the subsystem, not open-coded here: a per-screen animation
// helper in an application is how a framework gap becomes permanent.

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { ReaderView } from '@/components/reader/ReaderView';
import { Button, SafeAreaView, Typo } from '@/components/ui';
import { isInternalArticleUrl } from '@/lib/articles/articleUrl';
import { type HeaderState, nextHeaderState } from '@/lib/articles/readerChrome';
import { loadArticle } from '@correctiv/app-core/articles/load';
import type { Article } from '@correctiv/app-core/articles/types';
import { readerHtml } from '@/lib/articles/reader';
import { goBack } from '@/lib/navigation/goBack';
import { shareArticle } from '@/lib/shareArticle';
import { useCoreActions, useIsMember, useIsSaved, useTextScale } from '@/lib/store/core';
import { sizes, useColors, useIsDark } from '@/lib/theme';

/**
 * Article reader: full-page WebKitGTK view over cleaned-up article HTML (token CSS and
 * embedded fonts, so it works offline). Overlay header for back, share and save.
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
  const saved = useIsSaved(url ?? '');
  const isMember = useIsMember();
  const textScale = useTextScale();
  const isDark = useIsDark();

  /**
   * The overlay header gets out of the way when the reader scrolls down, and comes
   * back on the way up. It floats over the article rather than pushing it down, which
   * is right for the hero image and wrong past it — hence the third state, where it
   * carries the page surface instead of floating on it.
   */
  const [header, setHeader] = useState<HeaderState>('floating');
  const headerHidden = header === 'hidden';
  const lastOffset = useRef(0);

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
          onScroll={onReaderScroll}
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
            <ActivityIndicator color={colors.emphasis} />
          )}
        </View>
      )}

      {/*
        The phone wraps this in an `<Animated.View style={{ opacity: headerOpacity }}>`
        that fades over 160 ms. Here it is a plain `<View>` that is simply not rendered
        while the header is hidden, so the transition cuts. See the file header.

        Not rendered at all, rather than rendered with `opacity-0`: an invisible header
        would still be in the layout and still take the taps, and `pointerEvents` is
        the prop that used to prevent that. Removing it from the tree answers both at
        once and is the honest spelling of "it is not there".
      */}
      {headerHidden ? null : (
        <View className="absolute left-0 right-0 top-0">
          <SafeAreaView
            edges={['top']}
            className={header === 'onSurface' ? 'bg-grey-100 border-b border-grey-300' : ''}
          >
            <View className="flex-row items-center justify-between px-s py-2xs">
              <HeaderButton icon="chevron-back" label="Zurück" onPress={goBack} />
              {url ? (
                <View className="flex-row gap-2xs">
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
        </View>
      )}
    </View>
  );
}

/**
 * Opaque with a hairline, not translucent — the phone's comment explains why (a
 * translucent control vanished against the article's white background and left the
 * chevron sitting inside a word).
 *
 * ONE DIFFERENCE ON THIS HOST, and it is invisible: `hitSlop={8}` is dropped by
 * `src/shims/react-native.tsx`, because GTK hit-tests a widget's allocation and cannot
 * grow it. An 8 px touch-target concession has nothing to buy on a platform whose
 * pointer is a mouse, and the button's own `sizes.iconButton` box is the real target.
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
      accessibilityRole="button"
      accessibilityLabel={label}
      className="items-center justify-center rounded-full border border-grey-300 bg-grey-100 active:opacity-70"
      style={{ width: sizes.iconButton, height: sizes.iconButton }}
    >
      <Ionicons name={icon} size={22} color={colors['grey-700']} />
    </Pressable>
  );
}
