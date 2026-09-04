// The article reader, on the desktop.
//
// One of three routes that differ from the phone, and the only reason it differs is
// still the reader header's fade — but the reason for THAT changed on 2026-09-03 and
// is worth reading before anyone deletes this file. Everything else here is
// `apps/mobile/src/app/artikel.tsx` verbatim, kept line-for-line so a `diff` between
// the two is short enough to read in a review.
//
// ## It is no longer that `Animated` is missing
//
// It was, until @gjsify/react-native 0.46. `Animated` was a refusing export at tier
// P3, and `test/support-gate.test.ts` went red on the upgrade to say the variant could
// go — which is exactly what that assertion is for. 0.46 implements the three names
// this app uses: `new Animated.Value(n)`, `Animated.timing(…).start()` and
// `<Animated.View style={{ opacity }}>`.
//
// ## What stops it is `absolute` on an `Animated.View`
//
// The phone's overlay header is `<Animated.View className="absolute left-0 right-0
// top-0">` inside a `<View className="flex-1">`. On this host that throws:
//
//   <View> absolute — positions this element on top of its parent, so the PARENT has
//   to be a `Gtk.Overlay` — and it is not.
//
// A `View` becomes a `Gtk.Overlay` as soon as one of its children is absolutely
// positioned; that is `overlayOnAbsoluteChild` in the layer's primitive table, and
// four primitives declare it. `Animated` is not in that table at all, so an
// `Animated.View` child does not make its parent an overlay the way a `View` child
// does — MEASURED: swapping this file's plain `<View className="absolute …">` for the
// phone's `<Animated.View>` is the only change needed to reproduce it.
//
// So the two features are individually supported and do not compose, which is a
// narrower gap than the one this file was written for and a real one. It belongs
// upstream, in the primitive table, not open-coded here.
//
// ## What is different, exactly
//
// THE HEADER STILL HIDES AND COMES BACK. That behaviour lives in `nextHeaderState()`
// in `lib/articles/readerChrome.ts`, which is pure logic and unchanged — the overlay
// header still gets out of the text's way when the article scrolls down, which is the
// fault it exists to fix (a headline reading "zeniert" because the back chevron sat on
// "insz").
//
// WHAT IS MISSING IS THE 160 ms FADE. It cuts instead: the header is not rendered
// while hidden, rather than rendered at `opacity-0`, so an invisible header cannot
// swallow taps meant for the article — which is what `pointerEvents` does on the
// phone.

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
import { useCoreActions, useIsSaved, useTextScale } from '@/lib/store/core';
import { sizes, useColors, useIsDark } from '@/lib/theme';

import { webViewIsOsOverlay } from '../platform/webview.js';

/**
 * Article reader: full-page WebKitGTK view over cleaned-up article HTML (token CSS and
 * embedded fonts, so it works offline). Overlay header for back, share and save.
 *
 * Links are intercepted: a correctiv.org article pushes another reader, anything else
 * goes to the system browser. There used to be a third case, `correctiv://join`, for a
 * button in the reader's second footer; ADR 0018 removed the footer, and a test in the
 * core now asserts the scheme never reaches a document again.
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
  // Can anything be drawn OVER the reader on this platform? On Windows the web view is
  // a child window the OS composites on top of the application, so no. See
  // `platform/webview.ts` for the measurement and the trigger that removes this.
  const overlayHeader = !webViewIsOsOverlay();
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

  // Ordered rather than positioned, because on one platform the web view cannot be
  // overlaid at all — see `platform/webview.ts`. Where it can, the header floats over
  // the article the way the phone's does; where it cannot, it is a strip ABOVE the
  // document, which is the shape gjsify's own guide names as the one that works.
  //
  // And where it is a strip it stays PUT. Hiding it on scroll is what makes an overlay
  // header pleasant and what would make a strip jump the article by its own height on
  // every scroll direction change — the same state machine, opposite effect.
  const headerStrip = (
    <View className={overlayHeader ? 'absolute left-0 right-0 top-0' : ''}>
      <SafeAreaView
        edges={['top']}
        className={
          // Floating, the header only carries the page surface once it has left the
          // hero image behind — that is what `onSurface` means. As a strip it is
          // always on the surface, because it always has the document under it.
          !overlayHeader || header === 'onSurface' ? 'bg-canvas border-b border-stroke' : ''
        }
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
  );

  return (
    <View className="flex-1 bg-canvas">
      {overlayHeader ? null : headerStrip}
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
      {/*
        The FLOATING header, and only where one is possible — the strip case rendered
        above, before the document, and stays put.

        The phone wraps this in an `<Animated.View style={{ opacity: headerOpacity }}>`
        that fades over 160 ms. Here it is a plain `<View>` that is simply not rendered
        while the header is hidden, so the transition cuts. See the file header.

        Not rendered at all, rather than rendered with `opacity-0`: an invisible header
        would still be in the layout and still take the taps, and `pointerEvents` is
        the prop that used to prevent that. Removing it from the tree answers both at
        once and is the honest spelling of "it is not there".
      */}
      {overlayHeader && !headerHidden ? headerStrip : null}
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
      className="items-center justify-center rounded-full border border-stroke bg-canvas active:opacity-70"
      style={{ width: sizes.iconButton, height: sizes.iconButton }}
    >
      <Ionicons name={icon} size={22} color={colors['on-canvas']} />
    </Pressable>
  );
}
