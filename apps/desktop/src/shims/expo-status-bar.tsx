// `expo-status-bar`, which renders nothing on a desktop window.
//
// This is the same answer `@gjsify/react-native` gives for React Native's own
// `StatusBar`, and for the same reason: a desktop window has no status bar to
// configure, and `<StatusBar/>` sits in the first ten lines of most React Native
// screens — so rendering NOTHING and saying so beats failing to import.
//
// The app's one call site is `<StatusBar style={isDark ? 'light' : 'dark'} />` in
// `app/_layout.tsx`. What that prop asks for — legible clock and battery icons over
// the app's background — is a question a GTK window does not have. The window
// decoration is the compositor's, and it already follows the Adwaita colour scheme
// that `Uniwind.setTheme` sets.

export type StatusBarStyle = 'auto' | 'inverted' | 'light' | 'dark';

export interface StatusBarProps {
  style?: StatusBarStyle;
  backgroundColor?: string;
  hidden?: boolean;
  translucent?: boolean;
}

export function StatusBar(_props: StatusBarProps): null {
  return null;
}

export function setStatusBarStyle(_style: StatusBarStyle): void {
  // Intentionally nothing. See the module header: there is no such surface here.
}
