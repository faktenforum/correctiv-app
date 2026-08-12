/**
 * The browser's share sheet, with the fallback a browser needs.
 *
 * react-native-web ships no `Share`, so importing the native module here would
 * throw at the first tap. The Web Share API is the direct equivalent and is what
 * phones and Safari offer; a desktop browser without it gets the link on the
 * clipboard instead, which is what the button is for anyway.
 *
 * Both paths reject when the user dismisses the sheet — that is a cancellation, not
 * a failure, so nothing is reported.
 */
export function shareArticle(url: string, title?: string): void {
  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({ title, url }).catch(() => {});
    return;
  }
  navigator?.clipboard?.writeText(url).catch(() => {});
}
