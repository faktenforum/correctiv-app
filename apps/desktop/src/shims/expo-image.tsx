// `expo-image`'s `Image`, on `Gtk.Picture`.
//
// One consumer in the app — `components/ui/Thumbnail.tsx` — and it is the component
// every cover, every episode tile and every video thumbnail goes through, so this is
// on the critical path for Home looking like anything at all.
//
// ## Why this is not React Native's `Image`
//
// `@gjsify/react-native` implements `Image` on `Gtk.Picture` and refuses anything but
// a local path, a `file:` URI or a `resource:` URI BY NAME. That refusal is correct
// — `Gtk.Picture` takes a `GFile` or a `GdkPaintable`, and neither is a URL — and it
// is exactly the gap ADR 0012 names as unanswered for this host ("remote-URL images:
// `Gtk.Picture` takes local paths, and the app is on `expo-image` rather than RN's
// `Image` in any case").
//
// The app's `uri` is never a local path. It is one of two things:
//
//   1. A `data:` URI, from the offline bundle. `npm run offline-articles` downscales
//      every cover and inlines it as base64, and `ContentBundle.image` hands those
//      back — so this is the path that Home actually renders offline, which is the
//      normal case for a demo with no network.
//   2. A remote `https:` URL from a live feed.
//
// Both are answered here: (1) decodes straight to a `Gdk.Texture`, (2) is fetched and
// then decoded. Nothing is cached beyond the process, so `cachePolicy` is accepted
// and ignored — named below rather than silently dropped.

import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

export type ContentFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

export interface ImageSource {
  uri?: string | null;
}

export interface ImageProps {
  source?: ImageSource | string | null;
  style?: Record<string, unknown>;
  contentFit?: ContentFit;
  /** Accepted; GTK cross-fades nothing here. See the header. */
  transition?: number;
  /** Accepted and ignored: this host holds no image cache. */
  cachePolicy?: string;
  recyclingKey?: string | null;
  onError?: () => void;
  className?: string;
  accessibilityLabel?: string;
}

/** expo-image's `contentFit` values are `Gtk.ContentFit`'s nicks, bar one. */
const CONTENT_FIT: Readonly<Record<ContentFit, string>> = {
  cover: 'cover',
  contain: 'contain',
  fill: 'fill',
  none: 'none',
  // GTK has no `scale-down`. `contain` never enlarges past the natural size either,
  // which is the half of the meaning that matters for a thumbnail.
  'scale-down': 'contain',
};

const uriOf = (source: ImageProps['source']): string | null => {
  if (typeof source === 'string') return source;
  if (source && typeof source === 'object') return source.uri ?? null;
  return null;
};

/**
 * `data:` / `https:` -> a `Gdk.Texture`, or `null` with a reason.
 *
 * Split out because the two schemes differ only in where the bytes come from, and
 * the decode is the part that can fail on either.
 */
async function loadTexture(uri: string): Promise<unknown> {
  const [{ default: Gdk }, { default: GLib }] = await Promise.all([
    import('gi://Gdk?version=4.0'),
    import('gi://GLib?version=2.0'),
  ]);

  let raw: Uint8Array;
  if (uri.startsWith('data:')) {
    const comma = uri.indexOf(',');
    if (comma === -1) throw new Error('a data: URI with no comma');
    const meta = uri.slice(5, comma);
    const payload = uri.slice(comma + 1);
    if (!meta.includes('base64')) {
      throw new Error(`only base64 data: URIs are decoded here, got "${meta}"`);
    }
    raw = Uint8Array.from(GLib.base64_decode(payload));
  } else {
    // `fetch` is gjsify's, and the core already depends on it for every feed.
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    raw = new Uint8Array(await response.arrayBuffer());
  }

  return Gdk.Texture.new_from_bytes(new GLib.Bytes(raw));
}

/**
 * A picture.
 *
 * `Gtk.Picture` renders a `GdkPaintable`, which has to be built before there is
 * anything to show, so this holds the texture in state and renders an empty `View`
 * until it arrives. That empty box is the same shape the loaded picture will be,
 * because the SIZE comes from the caller's `style`/`className` rather than from the
 * image — `Thumbnail` always frames it with an `aspectRatio` — so nothing reflows
 * when the bytes land.
 *
 * `onError` is reported for real. `Thumbnail` uses it to swap in its Ionicons
 * fallback glyph, and that is the difference between a broken cover looking like a
 * deliberate placeholder and looking like a bug.
 */
export function Image({
  source,
  contentFit = 'cover',
  onError,
  className,
  style,
  accessibilityLabel,
}: ImageProps) {
  const uri = uriOf(source);
  const [paintable, setPaintable] = useState<unknown>(null);

  // `onError` is deliberately NOT a dependency of the effect below: `Thumbnail` passes
  // a fresh arrow every render, so including it would restart the image load on each
  // one — a fetch per render for every cover on the screen. It is read through a ref so
  // the effect always calls the latest one.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (uri === null || uri === '') {
      setPaintable(null);
      return undefined;
    }
    let live = true;
    setPaintable(null);
    void loadTexture(uri)
      .then((texture) => {
        if (live) setPaintable(texture);
      })
      .catch((error: unknown) => {
        if (!live) return;
        // Loud: a cover that silently does not appear is indistinguishable from one
        // the feed never carried.
        console.error(`[desktop] expo-image: could not load "${uri.slice(0, 96)}":`, error);
        onErrorRef.current?.();
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see below
  }, [uri]);

  // The caller's pixel `style` (Thumbnail passes `{ width: '100%', height: '100%' }`)
  // has no widget property here; expanding on both axes is what it means inside a
  // frame that already has a size.
  const fillClass = style === undefined ? undefined : 'flex-1';
  const classes = [className, fillClass].filter(Boolean).join(' ') || undefined;

  if (paintable === null) {
    return <View className={classes} />;
  }
  return (
    <gtk-picture
      paintable={paintable as never}
      contentFit={CONTENT_FIT[contentFit] as never}
      canShrink
      hexpand
      vexpand
      {...(accessibilityLabel === undefined ? {} : { alternativeText: accessibilityLabel })}
    />
  );
}

/** expo-image's other exports, none of which the app imports. */
export const ImageBackground = Image;
export function useImage(): null {
  throw new Error(
    '[desktop] expo-image: `useImage` is not implemented on the GTK host. The app does ' +
      'not use it; add it to apps/desktop/src/shims/expo-image.tsx if that changes.',
  );
}
