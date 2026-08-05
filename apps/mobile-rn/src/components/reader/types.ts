/**
 * Shared contract for the two ReaderView implementations. It exists as its own
 * module so the native and web files cannot drift apart: both import this type,
 * so a change to one signature breaks the other at compile time.
 */
export interface ReaderViewProps {
  /** Complete, self-contained article document (token CSS + embedded fonts). */
  html: string;
  /**
   * Called before the embedded document navigates. Return `false` to block it —
   * the caller then handles the URL itself (in-app route or system browser).
   *
   * Both platforms funnel through this one function so link behaviour cannot
   * diverge between the app and the web demo.
   */
  onNavigate: (url: string) => boolean;
}

/** Base URL that relative links inside the article HTML resolve against. */
export const READER_BASE_URL = 'https://correctiv.org/';
