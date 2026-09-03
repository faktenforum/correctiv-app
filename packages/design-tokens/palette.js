/**
 * The dark scheme — the one part of the colour system that is an app decision
 * rather than a design token.
 *
 * `tokens/theme.css` has no dark values to read. Upstream carried a placeholder
 * block until 2026-08-13, marked `@TODO Set this to the actual values` and holding
 * the LIGHT values verbatim; wp-design-tokens 8ed7a28 deleted it down to a single
 * `@TODO define dark mode theme`. Nothing was lost in that deletion, because the
 * generator never read the block — it was a lie that compiled. When upstream fills
 * it in for real, this file becomes a delete, not a rewrite.
 *
 * ## Which tokens live here, and why it is no longer all of them
 *
 * theme.css now has three tiers, and they answer the question this file used to
 * have to argue from scratch:
 *
 *   primitives   `white`, `neutral-100…700`, `red-500`, `yellow-400`. The raw
 *                palette. **Scheme-independent**: white is #ffffff in the dark
 *                scheme too, because "white" names a value, not a role. They are
 *                absent below, and that absence is the statement.
 *   semantic     `canvas`, `on-canvas`, `stroke`, `accent`, … Each names a ROLE,
 *                so each has a dark value and every one of them is below.
 *   deprecated   `grey-100…700`, `emphasis`, `alternative`. Aliases upstream keeps
 *                until its consumers migrate. Their dark values are here unchanged.
 *
 * The generator enforces the split rather than trusting this comment, in two ways.
 * Every colour in theme.css must appear in EITHER `dark` or `schemeIndependent`
 * below, and a colour in neither throws — so a token upstream adds cannot arrive
 * without someone deciding which of the two it is. And a name in `schemeIndependent`
 * must be a LITERAL in theme.css, because that is how upstream spells a primitive;
 * a `var()` reference is how it spells a role, and a role in that list would be a
 * semantic token pinned to its light value.
 *
 * The second check exists because the first was not enough on its own, and the way it
 * failed is worth keeping: classify a new semantic token as scheme-independent and
 * everything went green — generator, tests, build — with the colour stuck light in
 * dark mode. Which is exactly the failure this file guards against, so the guard had
 * better cover it.
 *
 * ## Why the old essay is gone
 *
 * This file used to open by explaining that the grey scale is not semantic: that
 * `grey-100` was a page surface AND white text on a red button, so inverting the
 * scale would turn the text on the brand red invisible. That was true, and it was
 * the reason for the two `roles` below. It is upstream's problem now, and upstream
 * solved it — the page surface is `canvas` and the white on the red button is the
 * primitive `white`, and those are different tokens that can move independently.
 * What survives is the habit the essay taught: **ask which role a colour plays
 * before giving it a value.** The names below now answer that question themselves.
 *
 * ## Where the dark values come from
 *
 * They are the values the app already shipped, re-expressed one tier up. Each
 * semantic token took the dark value of the deprecated alias that shares its LIGHT
 * value — `canvas` and `grey-100` are both #ffffff in light, so `canvas` took
 * `grey-100`'s #1a1a1a. Eleven of the twelve are that. Only `on-background` is new,
 * because it is backed by `neutral-600` #4a4a4a, which upstream invented in the
 * same commit and no old grey pointed at.
 *
 * So this file changing shape did NOT change the dark theme. That was the point of
 * doing it this way, and `apps/mobile/__tests__/tokens.test.ts` pins it.
 *
 * Read only by scripts/generate.mjs next door, which bakes both schemes into the
 * generated artefacts: the Tailwind theme gets a `@variant dark` block, the typed
 * constants get `colorsDark`, the reader CSS gets a dark `--var-color-*` block.
 * Never imported at runtime, by this package's consumers or by anything else.
 */

/**
 * The dark ramp, as one scale, so the values below are picked from a ladder rather
 * than invented one at a time. Not exported: this is the reasoning, and the tokens
 * are what the generator reads.
 *
 *   #1a1a1a  page, and the content painted on it   ← canvas
 *   #242424  a surface lifted off the page          ← background, surface
 *   #2e2e2e  a muted surface                        ← grey-250, which has no successor
 *   #3a3a3a  hairlines                              ← grey-300
 *   #4a4a4a  lines that carry structure             ← stroke
 *   #7c7c7c  lines and text at the edge of legible  ← stroke-strong
 *   #a8a8a8  muted text                             ← on-canvas-muted
 *   #cfcfcf  body text one step off full strength   ← on-background
 *   #f2f2f2  text at full strength                  ← on-canvas, on-surface
 *
 * Note that the ladder is NOT the light ramp inverted. Light `canvas` is #ffffff
 * and light `background` is a step DARKER (#f8f8f8); dark `canvas` is #1a1a1a and
 * dark `background` is a step LIGHTER (#242424). The relationship that holds in
 * both is "background sits one step off canvas", which is the thing the design
 * means. Inverting the numbers would have broken it.
 */

