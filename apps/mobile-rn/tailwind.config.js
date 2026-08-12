const plugin = require('tailwindcss/plugin');

const tokens = require('./tailwind.tokens.generated.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Every component and route is scanned.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Not 'media': dark mode follows the app's own setting (system / light / dark),
  // not the device directly. NativeWind sets the class, driven from app/_layout.tsx
  // through setColorScheme().
  darkMode: 'class',
  theme: {
    // The token scales replace Tailwind's defaults (colours, spacing, type,
    // radius); every other Tailwind default (flexbox, position …) is kept.
    colors: tokens.colors,
    spacing: tokens.spacing,
    borderRadius: tokens.borderRadius,
    fontSize: tokens.fontSize,
    fontWeight: tokens.fontWeight,
    letterSpacing: tokens.letterSpacing,
    lineHeight: tokens.lineHeight,
    fontFamily: tokens.fontFamily,
    extend: {
      maxWidth: tokens.maxWidth,
    },
  },
  plugins: [
    // The colour variables themselves. `theme.colors` only refers to them
    // (`rgb(var(--color-x) / <alpha-value>)`); here they get their values, once for
    // light and once for dark. As a plugin rather than in global.css, so that the
    // values come from the same generated file as the references and the two
    // cannot drift apart.
    plugin(({ addBase }) => addBase(tokens.colorVars)),
  ],
};
