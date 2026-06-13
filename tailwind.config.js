const tokens = require('./tailwind.tokens.generated.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Alle Komponenten + Routen werden gescannt.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Token-Skalen ersetzen die Tailwind-Defaults (Farben, Spacing, Typo, Radius);
    // alle übrigen Tailwind-Defaults (Flexbox, Position …) bleiben erhalten.
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
  plugins: [],
};
