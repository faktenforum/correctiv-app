// `react-native`, as this host answers it.
//
// The build aliases the bare `react-native` specifier here rather than straight to
// `@gjsify/react-native`, and this file is the entire reason why: the app passes six
// prop families that the GTK layer refuses BY NAME, in 110 places, and every one of
// those refusals is correct. This is where each of them gets a deliberate answer,
// once, instead of 110 times.
//
// Everything else is re-exported untouched, including the refusing exports — so
// `Animated` is still a loud throw naming its tier rather than an undefined import.
//
// ## The six, what each one is, and what happens to it here
//
// | prop | uses | GTK's refusal | this host |
// |---|---|---|---|
// | `accessibilityLabel` | 46 | not a widget property; `Gtk.Accessible.update_property()` is an imperative call | IMPLEMENTED, through a ref |
// | `accessibilityState` | 6 | as above | IMPLEMENTED (`selected`/`checked`/`disabled`) |
// | `accessibilityRole` | 41 | as above | DROPPED — `accessible-role` is construct-only |
// | `hitSlop` | 13 | GTK hit-tests the allocation and cannot grow it | DROPPED, and correctly |
// | `pointerEvents="box-none"` | 4 | `can-target` is one boolean for a widget AND its subtree | mapped to `auto` |
// | `trackColor`/`thumbColor` | 2 | Adwaita paints a switch from the theme accent | DROPPED |
// | `placeholderTextColor` | 4 | the placeholder is a CSS SUBNODE, not a widget property | DROPPED — Adwaita already dims it |
// | `contentContainerClassName` | 10 | `<ScrollView>` has a content box; `<FlatList>` has none | merged into the list's own `className` |
// | `autoFocus` | 2 | `grab_focus()` only works once the widget is MAPPED | IMPLEMENTED, from the ref on `map` |
// | `autoComplete`/`textContentType` | 4 | autofill hints; a GTK app has no autofill service to hint AT | DROPPED — `keyboardType` and `secureTextEntry` already carry the purpose |
// | `submitBehavior` | 1 | it asks a soft keyboard to stay up, and there is none | DROPPED — Enter fires `onSubmitEditing` here either way |
// | `accessibilityLiveRegion` | 2 | GTK4 has no live-region property; its counterpart is imperative | DROPPED — see below |
//
// One entry is not a prop at all: `TextInput` is a CLASS in React Native, so it names
// a type as well as a value, and its ref carries `focus()`. The layer declares it as a
// function and hands over the bare widget, so `useRef<TextInput>(null)` does not
// compile and `ref.current.focus()` is `undefined is not a function`. Both are
// answered at the export near the bottom of this file, which says why only `focus` is.
//
// `hitSlop` is the one worth being explicit about, because dropping a prop is
// normally the failure mode this whole layer exists to prevent. It is an 8 px
// expansion of a TOUCH target — a concession to a fingertip, on a platform whose
// pointer is a mouse with single-pixel precision. There is nothing to preserve. The
// refusal exists to make someone decide rather than to forbid; this is the decision,
// made once and written down.
//
// `accessibilityRole` is the honest loss. GTK's `accessible-role` is set when the
// widget is constructed, and by the time a ref fires the widget exists — so a
// `Pressable` is announced as a button (which it is: a real `Gtk.Button`) but a
// `View` carrying `accessibilityRole="header"` is announced as a generic container.
// The label still lands, which is the part a screen-reader user needs most.
//
// `accessibilityLiveRegion` is the second loss, and the one to come back to. GTK4 has
// no property for it: the counterpart is `Gtk.Accessible.announce()` (4.14+), an
// imperative call that needs the MOMENT and the TEXT, and a declarative prop on a
// container carries neither. Both uses are on the door — the sign-in failure and the
// "we are checking" line — so a screen-reader user there is told nothing until the
// announcement is wired from the state change that causes it, which is app code
// rather than this file. Named here so it is a decision with a cost rather than a
// prop that quietly went missing.
//
// It is coming back sooner than from here: `@gjsify/react-native` is growing an answer
// on `Text`, through that same `Gtk.Accessible.announce()`. That is the right place for
// it — the layer holds the widget and sees the text change, and this file sees neither.
// When it lands, the row above becomes IMPLEMENTED and this paragraph goes with it.
// Check the door when it does, because both uses are there.

// Type-only: the values come from `gi://` at runtime, which resolves only inside a
// GTK process. `@girs/*` is the same vocabulary as data, so `tsc` can read it here.
import type Gtk from '@girs/gtk-4.0';
import type GObject from '@girs/gobject-2.0';

import {
  Children,
  createElement,
  Fragment,
  isValidElement,
  useCallback,
  useRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';

import {
  ActivityIndicator as BaseActivityIndicator,
  FlatList as BaseFlatList,
  Platform as BasePlatform,
  Pressable as BasePressable,
  ScrollView as BaseScrollView,
  Switch as BaseSwitch,
  Text as BaseText,
  TextInput as BaseTextInput,
  View as BaseView,
} from '@gjsify/react-native';

// Everything this file does not touch — including every refusing export, which is
// what keeps `import { Animated } from 'react-native'` a named error rather than
// `undefined`.
export * from '@gjsify/react-native';

// ---------------------------------------------------------------------------
// The type surface
// ---------------------------------------------------------------------------
//
// `@gjsify/react-native` types its props against what GTK can express, which is right
// for the layer and wrong for a drop-in `react-native`: the application is written
// against React Native's types and imports several names the layer does not export.
// Widening them here is the same trade as the prop normalisation above — the shim is
// the compatibility layer, so the compatibility belongs in it.
//
// Every widening below is a prop this file ANSWERS (accessibility, `onPress` on a
// `Text`) or a type-only name that costs nothing at runtime. None of them promises
// behaviour that is not implemented.

/** Style objects. Type-only in React Native too, so there is nothing to implement. */
export type ViewStyle = Record<string, unknown>;
export type TextStyle = Record<string, unknown>;
export type ImageStyle = Record<string, unknown>;
export type StyleProp<T> = T | null | undefined | false | ReadonlyArray<StyleProp<T>>;
export type ColorValue = string;

/**
 * `onLayout`'s event.
 *
 * Exported as a TYPE so `components/player/ProgressBar.tsx` compiles; the PROP is
 * refused by the layer (GTK reports allocation through
 * `Gtk.Widget.vfunc_size_allocate`, a subclass override rather than a signal) and is
 * dropped by `normalize` above. The consequence is named where it bites: the progress
 * bar cannot measure itself, so tap-to-seek has no width to work from.
 */
export interface LayoutChangeEvent {
  nativeEvent: { layout: { x: number; y: number; width: number; height: number } };
}

/** The accessibility props this file implements, as a mixin. */
export interface AccessibilityProps {
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  /** Used once, on the progress bar (`accessibilityRole="adjustable"`). */
  accessibilityValue?: { min?: number; max?: number; now?: number; text?: string };
  testID?: string;
}

export interface ViewProps extends AccessibilityProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  children?: ReactNode;
  ref?: Ref<unknown>;
  [key: string]: unknown;
}

