import {
  buildReaderHtml,
  READER_LAYOUT_CSS,
  type ReaderHtmlOptions,
} from '@correctiv/app-core/articles/reader-html';
import type { Article } from '@correctiv/app-core/articles/types';
import { READER_DARK_CSS, THEME_CSS } from '@correctiv/design-tokens/reader.generated';

import { READER_FONTS_CSS } from '@/lib/theme/readerFonts.generated';

/**
 * The reader document, styled the Expo way.
 *
 * The document itself — structure, class names, German copy, the verdict plaque —
 * comes from the core, so it is the same one the NativeScript app renders. What
 * this file adds is the single thing that differs: the CSS arrives **inline**,
 * with the fonts base64-embedded, because this app has no app folder a WebView
 * could resolve a `file://` stylesheet against — and because the same string has
 * to work inside an `<iframe srcDoc>` on the web target.
 *
 * Order matters: token variables and `@font-face` first, layout last, so the
 * layout can reference the variables.
 *
 * Dark mode costs one appended variable block, because the core's layout CSS takes
 * every colour from `--var-color-*`. The alternative — a second stylesheet for the
 * dark reader — would be a second place to forget. The WebView is not asked what
 * the device thinks: the app's appearance setting decides, exactly as it does for
 * the screens around it, so a light app never opens a dark article.
 */
export function readerHtml(
  article: Article,
  options: Pick<ReaderHtmlOptions, 'isMember' | 'textScale'> & { isDark?: boolean } = {},
): string {
  const { isDark, ...rest } = options;
  return buildReaderHtml(article, {
    ...rest,
    css: [READER_FONTS_CSS, THEME_CSS, ...(isDark ? [READER_DARK_CSS] : []), READER_LAYOUT_CSS],
  });
}
