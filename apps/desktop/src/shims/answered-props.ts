// The props this host answers for the layer, as DATA rather than as a comment.
//
// `shims/react-native.tsx`'s header carries this as a prose table, and that table has
// now been wrong twice in the same way: it describes a refusal that upstream has since
// answered, the shim goes on handling the prop harmlessly, and the app is told it lost
// a capability it has. `flex-wrap` was the first (stripped here until
// `@gjsify/react-native` 0.46 mapped it to a wrapping widget, with a note to remove the
// branch that had been acted on while the README kept the consequence). This file is so
// that the second time is a failing test rather than a re-read.
//
// `@gjsify/react-native/prop-table` is what makes it checkable: `explainProp(primitive,
// prop)` returns `null` when the layer renders a prop and the sentence a render would
// print when it does not. So every entry here is a claim that can be verified against
// the installed layer, and `test/prop-gate.test.ts` verifies it in both directions.
//
// WHAT THIS FILE IS NOT. It is not the set of props the app passes — that is a question
// about JSX in 26 screens, and about components like `<Typo>` that forward `...rest`
// onto a primitive, which is what let `<Typo onPress>` through and took Home down. That
// check needs a parser and one level of forwarding analysis; `test/support-gate.test.ts`
// names it as the remaining half. This file answers the narrower question that needs no
// parser at all: **is each workaround still necessary?**

/** What this host does with a prop the layer refuses. */
export type Disposition =
  /** Reimplemented here, so the app keeps the behaviour. */
  | 'implemented'
  /** Deliberately not carried, with a reason. The prop is removed before the layer sees it. */
  | 'dropped'
  /** Translated to something the layer does accept. */
  | 'mapped';

export interface AnsweredProp {
  /** The prop as React Native spells it. */
  readonly prop: string;
  /** The primitive to ask the layer about — the one the app passes it to. */
  readonly primitive: string;
  readonly disposition: Disposition;
  /** One line, for a failure message that says what would be lost by removing this. */
  readonly why: string;
}

/**
 * Every prop `shims/react-native.tsx` answers, with the primitive to check it against.
 *
 * The primitive matters: the layer answers per element, so `accessibilityLiveRegion` is
 * refused on a `View` and accepted on a `Text`, and `contentContainerClassName` is
 * accepted on a `ScrollView` and refused on a `FlatList`. A single global list would
 * have to pick one and would be wrong about the other.
 */
export const ANSWERED_PROPS: readonly AnsweredProp[] = [
  {
    prop: 'accessibilityLabel',
    primitive: 'View',
    disposition: 'implemented',
    why: 'set through a ref with Gtk.Accessible.update_property(); 46 call sites lose their spoken name',
  },
  {
    prop: 'accessibilityState',
    primitive: 'View',
    disposition: 'implemented',
    why: 'selected/checked/disabled as GtkAccessibleTristate, through the same ref',
  },
  {
    prop: 'accessibilityRole',
    primitive: 'View',
    disposition: 'dropped',
    why: 'unimplemented, not impossible — the property is writable after construction (measured); upstream is building the whole role family',
  },
  {
    prop: 'accessible',
    primitive: 'View',
    disposition: 'dropped',
    why: 'GTK has no per-widget accessibility opt-out; every widget is in the tree',
  },
  {
    prop: 'hitSlop',
    primitive: 'Pressable',
    disposition: 'dropped',
    why: 'an 8px concession to a fingertip; a desktop pointer has single-pixel precision',
  },
  {
    prop: 'trackColor',
    primitive: 'Switch',
    disposition: 'dropped',
    why: 'Adwaita paints a switch from the theme accent; the track is a CSS subnode',
  },
  {
    prop: 'thumbColor',
    primitive: 'Switch',
    disposition: 'dropped',
    why: 'see trackColor',
  },
  {
    prop: 'placeholderTextColor',
    primitive: 'TextInput',
    disposition: 'dropped',
    why: 'the placeholder is a CSS subnode rather than a widget property; Adwaita already dims it',
  },
  {
    prop: 'autoFocus',
    primitive: 'TextInput',
    disposition: 'implemented',
    why: 'grab_focus() from the ref on `map`, because it only works once the widget is mapped',
  },
  {
    prop: 'contentContainerClassName',
    primitive: 'FlatList',
    disposition: 'mapped',
    why: 'a FlatList has no content box, so the classes are merged into the list own className',
  },
];

/**
 * Props this file used to answer and the layer has since answered ITSELF.
 *
 * A DECLARED EXCEPTION LEDGER, not a to-do list that reads as one. Each of these is
 * measured `ACCEPTED` by the installed layer, which means the shim's handling of it is
 * now redundant — harmless, because handling a prop the layer would also handle changes
 * nothing observable, and worth removing on the next touch of the relevant branch
 * because a redundant workaround is indistinguishable from a necessary one.
 *
 * The reason it is a LIST and not six deletions is that removing each one is a
 * behaviour change to verify on three platforms, and this session measured rather than
 * rewrote. The test holds the list exact in both directions: a seventh prop the layer
 * catches up on fails here, and so does an entry the layer goes back to refusing.
 *
 * `accessibilityLiveRegion` on `Text` is the one that is a capability GAIN rather than
 * bookkeeping: this host's header says a screen-reader user is told nothing on the
 * door, and the layer now answers it through `Gtk.Accessible.announce()` on the one
 * element whose content IS its message. That is worth wiring, not just deleting.
 */
export const UPSTREAM_CAUGHT_UP: readonly (readonly [primitive: string, prop: string])[] = [
  ['Text', 'accessibilityLiveRegion'],
  ['TextInput', 'autoComplete'],
  ['TextInput', 'textContentType'],
  ['TextInput', 'submitBehavior'],
  ['ScrollView', 'contentContainerClassName'],
  ['View', 'pointerEvents'],
];