export interface TextProps extends AccessibilityProps {
  className?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
  /** Implemented by wrapping in a `Pressable`, which is what the layer's refusal advises. */
  onPress?: () => void;
  children?: ReactNode;
  [key: string]: unknown;
}

/**
 * What React Native hands a press handler.
 *
 * `locationX`/`locationY` are the coordinates WITHIN the pressed element, and this host
 * does not have them: `onPress` routes to `Gtk.Button::clicked`, which carries no
 * position (a coordinate would need a `Gtk.GestureClick` controller, which is what ADR
 * 0032 puts at tier P3 as its own project).
 *
 * They are typed as present-but-zero rather than omitted, because omitting them would
 * make `components/player/ProgressBar.tsx` a type error in a file this host may not
 * edit. The CONSEQUENCE is real and named here: tap-to-seek on the progress bar reads
 * 0, so a tap seeks to the start of the track instead of to the tapped position. The
 * transport buttons and the position display are unaffected.
 */
export interface GestureResponderEvent {
  nativeEvent: {
    locationX: number;
    locationY: number;
    pageX: number;
    pageY: number;
  };
}

export interface ScrollViewProps extends ViewProps {
  horizontal?: boolean;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentContainerClassName?: string;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
}

export interface ActivityIndicatorProps extends AccessibilityProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
  animating?: boolean;
  color?: ColorValue;
  size?: 'small' | 'large' | number;
  [key: string]: unknown;
}

export interface TextInputProps extends AccessibilityProps {
  className?: string;
  style?: StyleProp<TextStyle>;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  placeholderTextColor?: ColorValue;
  multiline?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  keyboardType?: string;
  returnKeyType?: string;
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
  [key: string]: unknown;
}

export interface SwitchProps extends AccessibilityProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  trackColor?: { false?: ColorValue; true?: ColorValue };
  thumbColor?: ColorValue;
  ios_backgroundColor?: ColorValue;
  [key: string]: unknown;
}

/** `ListRenderItemInfo`, which two screens import for their `renderItem`. */
export interface ListRenderItemInfo<T> {
  item: T;
  index: number;
}

export interface FlatListProps extends AccessibilityProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
  data?: readonly unknown[] | null;
  renderItem?: (info: ListRenderItemInfo<never>) => ReactNode;
  keyExtractor?: (item: never, index: number) => string;
  ListHeaderComponent?: ReactNode;
  ListFooterComponent?: ReactNode;
  ListEmptyComponent?: ReactNode;
  contentContainerClassName?: string;
  ListHeaderComponentClassName?: string;
  ListFooterComponentClassName?: string;
  [key: string]: unknown;
}

/**
 * NO INDEX SIGNATURE on this one, and that is load-bearing.
 *
 * `components/ui/Button.tsx` builds its own props as
 * `Omit<PressableProps, 'children' | 'style'> & { … }`. `Omit` is
 * `Pick<T, Exclude<keyof T, K>>`, and when `T` has a `[key: string]: unknown` member,
 * `keyof T` includes `string` — so `Exclude` cannot remove anything, `Pick` keeps only
 * the index signature, and every named prop collapses to `unknown`. The symptom was
 * `disabled` being `unknown` inside a component that had declared it a boolean.
 *
 * So this interface names what it accepts. That is the right shape for the one props
 * type the app derives from.
 */
export interface PressableProps extends AccessibilityProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  /** Accepted and dropped — see `LayoutChangeEvent` for what that costs. */
  onLayout?: (event: LayoutChangeEvent) => void;
  children?: ReactNode;
  ref?: Ref<unknown>;
  key?: string | number;
}

