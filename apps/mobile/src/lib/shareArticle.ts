import { Share } from 'react-native';

/**
 * Hands an article to the system share sheet.
 *
 * `message` carries the URL as well as `url` does, because Android's intent takes
 * only the message and drops `url` entirely — a share sheet that pastes a headline
 * without a link is worse than no share button. iOS reads `url` and shows a proper
 * link preview, so both fields are set and each platform takes the one it uses.
 *
 * A dismissed sheet resolves normally; only a genuine failure is logged. Throwing
 * here would take down the reader over a cancelled gesture.
 */
export function shareArticle(url: string, title?: string): void {
  Share.share({
    message: title ? `${title}\n${url}` : url,
    url,
    title,
  }).catch((err: unknown) => {
    console.warn('[app] sharing failed:', err);
  });
}
