// `@expo/vector-icons`' `Ionicons`, mapped onto GTK symbolic icon names.
//
// The app draws with exactly one family — 33 `<Ionicons>` elements across 24 files,
// and no other family anywhere — so this shim answers that one name and refuses the
// rest by name rather than pretending to be the whole package.
//
// WHY A TABLE AND NOT A TRANSLITERATION. Ionicons ships ~1300 glyphs; the Adwaita
// icon theme on this machine ships 586 symbolic ones, and the two vocabularies do
// not correspond. A generated mapping would therefore be wrong in the interesting
// cases and right in the boring ones. So this table is hand-written, covers every
// name the app actually passes, and each entry was checked against the installed
// theme rather than guessed — a name GTK cannot resolve renders as a broken-image
// glyph, which is a visible defect with nothing pointing at its cause.
//
// The four that are approximations rather than counterparts are marked. GTK has no
// compass and no share glyph, and saying so here is cheaper than someone later
// reading `find-location-symbolic` on the Discover tab as a bug.
//
// AN UNMAPPED NAME IS LOUD, NOT SILENT. It logs the Ionicon name and renders
// `dialog-question-symbolic`, so it is visible in the window AND attributable in the
// console. It deliberately does not throw: one missing glyph should not take down a
// screen in a feasibility build, and GTK's own failure mode for this is exit 0 with
// a broken image and no message at all — which is the thing being improved on.

import { classForColor } from '../style/sheet.js';

/**
 * Ionicon name -> Adwaita symbolic icon name.
 *
 * Every value verified present in /usr/share/icons/Adwaita on the development
 * machine. `~` marks a deliberate approximation, not a counterpart.
 */
const IONICON_TO_SYMBOLIC: Readonly<Record<string, string>> = {
  // Navigation
  'chevron-back': 'go-previous-symbolic',
  'chevron-forward': 'go-next-symbolic',
  close: 'window-close-symbolic',
  search: 'system-search-symbolic',
  'home-outline': 'go-home-symbolic',
  home: 'go-home-symbolic',
  // ~ GTK has no compass. A location pin is the nearest thing that reads as
  // "go and look around" rather than as a different action.
  'compass-outline': 'find-location-symbolic',
  compass: 'find-location-symbolic',
  'person-outline': 'avatar-default-symbolic',
  person: 'avatar-default-symbolic',
  'people-outline': 'system-users-symbolic',
  people: 'system-users-symbolic',
  // Media
  play: 'media-playback-start-symbolic',
  pause: 'media-playback-pause-symbolic',
  'play-circle': 'media-playback-start-symbolic',
  'play-circle-outline': 'media-playback-start-symbolic',
  'headset-outline': 'audio-headphones-symbolic',
  headset: 'audio-headphones-symbolic',
  'radio-outline': 'audio-x-generic-symbolic',
  radio: 'audio-x-generic-symbolic',
  'videocam-outline': 'camera-video-symbolic',
  'mic-outline': 'audio-input-microphone-symbolic',
  // State
  checkmark: 'object-select-symbolic',
  // `emblem-ok-symbolic` is NOT in this theme; the plain check is.
  'checkmark-circle': 'object-select-symbolic',
  'ellipse-outline': 'radio-symbolic',
  checkbox: 'object-select-symbolic',
  heart: 'emote-love-symbolic',
  bookmark: 'user-bookmarks-symbolic',
  'bookmark-outline': 'bookmark-new-symbolic',
  // Content
  'document-text-outline': 'text-x-generic-symbolic',
  'book-outline': 'text-x-generic-symbolic',
  'image-outline': 'image-x-generic-symbolic',
  'camera-outline': 'camera-photo-symbolic',
  'location-outline': 'find-location-symbolic',
  'sparkles-outline': 'starred-symbolic',
  'megaphone-outline': 'user-available-symbolic',
  // Actions
  // ~ `open-outline` means "leaves the app". A browser is what it actually does here.
  'open-outline': 'web-browser-symbolic',
  // ~ GTK has no share glyph; `send-to` is the desktop idiom for the same intent,
  // and matches what `Share` does on this host (it copies the link).
  'share-outline': 'send-to-symbolic',
  'settings-outline': 'preferences-system-symbolic',
};

/** What an unmapped name renders as. Present in the theme, and obviously not right. */
const UNMAPPED = 'dialog-question-symbolic';

const reported = new Set<string>();

function symbolicFor(name: string): string {
  const mapped = IONICON_TO_SYMBOLIC[name];
  if (mapped !== undefined) return mapped;
  // Once per name: this renders inside a list row, and a per-frame log would bury
  // the rest of the console.
  if (!reported.has(name)) {
    reported.add(name);
    console.error(
      `[desktop] Ionicons: no GTK symbolic icon is mapped for "${name}". Rendering ` +
        `"${UNMAPPED}". Add it to apps/desktop/src/shims/vector-icons.tsx, checking the ` +
        'name against `gtk4-icon-browser` first.',
    );
  }
  return UNMAPPED;
}

/**
 * The `name` prop's type.
 *
 * Five sites in the app write `keyof typeof Ionicons.glyphMap`, so `glyphMap` has to
 * be a real object with the right keys rather than a type-only declaration. It holds
 * the mapping's own keys, which means an icon the app asks for that this table does
 * not carry is a TYPE error at those five sites — the earliest place it can be
 * caught.
 */
export const glyphMap = IONICON_TO_SYMBOLIC;

export type IoniconName = keyof typeof IONICON_TO_SYMBOLIC;

export interface IoniconsProps {
  name: IoniconName | (string & {});
  size?: number;
  color?: string;
  className?: string;
}

/**
 * A symbolic icon.
 *
 * Rendered as gtk-host's intrinsic `gtk-image` rather than through a React Native
 * primitive, because there is no React Native name for "a themed icon": RN's
 * `Image` is a bitmap and maps to `Gtk.Picture`, which cannot take an icon name.
 * This is the one place the desktop host reaches past the React Native vocabulary,
 * and it is reaching for a widget that vocabulary has no word for.
 *
 * `color` becomes a minted CSS class, because a symbolic icon takes its colour from
 * the CSS `color` property and `Gtk.Image` exposes no property for it.
 */
export function Ionicons({ name, size = 24, color, className }: IoniconsProps) {
  const colorClass = classForColor('color', color);
  const cssClasses = [colorClass, className].filter((entry): entry is string => Boolean(entry));
  return (
    <gtk-image
      iconName={symbolicFor(name)}
      pixelSize={size}
      {...(cssClasses.length > 0 ? { cssClasses } : {})}
    />
  );
}

Ionicons.glyphMap = glyphMap;

/**
 * Every other family, refused by name.
 *
 * The app imports none of them, and a stub that rendered nothing would turn a future
 * `<MaterialIcons>` into an invisible gap instead of a build error.
 */
const refuse = (family: string) => () => {
  throw new Error(
    `[desktop] @expo/vector-icons: "${family}" is not mapped on the GTK host. Only ` +
      'Ionicons is, because it is the only family this app draws with. Map it in ' +
      'apps/desktop/src/shims/vector-icons.tsx if that changes.',
  );
};

export const MaterialIcons = refuse('MaterialIcons');
export const MaterialCommunityIcons = refuse('MaterialCommunityIcons');
export const FontAwesome = refuse('FontAwesome');
export const Feather = refuse('Feather');
export const AntDesign = refuse('AntDesign');
export const Entypo = refuse('Entypo');
export const Octicons = refuse('Octicons');
export const SimpleLineIcons = refuse('SimpleLineIcons');
