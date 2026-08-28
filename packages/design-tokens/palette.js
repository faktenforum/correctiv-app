/**
 * The dark palette and the three role colours — the one part of the colour system
 * that is an app decision rather than a design token.
 *
 * `tokens/theme.css` carries a dark block, but it is a placeholder: it is marked
 * `@TODO Set this to the actual values` and its values are the light ones. Reading
 * it would produce a "dark mode" identical to light. So the values below were
 * assigned by hand for the first shipped dark mode and carried over here with their
 * reasoning intact. When wp-design-tokens gains real dark values, this file becomes
 * a delete, not a rewrite.
 *
 * ## Why roles, not an inverted scale
 *
 * The grey scale is NOT semantic. `grey-100` (#fff) is a page surface AND white
 * text on a red button; `grey-700` (#333) is body text AND a dark video stage.
 * Inverting the scale therefore breaks half of its uses: it would turn the video
 * stage white and the text on the brand red invisible.
 *
 * So each grey is assigned the dark value of the role it plays in the *majority*
 * of its uses — surfaces for the low numbers, text for the high ones — and the
 * minority uses move to one of the three fixed roles below, which mean the same
 * thing in both schemes. That is the whole trick, and it is why adding a colour
 * here is rarely the right fix: ask which role it plays first.
 *
 * Read only by scripts/generate.mjs next door, which bakes both schemes into the
 * generated artefacts: the app's Tailwind theme map receives them as CSS variables,
 * the typed constants as hex, the reader CSS as a dark `--var-color-*` block. Never
 * imported at runtime, by this package's consumers or by anything else.
 */

/**
 * Scheme-independent, and named for exactly that so they cannot be misapplied.
 *
 * They are deliberately not called `on-emphasis`/`on-surface`: these two are used
 * as foreground AND as fill — the white button on the red onboarding screen is
 * `bg-always-light` with an `always-dark` label — and a name that claims a single
 * role invites the wrong one. "Always" is the whole contract: the scheme does not
 * touch it, because the surface underneath it does not change either.
 *
 * Both values are the ones the light scheme already used (grey-100 and grey-700),
 * so nothing about light mode moved when these were introduced.
 */
export const roles = {
  /** White in both schemes: on the brand red, on a photo, on `always-dark`. */
  'always-light': '#ffffff',
  /** Dark in both schemes: on club yellow, and the video stage / radio banner fill. */
  'always-dark': '#333333',
};

/**
 * Dark values for the token colours. Keys must exist in `tokens/theme.css`; the
 * generator fails loudly if one drifts away, because a silently ignored key would
 * leave that colour stuck on its light value with nothing to see.
 */
export const dark = {
  /** A lighter coral — the brand red is too dense to read on a dark surface. */
  emphasis: '#ff6173',
  /** Unchanged: club yellow carries meaning, and it reads on dark as it is. */
  alternative: '#fde162',

  'grey-100': '#1a1a1a', // page surface
  'grey-200': '#242424', // tinted card
  'grey-250': '#2e2e2e', // muted surface
  'grey-300': '#3a3a3a', // hairlines and borders
  'grey-400': '#4a4a4a', // stronger borders
  'grey-500': '#7c7c7c', // faint text
  'grey-600': '#a8a8a8', // muted text
  'grey-700': '#f2f2f2', // strong text
};
