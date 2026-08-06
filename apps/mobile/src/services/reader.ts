import { buildReaderHtml, type ReaderHtmlOptions } from '@correctiv/app-core/articles/reader-html';
import type { Article } from '@correctiv/app-core/articles/types';

/**
 * The reader document, styled the NativeScript way.
 *
 * The document itself — structure, class names, German copy, the verdict plaque —
 * comes from the core, so it is the same one the Expo app renders. What this file
 * adds is the single thing that differs: where the CSS comes from. Here it is a
 * bundled stylesheet with `@font-face` rules pointing at the app folder's `.ttf`
 * files; the Expo app passes the equivalent CSS inline with base64 fonts, because
 * it has no app folder.
 *
 * The href resolves against the WebView's base URL, which `AWebView.src = html`
 * sets to `file:///<app>/`.
 */
const STYLESHEET = 'assets/reader/reader.css';

export function readerHtml(
  article: Article,
  options: Pick<ReaderHtmlOptions, 'isMember' | 'textScale'>,
): string {
  return buildReaderHtml(article, { ...options, stylesheets: [STYLESHEET] });
}
