/**
 * Element sizes in dp, taken from the design draft: the `.dc.html` mockup in the
 * `design-entwurf` sibling checkout.
 *
 * Why not Tailwind utilities: the spacing scale is the design system's own
 * (`--spacing: 0.125rem` in @correctiv/design-tokens/theme.css — 2 px at Uniwind's
 * rem base of 16), so a numeric utility
 * never means what it says — `w-32` is 64px, not Tailwind's 128. Under NativeWind
 * the scale also stopped at 48, so `w-64` did not exist at all: the class was
 * dropped without a word and the element sized to its content. Every numeric size
 * utility in this app was therefore either half its intended size or gone.
 *
 * Spacing keeps the named tokens (`p-s`, `gap-m`, `mt-2xs`); anything that needs
 * a pixel size belongs here, where the number is visible and the draft's value is
 * cited. `__tests__/no-numeric-utilities.test.ts` keeps the trap out.
 */
export const sizes = {
  /** Card in a horizontal rail — draft: `w-[240px]` (the fact-check rail on Home). */
  railCard: 240,
  /**
   * Card in a media rail. Narrower than `railCard` so two fit on a 402pt screen
   * and the third only peeks: at 240 the second card was cut mid-word and the row
   * read as clipped rather than scrollable. No draft value exists, because the draft
   * lists videos vertically. This number comes from the first implementation that
   * had a media rail.
   */
  railCardMedia: 176,
  /** Square podcast cover in the series rail — draft: `w-[116px]`. */
  railTile: 116,
  /** Round play button on the live/radio card — draft: `h-[48px]`. */
  playButton: 48,
  /** Round play mark over a video thumbnail — draft: `h-[52px]`. */
  playOverlay: 52,
  /** The player's transport button — draft: `h-[68px]`. */
  playButtonLarge: 68,
  /** Tappable icon button: back, bookmark, mini-player transport. */
  iconButton: 40,
  /** Icon button inside a list row, where 40 crowds the text. */
  iconButtonSmall: 36,
  /** Progress and scrub bars — draft: `h-[4px]`. */
  progressBar: 4,
} as const;