/** The props this host answers itself. Removed before anything reaches L2. */
interface NormalizedProps {
  accessibilityLabel?: string;
  accessibilityRole?: string;
  accessibilityHint?: string;
  accessible?: boolean;
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  trackColor?: unknown;
  thumbColor?: unknown;
  onLayout?: (event: LayoutChangeEvent) => void;
  placeholderTextColor?: unknown;
  contentContainerClassName?: string;
  autoFocus?: boolean;
  ref?: Ref<unknown>;
  children?: ReactNode;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// The style-object bridge
// ---------------------------------------------------------------------------
//
// `className` and `style={{…}}` go through the SAME partition (ADR 0032 section 4),
// which is right — the object literals carry the class families' own property names.
// But they are not the same VOCABULARY: the partition routes 22 paint properties and
// 24 layout ones, and React Native's style surface is wider. A property neither half
// routes is a named throw, deliberately, because that front end has no class name to
// check against.
//
// Six of the app's style properties fall outside it. Each is translated to what GTK
// actually expresses, or dropped with a reason — never passed through to throw.
//
// The routed set, for reference while reading the table below:
//   paint  backgroundColor color opacity border{,Top,Right,Bottom,Left}Width
//          border{,TopLeft,TopRight,BottomLeft,BottomRight}Radius borderColor
//          fontSize fontWeight fontFamily fontStyle letterSpacing lineHeight
//          textDecorationLine textTransform
//   layout margin{Top,Bottom,Start,End,Left,Right} padding{Top,Right,Bottom,Left}
//          flexDirection flexGrow alignItems justifyContent alignSelf
//          gap columnGap rowGap width height overflow display position top

const styleReported = new Set<string>();

/**
 * React Native's `style={[a, b, false && c]}` -> one object, later winning.
 *
 * Not optional plumbing: `components/ui/Typo.tsx` passes
 * `style={[typography(variant), style]}`, and an array spread as an object gives the
 * partition properties named `"0"` and `"1"` — which it correctly refuses by name
 * ('"0" — is not a property the style partition routes'), from inside a `<Text>`,
 * taking the screen with it. React Native flattens; so does this.
 */
function flattenStyle(style: unknown): Record<string, unknown> | undefined {
  if (style === null || style === undefined || style === false) return undefined;
  if (Array.isArray(style)) {
    const merged: Record<string, unknown> = {};
    for (const entry of style) {
      const flat = flattenStyle(entry);
      if (flat !== undefined) Object.assign(merged, flat);
    }
    return Object.keys(merged).length > 0 ? merged : undefined;
  }
  if (typeof style !== 'object') return undefined;
  return style as Record<string, unknown>;
}

function reportStyle(property: string, message: string): void {
  if (styleReported.has(property)) return;
  styleReported.add(property);
  console.warn(`[desktop] style property "${property}": ${message}`);
}

/**
 * A React Native style object -> one the partition routes.
 *
 * Runs on the merged style, so a value computed by `lib/theme/typography.ts` (which
 * returns `fontFamily`, `fontSize`, `lineHeight` and `letterSpacing` — all routed) is
 * unaffected.
 */
function normalizeStyle(style: unknown): Record<string, unknown> | undefined {
  if (style === null || style === undefined || typeof style !== 'object') return undefined;
  const source = flattenStyle(style);
  if (source === undefined) return undefined;
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;

    switch (key) {
      // `flex: 1` is React Native's shorthand for "take the remaining main-axis
      // space", which is exactly `flexGrow: 1` and exactly GTK's `hexpand`/`vexpand`.
      // A factor other than 1 is refused by the partition itself (GTK has no flex
      // factor: a box gives every expanding child an equal share), so it is reported
      // rather than rounded.
      case 'flex':
        if (value === 1) out.flexGrow = 1;
        else
          reportStyle(
            'flex',
            `GTK has no flex factor, only "expands or does not". flex: ${String(value)} was dropped; use flex: 1, or gap-*.`,
          );
        break;

      // `width-request`/`height-request` ARE minimums in GTK — "at least this" is
      // the property's own meaning — so this is an exact translation rather than an
      // approximation.
      case 'minWidth':
        out.width = value;
        break;
      case 'minHeight':
        out.height = value;
        break;

      // The physical pair. `marginHorizontal` has no single GTK property, and the
      // partition refuses a physical and a logical margin together, so it becomes the
      // two physical edges.
      //
      // A NEGATIVE VALUE IS DROPPED, and the reason is measured rather than assumed.
      // The first version of this branch passed it through on the theory that GTK
      // margins are unsigned and would clamp to 0. They are not: `margin-left` is a
      // plain int, the negative value reaches the measurement, and GTK reports
      //
      //   Gtk-WARNING **: GtkBox (box) reported min width -48, but sizes must be >= 0
      //
      // four times per render — a broken measurement rather than a clamp. So it is
      // dropped here, which IS the clamp that GTK does not do.
      //
      // The visible loss is real: `components/ui/Bleed.tsx` is
      // `marginHorizontal: -24`, whose whole job is to let a Rail run to the window
      // edge past the screen's `px-m`. On this host a Rail stops at the screen
      // padding instead. Reported once so it is attributable, because "the carousel
      // is inset by 24px" is otherwise a mysterious design difference.
      case 'marginHorizontal':
        if (typeof value === 'number' && value < 0) {
          reportStyle(
            'marginHorizontal',
            `GTK does not clamp a negative margin — it measures with it and reports "min width ${value * 2}, but sizes must be >= 0" — so the negative bleed (${value}px) was dropped. A Rail stops at the screen padding instead of running to the window edge.`,
          );
          break;
        }
        out.marginLeft = value;
        out.marginRight = value;
        break;
      case 'marginVertical':
        out.marginTop = value;
        out.marginBottom = value;
        break;
      case 'paddingHorizontal':
        out.paddingLeft = value;
        out.paddingRight = value;
        break;
      case 'paddingVertical':
        out.paddingTop = value;
        out.paddingBottom = value;
        break;

      // `border: 0` / `border: 'none'` is a DOM spelling that reached a couple of
      // shared files; the partition's name for it is `borderWidth`.
      case 'border':
        out.borderWidth = value;
        break;

      // GTK has no aspect-ratio property on a box. `Gtk.AspectFrame` is the widget
      // that does this, which is a different widget rather than a property on this
      // one — so it would be a primitive of its own, not a translation. Used once,
      // on the video stage, which is a placeholder here anyway.
      case 'aspectRatio':
        reportStyle(
          'aspectRatio',
          'GTK expresses this as a Gtk.AspectFrame — a different widget, not a property — so it was dropped. The element sizes to its content instead.',
        );
        break;

      // `top`, `right`, `bottom` and `left` are all routed (28 layout properties, read
      // out of the installed build rather than guessed — an earlier version of this
      // file dropped three of them on the belief that only `top` was there, which
      // would have silently unpinned every absolutely positioned child). They need no
      // branch: the default case passes them through.

      default:
        // Percentages are refused by the partition by name ("GTK has no percentage
        // size: a widget requests a MINIMUM in pixels or expands to fill"), and the
        // message is right — but it arrives as a throw that takes down the screen.
        // `w-full`/`h-full` are the class spellings that DO have an exact meaning.
        if (typeof value === 'string' && value.endsWith('%')) {
          reportStyle(
            `${key}: %`,
            `GTK has no percentage size. "${value}" was dropped; use the w-full / h-full classes, which map to hexpand/vexpand.`,
          );
          break;
        }
        out[key] = value;
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

let accessibilityReported = false;

/**
 * Apply what GTK expresses of React Native's accessibility props to a real widget.
 *
 * Wrapped once in a guard, and that guard is not defensive padding: this is an FFI
 * boxing path. `Gtk.Accessible.update_property` takes an array of `GObject.Value`,
 * which has to be constructed and typed by hand in GJS, and a mismatch throws from
 * inside the introspection layer. A throw here would come out of a `ref` callback
 * during commit and take down the whole tree, for a label. So it is caught, reported
 * ONCE with the reason, and the widget renders without it.
 */
/**
 * `autoFocus` — `Gtk.Widget.grab_focus()`, at the moment it actually works.
 *
 * L2 refuses the prop and says why: focus is an imperative call, and it only takes
 * once the widget is MAPPED, which is a moment a declarative layer does not own. The
 * refusal also names the remedy — "call it from a ref in an effect" — and a ref is
 * exactly what this file already has for `accessibilityLabel`, so the answer costs one
 * helper rather than a change one layer down.
 *
 * Both cases are needed, not just the deferred one: a widget can already be mapped by
 * the time the ref fires (a search field on a screen that is being re-entered), and
 * connecting to `map` there would wait for a signal that has already passed.
 *
 * The handler disconnects itself. `autoFocus` means "when this appears", once — a
 * field that stole the focus back every time its window was re-shown would be a
 * different and worse behaviour.
 *
 * SYNCHRONOUS, and unlike `applyAccessibility` it imports nothing. That function needs
 * `Gtk` as a VALUE — `Gtk.AccessibleProperty.LABEL` is an enum member — so it pays for
 * a dynamic import. This one only calls methods on a widget it was handed, so the
 * structural type below is the whole dependency. The first version copied the import
 * anyway and bound a `Gtk` it used only in a type position, which the linter caught.
 */
function applyAutoFocus(widget: unknown, autoFocus: boolean | undefined): void {
  if (widget === null || widget === undefined || autoFocus !== true) return;

  const target = widget as {
    get_mapped(): boolean;
    grab_focus(): boolean;
    connect(signal: string, handler: () => void): number;
    disconnect(handler: number): void;
  };

  try {
    if (target.get_mapped()) {
      target.grab_focus();
      return;
    }
    let handler = 0;
    handler = target.connect('map', () => {
      target.disconnect(handler);
      target.grab_focus();
    });
  } catch (error) {
    // Reported rather than swallowed: a field that silently does not take focus is
    // the failure this layer refuses props to prevent.
    console.warn('[desktop] autoFocus: could not focus the widget:', error);
  }
}

function applyAccessibility(widget: unknown, props: NormalizedProps): void {
  if (widget === null || widget === undefined) return;
  const { accessibilityLabel, accessibilityState } = props;
  if (accessibilityLabel === undefined && accessibilityState === undefined) return;

  void (async () => {
    try {
      const [{ default: Gtk }, { default: GObject }] = await Promise.all([
        import('gi://Gtk?version=4.0'),
        import('gi://GObject?version=2.0'),
      ]);
      const target = widget as Gtk.Widget;

      if (accessibilityLabel !== undefined) {
        const value = new GObject.Value();
        value.init(GObject.TYPE_STRING);
        value.set_string(accessibilityLabel);
        target.update_property([Gtk.AccessibleProperty.LABEL], [value]);
      }

      if (accessibilityState !== undefined) {
        const states: Gtk.AccessibleState[] = [];
        const values: GObject.Value[] = [];
        /**
         * SELECTED and CHECKED are `Gtk.AccessibleTristate`, not booleans.
         *
         * Measured: a `G_TYPE_BOOLEAN` GValue here produces four
         * `GLib-GObject-CRITICAL **: g_value_get_int: assertion 'G_VALUE_HOLDS_INT
         * (value)' failed` — GTK reads the tristate as an int, so the GValue has to
         * hold one. FALSE = 0, TRUE = 1, MIXED = 2.
         */
        const tristate = (flag: boolean) => {
          const value = new GObject.Value();
          value.init(GObject.TYPE_INT);
          value.set_int(flag ? Gtk.AccessibleTristate.TRUE : Gtk.AccessibleTristate.FALSE);
          return value;
        };
        if (accessibilityState.selected !== undefined) {
          states.push(Gtk.AccessibleState.SELECTED);
          values.push(tristate(accessibilityState.selected));
        }
        if (accessibilityState.checked !== undefined) {
          states.push(Gtk.AccessibleState.CHECKED);
          values.push(tristate(accessibilityState.checked));
        }
        if (states.length > 0) target.update_state(states, values);
        // `disabled` is deliberately not routed: the app always passes it together
        // with the `disabled` prop, which L2 already maps to `sensitive` — and GTK
        // derives the accessible state from sensitivity itself. Setting both would
        // be two sources for one fact.
      }
    } catch (error) {
      if (!accessibilityReported) {
        accessibilityReported = true;
        console.error(
          '[desktop] accessibility props could not be applied to a widget (this is ' +
            'reported once). Labels will be missing for screen readers; the UI is ' +
            'otherwise unaffected. Cause:',
          error,
        );
      }
    }
  })();
}

// ---------------------------------------------------------------------------
// The className bridge: two utilities GTK refuses, answered structurally
// ---------------------------------------------------------------------------

/**
 * `justify-between` -> a spacer child between every pair.
 *
 * The refusal is a good one and its message names the fix: "GTK's box has no
 * main-axis justification ... Spell the distribution with a spacer child (`flex-1`)".
 * ADR 0032 section 6 adds why a property cannot answer it — the mapping is
 * `Gtk.CenterBox`, a different WIDGET, and WHICH widget depends on the child count,
 * which the property resolver has no children to count.
 *
 * This layer does have the children, so it does the thing the message asks for: strip
 * the utility and interleave `<View className="flex-1" />` between the children. That
 * is not an approximation of `space-between` — it is what `space-between` IS: equal
 * expanding gaps between items, with none at the ends.
 *
 * Nine call sites, every one of them a header or a row with a label on the left and an
 * action on the right.
 */
const SPACER_KEY = '__gjsify_between_spacer__';

/**
 * `flex-wrap` -> stripped, loudly.
 *
 * A genuine GTK refusal rather than a gap in the vocabulary: `Gtk.Box` lays its
 * children on one line and cannot wrap. The widget that wraps is `Gtk.FlowBox`, which
 * is a different container with a different child model — so, like `justify-between`,
 * it is a widget question rather than a property one.
 *
 * Three call sites, all of them chip rows (`beitreten`, `onboarding`,
 * `ArticleRow`'s metadata line). The visible consequence is that a long row of chips
 * runs off the edge instead of flowing onto a second line.
 *
 * fixed upstream in gjsify: flex-wrap becomes a FlowBox intent — remove this branch
 * on the next bump, and the spacer branch above stays.
 */
function bridgeClassName(className: unknown): { className?: string; between: boolean } {
  if (typeof className !== 'string' || className === '') {
    return { className: className as string | undefined, between: false };
  }
  let between = false;
  const kept: string[] = [];
  for (const token of className.split(/\s+/)) {
    if (token === '') continue;
    if (token === 'justify-between') {
      between = true;
      continue;
    }
    if (token === 'flex-wrap') {
      reportStyle(
        'flex-wrap',
        'Gtk.Box cannot wrap — Gtk.FlowBox is the widget that does, which is a different container. Stripped: a long row runs off the edge instead of flowing onto a second line.',
      );
      continue;
    }
    kept.push(token);
  }
  return { className: kept.length > 0 ? kept.join(' ') : undefined, between };
}

/**
 * Strip what this host answers itself, and translate what it can.
 *
 * Returns the props L2 may see. The accessibility values are handed back separately
 * because they are applied to the WIDGET rather than passed as props.
 */
function normalize(
  props: NormalizedProps,
  displayName: string,
): {
  passthrough: Record<string, unknown>;
  accessibility: NormalizedProps;
} {
  const {
    accessibilityLabel,
    accessibilityRole: _role,
    accessibilityHint: _hint,
    accessible: _accessible,
    accessibilityState,
    hitSlop: _hitSlop,
    trackColor: _trackColor,
    thumbColor: _thumbColor,
    onLayout: _onLayout,
    // The placeholder's colour lives on a CSS SUBNODE (`entry > text > placeholder`),
    // not on a widget property, so there is nothing for L2 to route it to and it
    // refuses by name. Dropping it is the right answer here rather than a concession:
    // every use passes `grey-500`, which is what Adwaita already paints a placeholder,
    // so the widget without the prop looks like the design with it.
    placeholderTextColor: _placeholderTextColor,
    // The two autofill hints, and they are the same hint twice: `autoComplete` is
    // React Native's cross-platform spelling, `textContentType` the iOS one. Both name
    // a field to a CREDENTIAL STORE, and a GTK application has none to name it to —
    // there is no autofill service on this platform, so there is nothing to route them
    // to and nothing lost by dropping them. What they also carry, the purpose of the
    // field, is carried again by props L2 does answer: the door passes
    // `keyboardType="email-address"` beside `autoComplete="email"`, and
    // `secureTextEntry` beside `autoComplete="password"`.
    autoComplete: _autoComplete,
    textContentType: _textContentType,
    // `submitBehavior="submit"` means "fire onSubmitEditing and leave the keyboard
    // up". There is no soft keyboard to leave up, and Enter in a `Gtk.Entry` already
    // emits `activate` without taking focus anywhere — so the behaviour it asks for is
    // what this host does anyway.
    submitBehavior: _submitBehavior,
    // No GTK property expresses it; see the note in this file's header for what the
    // counterpart is and what dropping it costs on the door.
    accessibilityLiveRegion: _accessibilityLiveRegion,
    autoFocus,
    contentContainerClassName,
    pointerEvents,
    ...rest
  } = props;

  const passthrough: Record<string, unknown> = { ...rest };

  // Every style-SHAPED prop, not just `style`. A `ScrollView`'s content box is a
  // second styleable node, and `components/ui/Rail.tsx` reaches it with
  // `contentContainerStyle={{ paddingHorizontal, gap }}` — where `paddingHorizontal`
  // is exactly as unroutable as it is on `style`, and arrives from `resolveNode`
  // rather than from `partition`, which is the same refusal one node over.
  for (const key of ['style', 'contentContainerStyle', 'imageStyle'] as const) {
    if (!(key in rest)) continue;
    const normalized = normalizeStyle(rest[key]);
    if (normalized === undefined) delete passthrough[key];
    else passthrough[key] = normalized;
  }

  // `box-none` and `box-only` split hit-testing between a widget and its subtree,
  // which `can-target` — one boolean for both — cannot express, so L2 refuses them
  // by name. Every use in this app is an overlay container whose intent is "let taps
  // reach what is under/inside me", and the container is a `Gtk.Box`, which has no
  // click handler of its own to steal one. `auto` is therefore the accurate answer
  // rather than the nearest one.
  if (pointerEvents !== undefined) {
    passthrough.pointerEvents = pointerEvents === 'none' ? 'none' : 'auto';
  }

  // `contentContainerClassName` is answered by L2 on a `ScrollView`, whose content box
  // is a real `Gtk.Box`, and refused on a `FlatList`, whose rows are built by a
  // `Gtk.ListView` that owns the space between them — there is no such box to style.
  //
  // Dropping it would lose visible layout: every use in this app is padding
  // (`px-m pt-m pb-2xl`), and a list whose last row sits under the window edge looks
  // broken rather than unstyled. So it is merged into the list's OWN class list, which
  // is the closest true thing: React Native's content container holds the header, the
  // rows and the footer, and so does the box this lands on. The one difference is worth
  // stating — padding there does not scroll with the content, it frames it — and for
  // the four sides this app asks for, that is the same picture.
  if (contentContainerClassName !== undefined) {
    if (displayName === 'FlatList') {
      const own = passthrough.className;
      passthrough.className =
        typeof own === 'string' && own.length > 0
          ? `${own} ${contentContainerClassName}`
          : contentContainerClassName;
    } else {
      passthrough.contentContainerClassName = contentContainerClassName;
    }
  }

  return { passthrough, accessibility: { accessibilityLabel, accessibilityState, autoFocus } };
}

/**
 * Utilities that describe how an element arranges its CHILDREN, as opposed to how it
 * sits in its own parent or how it is painted.
 *
 * The distinction matters for exactly one primitive and it is a structural difference
 * rather than a gap. On React Native a `Pressable` IS a `View`: it lays out its
 * children. On GTK it is a `Gtk.Button`, which takes ONE child and has no
 * `orientation` at all — so `<Pressable className="flex-row items-center">` reaches
 * the host as a property a button does not install:
 *
 *   <GtkButton> has no property "orientation"
 *
 * The refusal is right, and the shape a GTK author would write is
 * `Gtk.Button > Gtk.Box > children`. So these utilities move to an inner `<View>` and
 * everything else stays on the button, where it belongs: margins position the button
 * in its row, padding and background paint the button itself, `flex-1` expands the
 * button in ITS parent, and `active:opacity-70` is the button's own pressed state.
 */
const CHILD_ARRANGEMENT = /^(flex-(row|col)(-reverse)?|items-\S+|justify-\S+|gap(-[xy])?-\S+)$/;

function splitArrangement(className: string | undefined): { outer?: string; inner?: string } {
  if (className === undefined || className === '') return {};
  const outer: string[] = [];
  const inner: string[] = [];
  for (const token of className.split(/\s+/)) {
    if (token === '') continue;
    (CHILD_ARRANGEMENT.test(token) ? inner : outer).push(token);
  }
  return {
    outer: outer.length > 0 ? outer.join(' ') : undefined,
    inner: inner.length > 0 ? inner.join(' ') : undefined,
  };
}

/**
 * Flatten `<>…</>` out of a child list.
 *
 * THIS IS A WORKAROUND FOR A REAL gjsify DEFECT, and it is worth stating precisely
 * because the symptom points somewhere else entirely.
 *
 * A `View` becomes a `Gtk.Overlay` only if it can SEE that one of its children is
 * absolutely positioned. `childFacts` in @gjsify/react-native asks each child element
 * for its own props (`isAbsoluteChild` -> `declaresAbsolute(child.props)`), and a
 * `React.Fragment` answers for itself: it has no `className`, so it is not absolute,
 * and the fragment's CONTENTS are never examined.
 *
 * So a parent handed `<>{a}{absolute}</>` stays a `Gtk.Box`, and the failure surfaces
 * one level down, on the child, as
 *
 *   <View> absolute — positions this element on top of its parent, so the PARENT has
 *   to be a `Gtk.Overlay` — and it is not ... the parent here is either not a `View`
 *   (a `ScrollView`, a `Pressable`, a `Text`) or the element is a root
 *
 * — a message that lists three causes, none of which is the actual one. Measured on
 * `components/media/MediaCard.tsx`, which passes `overlay={<>…</>}` to
 * `components/ui/Thumbnail.tsx`; that is every video thumbnail on Home and in the
 * Mediathek, so it is the whole screen rather than an edge case.
 *
 * Flattening here restores the parent's view of its own children. It is a consumer-side
 * shim for a layer defect, so:
 *
 * fixed upstream in gjsify: childFacts should flatten Fragments before counting
 * absolute children — remove this function and its two call sites on the next bump.
 */
function flattenFragments(children: ReactNode): ReactNode {
  const list = Children.toArray(children);
  if (!list.some((child) => isValidElement(child) && child.type === Fragment)) return children;
  const out: ReactNode[] = [];
  for (const child of list) {
    if (isValidElement(child) && child.type === Fragment) {
      const inner = (child.props as { children?: ReactNode }).children;
      for (const nested of Children.toArray(flattenFragments(inner))) out.push(nested);
    } else {
      out.push(child);
    }
  }
  return out;
}

/**
 * React Native left-aligns `<Text>`; a `Gtk.Label` centres it.
 *
 * A SYSTEMATIC visual defect, and the kind that is easy to look straight past: nothing
 * errors, every screen renders, and the whole app is subtly wrong. `Gtk.Label:xalign`
 * defaults to 0.5, so every paragraph, byline and teaser in the app came out centred —
 * visible on Home (the hero teaser and its byline) and on Spotlight (every item's
 * text). React Native's default is `textAlign: 'left'`.
 *
 * `textAlign` IS a routed layout property, so the fix is to supply the default React
 * Native would have: left, unless the author said otherwise. Both spellings count as
 * saying otherwise — the `text-center` / `text-right` / `text-justify` utilities and an
 * explicit `textAlign` in a style object — so `app/artikel.tsx`'s centred error message
 * and `components/ui/Typo`'s callers keep working exactly as written.
 *
 * fixed upstream in gjsify: Gtk.Label should default to xalign 0 so the React Native
 * default holds — the primitive already sets `wrap: true` for the same reason (React
 * Native wraps by default and a Gtk.Label does not), so this is the same argument for a
 * second property. Remove this function and its call site on the next bump.
 */
const AUTHOR_SET_ALIGNMENT = /(^|\s)text-(center|right|left|justify)(\s|$)/;

function withDefaultTextAlign(
  className: unknown,
  style: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (style !== undefined && 'textAlign' in style) return style;
  if (typeof className === 'string' && AUTHOR_SET_ALIGNMENT.test(className)) return style;
  return { ...style, textAlign: 'left' };
}

/**
 * Whether any child is an ELEMENT rather than text.
 *
 * The gate on giving a `Pressable` an inner box: a string child belongs in
 * `Gtk.Button:label` through the primitive's own text sink, and a `Gtk.Box` has no
 * text sink to receive it.
 */
function hasElementChild(children: unknown): boolean {
  return Children.toArray(children as ReactNode).some(
    (child) => typeof child === 'object' && child !== null,
  );
}

/**
 * `[a, b]` -> `[a, spacer, b]`. The structural half of `justify-between`.
 *
 * `Children.toArray` rather than the raw value, because a single child is not an
 * array and a `{condition ? x : null}` branch contributes a null that must not get a
 * spacer of its own — `toArray` drops nulls and assigns stable keys.
 */
function interleaveSpacers(children: unknown): ReactNode {
  const list = Children.toArray(children as ReactNode).filter(Boolean);
  if (list.length < 2) return children as ReactNode;
  const out: ReactNode[] = [];
  list.forEach((child, index) => {
    if (index > 0) {
      out.push(
        createElement(BaseView as never, { key: `${SPACER_KEY}${index}`, className: 'flex-1' }),
      );
    }
    out.push(child);
  });
  return out;
}

/**
 * Set a caller's ref, whichever of the two shapes it has.
 *
 * Both appear in this app — `expo-image` passes a callback, `LoginGate` passes the
 * object from `useRef` — and a wrapper that handled only one would drop the other
 * silently, which reads as a widget that never mounted.
 */
function assignRef<T>(ref: Ref<T> | undefined, value: T): void {
  if (typeof ref === 'function') ref(value);
  else if (ref !== null && ref !== undefined) (ref as { current: T }).current = value;
}

/**
 * One wrapper shape for every primitive that can receive these props.
 *
 * The ref is merged rather than replaced: `WebView` and `expo-image` both take a ref
 * of their own through these components, and swallowing it would break them in a way
 * that looks like the widget never mounting.
 */
// `P extends object`, not a shape. The exported components declare CONCRETE props
// (`PressableProps` and friends), and those deliberately carry no `[key: string]:
// unknown` — an index signature there collapses `Omit<PressableProps, …>` to
// `unknown` in `components/ui/Button.tsx`. So the constraint cannot demand one, and
// `normalize` takes the internal shape by cast: it reads named props and spreads the
// rest, which is true of any props object.
function wrap<P extends object>(
  Base: unknown,
  displayName: string,
  /** True for a primitive that is NOT a box, so child-arrangement utilities need an inner one. */
  isButton = false,
  /** True for a primitive backed by a `Gtk.Label`, which needs React Native's alignment default. */
  isLabel = false,
) {
  // The return type is DECLARED, not inferred. `createElement(Base as never, …)`
  // resolves to an overload returning `never`, which makes every one of these
  // components "not a valid JSX element type" the moment anything else renders it —
  // `VideoView` in `app/video.tsx` was where that surfaced.
  const Wrapped = (props: P): ReactElement => {
    const { passthrough, accessibility } = normalize(props as NormalizedProps, displayName);

    if ('children' in passthrough) {
      passthrough.children = flattenFragments(passthrough.children as ReactNode);
    }

    if (isLabel) {
      const aligned = withDefaultTextAlign(
        passthrough.className,
        passthrough.style as Record<string, unknown> | undefined,
      );
      if (aligned !== undefined) passthrough.style = aligned;
    }

    const bridged = bridgeClassName(passthrough.className);
    if (bridged.className === undefined) delete passthrough.className;
    else passthrough.className = bridged.className;
    if (bridged.between) {
      passthrough.children = interleaveSpacers(passthrough.children);
    }

    if (isButton && hasElementChild(passthrough.children)) {
      // ALWAYS an inner box when there are element children, not only when the class
      // list carries an arrangement utility — and the second half of that rule was
      // learned from a second refusal, not designed in:
      //
      //   <View> absolute — positions this element on top of its parent, so the
      //   PARENT has to be a `Gtk.Overlay` — and it is not.
      //
      // A `View` becomes a `Gtk.Overlay` as soon as one of its children is absolutely
      // positioned, and a `Gtk.Button` never does. So a `Pressable` whose child is
      // `absolute` (`components/ui/Thumbnail.tsx`' centred overlay, inside a card that
      // is a `Pressable`) needs a real box between the two whether or not the button
      // itself was asked to arrange anything.
      //
      // Gated on ELEMENT children because `Pressable`'s text sink is the button's own
      // `label`: a bare string child is meant to become `Gtk.Button:label`, and a
      // `Gtk.Box` has no text sink at all, so wrapping one would turn a working label
      // into "text under this widget is an ERROR".
      const split = splitArrangement(passthrough.className as string | undefined);
      if (split.outer === undefined) delete passthrough.className;
      else passthrough.className = split.outer;
      passthrough.children = createElement(
        BaseView as never,
        (split.inner === undefined ? {} : { className: split.inner }) as never,
        passthrough.children as never,
      );
    }
    // Read off the internal shape rather than `P`: not every exported props type
    // declares `ref`, and the ones that do not still forward one at runtime.
    const userRef = (props as { ref?: Ref<unknown> }).ref;
    const widget = useRef<unknown>(null);

    // Destructured OUT of `accessibility` before the hook, so the dependency list holds
    // the two VALUES rather than the object that carries them. `normalize` builds that
    // object fresh on every render, so depending on it would rebuild the ref callback
    // every time — which makes React detach and re-attach the ref on every commit.
    const { accessibilityLabel, accessibilityState, autoFocus } = accessibility;

    const mergedRef = useCallback(
      (instance: unknown) => {
        widget.current = instance;
        applyAccessibility(instance, { accessibilityLabel, accessibilityState });
        applyAutoFocus(instance, autoFocus as boolean | undefined);
        assignRef(userRef, instance);
      },
      // Re-run when the label changes, so a bookmark button that switches from
      // "Artikel speichern" to "Gespeichert, entfernen" re-announces.
      [userRef, accessibilityLabel, accessibilityState, autoFocus],
    );

    return createElement(Base as never, { ...passthrough, ref: mergedRef } as never);
  };
  Wrapped.displayName = displayName;
  return Wrapped;
}

/**
 * `Platform`, with `OS` widened to the values the application ASKS about.
 *
 * The layer types `OS` as `'linux' | 'macos' | 'windows'`, which is the truth about
 * what this host can be. But `components/profile/SettingRow.tsx` writes
 * `Platform.OS === 'web'`, and against the narrow union that is a type error — TS
 * correctly points out the two can never overlap. The COMPARISON is not wrong, though:
 * the app is asking a question whose answer here is simply "no".
 *
 * So the type is widened to include the three values the app tests for and this host
 * never returns. The runtime value is untouched — it is the layer's own, and it reports
 * `linux`.
 */
export const Platform = BasePlatform as Omit<typeof BasePlatform, 'OS'> & {
  readonly OS: 'linux' | 'macos' | 'windows' | 'web' | 'ios' | 'android';
};

// The props type is given EXPLICITLY on each one rather than inferred.
//
// `wrap` is generic in its props, and a generic component gets its type argument from
// the JSX attributes at each call site — which means an attribute the site does not
// annotate has no contextual type at all. That is not academic: `onPress={(event) => …}`
// in `components/player/ProgressBar.tsx` was an implicit `any`, so `event.nativeEvent`
// typechecked clean and would have accepted any misspelling of it.
export const View = wrap<ViewProps>(BaseView, 'View');
export const Text = wrap<TextProps>(BaseText, 'Text', false, true);
export const Pressable = wrap<PressableProps>(BasePressable, 'Pressable', true);
export const ScrollView = wrap<ScrollViewProps>(BaseScrollView, 'ScrollView');
export const ActivityIndicator = wrap<ActivityIndicatorProps>(
  BaseActivityIndicator,
  'ActivityIndicator',
);
const TextInputPrimitive = wrap<TextInputProps>(BaseTextInput, 'TextInput');

/**
 * What a `TextInput` ref carries here, and the one answer in this file that is about
 * an INSTANCE rather than a prop.
 *
 * React Native declares `TextInput` as a class, so `TextInput` names a value AND a
 * type, and `useRef<TextInput>(null)` is how every app moves focus between two fields.
 * `@gjsify/react-native` declares it as a function, which has no instance type at all,
 * and hands the raw `Gtk` widget to whatever ref it is given. The phone's `LoginGate`
 * does both things at once: `useRef<TextInput>(null)` on the password field, then
 * `passwordRef.current?.focus()` from the email field's `onSubmitEditing`.
 *
 * Both halves therefore fail here, and they fail differently: the type is a build
 * error, which is loud, while `focus()` on a `Gtk.Text` is `undefined is not a
 * function` at the moment somebody presses Enter on the door — inside a `try`-less
 * event handler, on the one screen nobody can get past. So the interface below is
 * declared beside the value, and the ref is translated rather than forwarded.
 *
 * ONLY `focus`, deliberately. It is what the app calls and what GTK answers exactly
 * (`grab_focus()`); `blur()` has no widget-level counterpart (focus belongs to the
 * root, so the nearest thing is `root.set_focus(null)`, which is a different
 * statement), and `clear()`/`isFocused()`/`setNativeProps()` have no caller. Adding a
 * name here that this host cannot honour would turn a compile error into a silent
 * no-op, which is the trade this whole file exists to refuse.
 *
 * Upstream this belongs in `@gjsify/react-native`: the layer knows the widget and the
 * type, and every app that moves focus between two fields will need it. It is being
 * built there now — an instance type plus a handle carrying `focus`, `blur`, `clear`,
 * `isFocused` and `setSelection`. When it arrives, DELETE this rather than grow it: the
 * argument above is for keeping a local handle honest, not for keeping a local handle.
 */
export interface TextInput {
  /** `Gtk.Widget.grab_focus()`. Returns nothing, where GTK returns whether it took. */
  focus(): void;
}

export const TextInput = (props: TextInputProps): ReactElement => {
  // Read off the props rather than declared, for the reason `wrap` gives at its own
  // ref: the exported props types here do not carry `ref`, and they still forward one.
  const userRef = (props as { ref?: Ref<TextInput | null> }).ref;
  const attach = useCallback(
    (widget: unknown) => {
      assignRef(userRef, widget === null || widget === undefined ? null : focusHandle(widget));
    },
    [userRef],
  );
  return createElement(TextInputPrimitive as never, { ...props, ref: attach } as never);
};

/**
 * The handle a `TextInput` ref receives, over the widget the layer handed us.
 *
 * A fresh object per attach rather than a cached one: the ref fires again when the
 * widget is replaced, and a handle that closed over the old one would focus a widget
 * that is no longer in the tree — which looks exactly like focus not working.
 */
function focusHandle(widget: unknown): TextInput {
  const target = widget as { grab_focus?: () => boolean };
  return {
    focus() {
      // Guarded because the caller is an event handler with nothing above it: on the
      // door, this runs from `onSubmitEditing`, and a throw there takes the tree down
      // rather than leaving the person in the field they were already in.
      try {
        target.grab_focus?.();
      } catch (error) {
        console.warn('[desktop] TextInput.focus(): grab_focus failed:', error);
      }
    },
  };
}

export const Switch = wrap<SwitchProps>(BaseSwitch, 'Switch');
export const FlatList = wrap<FlatListProps>(BaseFlatList, 'FlatList');