/**
 * The primitives, which deliberately do not follow the scheme.
 *
 * A list rather than something inferred, because the obvious rule only holds one way
 * round. "A `var()` reference in theme.css is a role" is true, and the generator
 * checks this list against it. The converse — "a literal is a primitive" — is false
 * for exactly one token: `grey-250` is a literal, because upstream dropped it from
 * the ramp and left the hex in place, but it is a surface and it has a dark value.
 * Inferring membership would have made it the one colour allowed to go missing
 * without a word.
 *
 * So membership is stated, and the generator refuses a name theme.css contradicts.
 * Adding one here is a claim: *this colour means the same thing on a dark screen as
 * on a light one.* True of `white`, which is a value. False of `canvas`, which is a
 * role.
 */
export const schemeIndependent = [
  'black',
  'white',
  'neutral-100',
  'neutral-200',
  'neutral-300',
  'neutral-400',
  'neutral-500',
  'neutral-600',
  'neutral-700',
  'red-500',
  'yellow-400',
];

/**
 * Scheme-independent, and named for exactly that so they cannot be misapplied.
 *
 * **These two are now redundant and are kept only for one release.** `always-light`
 * is exactly the primitive `white` and `always-dark` is exactly `neutral-700`, in
 * both schemes, because primitives no longer follow the scheme. They survive this
 * change because `tools/figma-plugin` binds them by name and its `bind()` fails
 * silently on a token that has gone: the board would keep drawing with the last
 * synced hex and quietly stop following the tokens. Removing them is that PR's job,
 * not this one's. See ADR 0022.
 *
 * Until then they still mean what they say: the scheme does not touch them, because
 * the surface underneath them does not change either — the white button on the red
 * onboarding screen is `bg-always-light` with an `always-dark` label.
 */
export const roles = {
  /** White in both schemes: on the brand red, on a photo, on `always-dark`. */
  'always-light': '#ffffff',
  /** Dark in both schemes: on club yellow, and the video stage / radio banner fill. */
  'always-dark': '#333333',
};

/**
 * Dark values, keyed by token name as theme.css spells it.
 *
 * Every key must name a colour that exists in theme.css, and every colour that is a
 * `var()` reference there ends up here, because the generator refuses to let one sit
 * in `schemeIndependent` instead. Both failures are silent on their own — the colour
 * simply stays on its light value in dark mode, in a build that is otherwise green —
 * so both throw.
 */
export const dark = {
  // -- Semantic. The dark theme, in the vocabulary the design system now uses. ---

  /** A lighter coral: the brand red is too dense to read on a dark surface. */
  accent: '#ff6173',
  /** Unchanged. Club yellow carries meaning, and it reads on dark as it is. */
  'accent-alternative': '#fde162',

  /** The page frame, one step lifted off the canvas — as in light, where it is one step down. */
  background: '#242424',
  /** The page, and the content painted on it. */
  canvas: '#1a1a1a',
  /** What separates a card or an info box from the canvas. */
  surface: '#242424',

  /** Body text on the page frame. The one value here with no shipped precedent. */
  'on-background': '#cfcfcf',
  /** Text at full strength. */
  'on-canvas': '#f2f2f2',
  'on-surface': '#f2f2f2',
  /** Secondary text: bylines, timestamps, captions. */
  'on-canvas-muted': '#a8a8a8',
  /** Follows `accent`, and must: it is the same colour by definition. */
  'on-canvas-accent': '#ff6173',

  /** Lines that carry structure: borders, dividers, line icons. */
  stroke: '#4a4a4a',
  /** The same, where it has to be seen. */
  'stroke-strong': '#7c7c7c',

  // -- Deprecated v1. Unchanged values; these go when upstream drops them. -------

  emphasis: '#ff6173',
  alternative: '#fde162',

  'grey-100': '#1a1a1a', // page surface
  'grey-200': '#242424', // tinted card
  'grey-250': '#2e2e2e', // muted surface — a literal upstream, with no successor
  'grey-300': '#3a3a3a', // hairlines and borders
  'grey-400': '#4a4a4a', // stronger borders
  'grey-500': '#7c7c7c', // faint text
  'grey-600': '#a8a8a8', // muted text
  'grey-700': '#f2f2f2', // strong text
};
